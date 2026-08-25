/* ═══════════════════════════════════════════════════════════════════
   SEMÁFORO NUTRICIONAL — lectura de etiquetas
   ───────────────────────────────────────────────────────────────────
   La letra chica de los envases es chica a propósito. Pedirle a la
   persona que la descifre es trasladarle el problema que la app existe
   para resolver.

   REGLAS DE DISEÑO:

   · La IA TRANSCRIBE, no calcula. Devuelve lo impreso, incluida la base
     (por 100 g, por 100 ml o por porción) y el tamaño de esa porción.
     La conversión la hace este código, que no se equivoca dividiendo y
     deja la cuenta a la vista.
   · Cada campo viene con su nivel de confianza. Si algo está borroso o
     tapado, llega vacío y marcado: nunca completado a ojo.
   · La persona confirma antes de guardar. Esto llena el formulario, no
     lo reemplaza.
   ═══════════════════════════════════════════════════════════════════ */

const MODELO = process.env.MODELO_LECTURA || "claude-sonnet-5";
const MAX_BYTES = 1200000;
const MIN_BYTES = 25000;

const INSTRUCCIONES = `Sos un transcriptor de tablas nutricionales de envases argentinos.

Devolvé UN objeto JSON y nada más: sin explicaciones, sin markdown.

{
  "base": "100g" | "100ml" | "porcion" | null,
  "porcion_cantidad": number|null,
  "porcion_unidad": "g"|"ml"|null,
  "campos": {
    "kcal":              { "valor": number|null, "confianza": "alta"|"media"|"baja" },
    "azucares_totales":  { "valor": number|null, "confianza": "alta"|"media"|"baja" },
    "azucares_anadidos": { "valor": number|null, "confianza": "alta"|"media"|"baja" },
    "grasas":            { "valor": number|null, "confianza": "alta"|"media"|"baja" },
    "saturadas":         { "valor": number|null, "confianza": "alta"|"media"|"baja" },
    "sodio_mg":          { "valor": number|null, "confianza": "alta"|"media"|"baja" }
  },
  "nota": string|null
}

Reglas estrictas:
- Transcribí EXACTAMENTE lo impreso. No calcules, no conviertas, no estimes.
- Si la tabla tiene una columna por porción y otra por 100 g o 100 ml, usá
  SIEMPRE la de 100 y poné base "100g" o "100ml".
- Si sólo hay columna por porción, poné base "porcion" y completá
  porcion_cantidad y porcion_unidad tal como figuran.
- Un valor que no puedas leer con seguridad va en null con confianza "baja".
  Es preferible un hueco a un número dudoso.
- El sodio va en miligramos. Si está en gramos, poné el número tal cual e
  indicalo en "nota"; no lo conviertas.
- "azucares_anadidos" sólo si la etiqueta lo dice explícitamente. Si sólo
  informa azúcares totales, dejá añadidos en null.
- Si la imagen no es una tabla nutricional, devolvé todos los campos en
  null y explicá en "nota".`;

function respuesta(codigo, cuerpo){
  return new Response(JSON.stringify(cuerpo), {
    status: codigo,
    headers: { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" }
  });
}

/* La conversión a "cada 100" la hacemos acá, con la cuenta a la vista,
   porque los modelos leen bien y calculan mal. */
function aCien(lectura){
  const base = lectura.base;
  const campos = lectura.campos || {};
  if (base === "100g" || base === "100ml"){
    return { campos, base: base === "100ml" ? "100ml" : "100g", conversion: null };
  }
  if (base === "porcion"){
    const cant = Number(lectura.porcion_cantidad);
    const uni  = lectura.porcion_unidad === "ml" ? "100ml" : "100g";
    if (!isFinite(cant) || cant <= 0){
      return { campos: null, base: null, conversion: null,
               error: "La etiqueta informa por porción pero no pudimos leer de cuánto es esa porción." };
    }
    const factor = 100 / cant;
    const salida = {};
    for (const [k, v] of Object.entries(campos)){
      salida[k] = (v && typeof v.valor === "number")
        ? { valor: Math.round(v.valor * factor * 100) / 100, confianza: v.confianza }
        : { valor: null, confianza: (v && v.confianza) || "baja" };
    }
    return { campos: salida, base: uni,
             conversion: "La etiqueta informa cada " + cant + " " + (lectura.porcion_unidad || "g") +
                         ". Multiplicamos por " + (Math.round(factor*100)/100) + " para llevarlo a 100." };
  }
  return { campos: null, base: null, conversion: null,
           error: "No pudimos determinar si los valores son por 100 g, por 100 ml o por porción." };
}

export default async (req) => {
  if (req.method !== "POST") return respuesta(405, { error: "metodo_no_permitido" });

  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave){
    return respuesta(503, { error: "sin_clave",
      mensaje: "Todavía no configuramos la lectura de etiquetas. Cargá los datos a mano." });
  }

  let cuerpo;
  try { cuerpo = await req.json(); }
  catch(e){ return respuesta(400, { error: "json_invalido" }); }

  const b64 = String(cuerpo.imagen || "").replace(/^data:image\/[a-z]+;base64,/, "");
  if (!b64) return respuesta(400, { error: "sin_imagen" });

  const bytes = Buffer.from(b64, "base64");
  if (bytes.length > MAX_BYTES) return respuesta(413, { error: "imagen_grande" });
  if (bytes.length < MIN_BYTES){
    return respuesta(400, { error: "imagen_vacia",
      mensaje: "Esa imagen no parece una foto de una etiqueta." });
  }

  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), 45000);
  try{
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": clave,
        "anthropic-version": "2023-06-01"
      },
      signal: corte.signal,
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
            { type: "text", text: INSTRUCCIONES }
          ]
        }]
      })
    });

    if (!r.ok){
      const detalle = (await r.text()).slice(0, 200);
      return respuesta(502, { error: "lectura_fallo", http: r.status, detalle });
    }

    const d = await r.json();
    const texto = (d.content || []).filter(x => x.type === "text").map(x => x.text).join("").trim();
    let lectura;
    try { lectura = JSON.parse(texto.replace(/^```json|^```|```$/gm, "").trim()); }
    catch(e){ return respuesta(502, { error: "respuesta_ilegible", detalle: texto.slice(0, 200) }); }

    const convertido = aCien(lectura);
    if (convertido.error){
      return respuesta(200, { ok:false, mensaje: convertido.error, nota: lectura.nota || null });
    }

    return respuesta(200, {
      ok: true,
      base: convertido.base,
      campos: convertido.campos,
      conversion: convertido.conversion,
      nota: lectura.nota || null,
      aviso: "Números leídos por una IA a partir de la foto. Revisalos contra el envase antes de guardar."
    });

  }catch(e){
    const abortado = e.name === "AbortError";
    return respuesta(504, { error: abortado ? "demoro_demasiado" : "sin_respuesta" });
  }finally{
    clearTimeout(reloj);
  }
};

export const config = { path: "/api/leer-etiqueta" };

