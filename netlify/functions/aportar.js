/* ═══════════════════════════════════════════════════════════════════════
   SEMÁFORO NUTRICIONAL — aporte de fotos a Open Food Facts
   ───────────────────────────────────────────────────────────────────────
   La base pública que queremos que todos vean YA EXISTE: es Open Food
   Facts. Esto no crea una base paralela, le escribe a la de ellos.

   DECISIONES TOMADAS Y POR QUÉ:

   · Sólo FOTOS, nunca datos nutricionales. Una foto mala se descarta;
     un dato mal cargado contamina la base y lo copian otras apps.
     Además la IA de Open Food Facts lee las fotos y extrae los datos
     sola, así que aportando fotos aportamos datos igual.
   · Cuenta ÚNICA del proyecto, en variables de entorno. La app nunca
     pide ni maneja contraseñas de los usuarios.
   · Superficie mínima: un código, un tipo de foto, un JPEG.

   CONFIGURACIÓN REQUERIDA en Netlify → Environment variables:
       OFF_USER       nombre de usuario (NO el mail)
       OFF_PASSWORD   contraseña de esa cuenta
   ═══════════════════════════════════════════════════════════════════════ */

const CONTACTO = "https://keen-ganache-2c9dea.netlify.app";
const VERSION  = "0.4";
const UA = `SemaforoNutricional/${VERSION} (${CONTACTO})`;

const SUBIDA_PRODUCCION = "https://world.openfoodfacts.org/cgi/product_image_upload.pl";
const SUBIDA_PRUEBA     = "https://world.openfoodfacts.net/cgi/product_image_upload.pl";
const TIPOS = ["front", "nutrition", "ingredients"];
const MAX_BYTES = 1200000;      // el cliente comprime antes de enviar
/* Piso mínimo: una foto real de una etiqueta, ya comprimida, pesa decenas
   de kilobytes. Por debajo es una pantalla negra, un dedo tapando el lente
   o directamente basura. La firma JPEG sola no alcanza. */
const MIN_BYTES = 25000;
const IDIOMA = "es";

/* Segunda barrera, del lado del servidor: el cliente puede ser modificado
   por cualquiera, así que acá no se confía en nada de lo que llega. */
function digitoValido(codigo){
  if (!/^\d{8}$|^\d{12,14}$/.test(codigo)) return false;
  const d = codigo.split("").map(Number);
  const control = d.pop();
  let suma = 0;
  d.reverse().forEach((n, i) => { suma += n * (i % 2 === 0 ? 3 : 1); });
  return ((10 - (suma % 10)) % 10) === control;
}

function respuesta(codigo, cuerpo){
  return {
    statusCode: codigo,
    headers: { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" },
    body: JSON.stringify(cuerpo)
  };
}
exports.handler = async (event) => {
  if (event.httpMethod !== "POST"){
    return respuesta(405, { error:"metodo_no_permitido" });
  }

  const usuario = process.env.OFF_USER;
  const clave   = process.env.OFF_PASSWORD;
  if (!usuario || !clave){
    return respuesta(503, { error:"sin_credenciales",
      mensaje:"Todavía no configuramos la cuenta para aportar. Las fotos no se enviaron." });
  }

  let cuerpo;
  try{ cuerpo = JSON.parse(event.body || "{}"); }
  catch(e){ return respuesta(400, { error:"json_invalido" }); }

  const codigo = String(cuerpo.codigo || "").replace(/\D/g, "");
  const tipo   = String(cuerpo.tipo || "");
  if (codigo.length < 8 || codigo.length > 14) return respuesta(400, { error:"codigo_invalido" });
  if (!digitoValido(codigo)){
    return respuesta(400, { error:"digito_verificador",
      mensaje:"Ese número no es un código de barras válido. Revisalo contra el envase: no vamos a subir fotos a un código equivocado." });
  }
  if (!TIPOS.includes(tipo)) return respuesta(400, { error:"tipo_invalido" });

  const b64 = String(cuerpo.imagen || "").replace(/^data:image\/[a-z]+;base64,/, "");
  if (!b64) return respuesta(400, { error:"sin_imagen" });

  let bytes;
  try{ bytes = Buffer.from(b64, "base64"); }
  catch(e){ return respuesta(400, { error:"imagen_ilegible" }); }

  if (bytes.length > MAX_BYTES){
    return respuesta(413, { error:"imagen_grande",
      mensaje:"La foto pesa demasiado. Sacala de nuevo o probá con menos resolución." });
  }
  if (bytes.length < MIN_BYTES){
    return respuesta(400, { error:"imagen_vacia",
      mensaje:"Esa imagen no parece una foto de una etiqueta. Sacala de nuevo con buena luz." });
  }
  // Firma JPEG: no aceptamos cualquier cosa disfrazada de imagen.
  if (!(bytes[0] === 0xFF && bytes[1] === 0xD8)){
    return respuesta(400, { error:"no_es_jpeg" });
  }

  const campo = `${tipo}_${IDIOMA}`;
  const forma = new FormData();
  forma.append("user_id", usuario);
  forma.append("password", clave);
  forma.append("code", codigo);
  forma.append("imagefield", campo);
  forma.append(`imgupload_${campo}`,
               new Blob([bytes], { type:"image/jpeg" }),
               `${codigo}_${campo}.jpg`);

  /* Entorno: si OFF_ENTORNO vale "prueba", las fotos van a la base de
     ensayo. Las CONSULTAS siguen yendo a producción siempre. */
  const enPrueba = String(process.env.OFF_ENTORNO || "").toLowerCase() === "prueba";
  const destino = enPrueba ? SUBIDA_PRUEBA : SUBIDA_PRODUCCION;
  const cabeceras = { "User-Agent": UA };
  if (enPrueba && process.env.OFF_PRUEBA_AUTH){
    cabeceras["Authorization"] = "Basic " + Buffer.from(process.env.OFF_PRUEBA_AUTH).toString("base64");
  }

  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), 20000);
  try{
    const r = await fetch(destino, { method:"POST", headers: cabeceras, body: forma, signal: corte.signal });
    const texto = await r.text();
    let datos = null;
    try{ datos = JSON.parse(texto); }catch(e){ /* a veces devuelve HTML */ }

    if (!r.ok){
      return respuesta(502, { error:"rechazo_upstream", http:r.status, entorno: enPrueba ? "prueba" : "produccion",
        detalle: (datos && (datos.error || datos.status_verbose)) || texto.slice(0, 300) });
    }
    if (datos && datos.status === "status ok"){
      return respuesta(200, { ok:true, imagen: datos.imgid || null, entorno: enPrueba ? "prueba" : "produccion" });
    }
    return respuesta(200, { ok:false, entorno: enPrueba ? "prueba" : "produccion",
      detalle: (datos && (datos.error || datos.status || datos.status_verbose)) || texto.slice(0, 300) });

  }catch(e){
    const abortado = e.name === "AbortError";
    return respuesta(504, { error: abortado ? "demoro_demasiado" : "sin_respuesta" });
  }finally{
    clearTimeout(reloj);
  }
};
