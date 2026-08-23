/* ═══════════════════════════════════════════════════════════════════════
   SEMÁFORO NUTRICIONAL — datos propios
   ───────────────────────────────────────────────────────────────────────
   Cuando Open Food Facts no tiene los datos, la persona que tiene el
   envase en la mano los copia de la etiqueta. Estos datos NO se
   escriben en la base de ellos y se muestran siempre marcados.

   Nuestra base no tiene moderadores. Por eso:

   · Un aporte solo queda como PROPUESTO. Dos aportes independientes que
     coinciden lo dejan CONFIRMADO. Es la escalera de validación de la
     especificación, y evita que una sola persona ensucie un producto.
   · Nada se sobrescribe: cada aporte se agrega al historial y el valor
     se recalcula.
   · Los mismos controles de coherencia que aplicamos a los datos ajenos
     se aplican acá. Sería absurdo tener un detector de datos rotos y no
     usarlo con los propios.
   ═══════════════════════════════════════════════════════════════════════ */

import { getStore } from "@netlify/blobs";

const TIENDA = "datos-propios";
const MAX_APORTES = 20;

/* Rangos de cordura por nutriente, cada 100 g o 100 ml. */
const RANGOS = {
  kcal:              [0, 900],
  azucares_totales:  [0, 100],
  azucares_anadidos: [0, 100],
  grasas:            [0, 100],
  saturadas:         [0, 100],
  sodio_mg:          [0, 40000]
};
const CAMPOS = Object.keys(RANGOS);

function respuesta(codigo, cuerpo){
  return new Response(JSON.stringify(cuerpo), {
    status: codigo,
    headers: { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" }
  });
}

function digitoValido(codigo){
  if (!/^\d{8}$|^\d{12,14}$/.test(codigo)) return false;
  const d = codigo.split("").map(Number);
  const control = d.pop();
  let suma = 0;
  d.reverse().forEach((n, i) => { suma += n * (i % 2 === 0 ? 3 : 1); });
  return ((10 - (suma % 10)) % 10) === control;
}

function incoherencias(v){
  const p = [];
  if (v.azucares_anadidos != null && v.azucares_totales != null
      && v.azucares_anadidos > v.azucares_totales + 0.5){
    p.push("Los azúcares añadidos no pueden superar a los totales.");
  }
  if (v.saturadas != null && v.grasas != null && v.saturadas > v.grasas + 0.5){
    p.push("Las grasas saturadas no pueden superar a las grasas totales.");
  }
  if (v.kcal != null){
    const minimo = (v.azucares_totales || 0) * 4 + (v.grasas || 0) * 9;
    if (minimo > v.kcal * 1.35 + 10){
      p.push("El azúcar y la grasa declarados aportan más energía (" + Math.round(minimo)
             + " kcal) que las calorías declaradas (" + Math.round(v.kcal) + ").");
    }
  }
  return p;
}

function limpiar(entrada){
  const v = {};
  for (const c of CAMPOS){
    const n = entrada[c];
    if (n === null || n === undefined || n === "") continue;
    const num = Number(n);
    if (!isFinite(num)) return { error: "El valor de " + c + " no es un número." };
    const [min, max] = RANGOS[c];
    if (num < min || num > max) return { error: "El valor de " + c + " está fuera de rango." };
    v[c] = Math.round(num * 100) / 100;
  }
  if (v.kcal === undefined) return { error: "Falta el valor energético: sin él no se puede calcular ningún límite." };
  if (Object.keys(v).length < 2) return { error: "Hace falta al menos un nutriente además de las calorías." };
  return { valores: v };
}

/* Un valor se considera confirmado cuando dos aportes independientes
   coinciden. Con uno solo queda propuesto, y se dice. */
function consolidar(aportes){
  const salida = {};
  for (const c of CAMPOS){
    const votos = new Map();
    for (const a of aportes){
      if (a.valores[c] === undefined) continue;
      const k = String(a.valores[c]);
      votos.set(k, (votos.get(k) || 0) + 1);
    }
    if (!votos.size) continue;
    const orden = [...votos.entries()].sort((x, y) => y[1] - x[1]);
    const [valor, cuenta] = orden[0];
    salida[c] = {
      valor: Number(valor),
      coincidencias: cuenta,
      estado: cuenta >= 2 ? "confirmado" : "propuesto",
      discrepancia: orden.length > 1
    };
  }
  return salida;
}

export default async (req) => {
  const url = new URL(req.url);
  const codigo = String(url.searchParams.get("codigo") || "").replace(/\D/g, "");
  if (!digitoValido(codigo)) return respuesta(400, { error: "codigo_invalido" });

  const tienda = getStore(TIENDA);

  if (req.method === "GET"){
    const guardado = await tienda.get(codigo, { type: "json" });
    if (!guardado) return respuesta(200, { codigo, hay: false });
    return respuesta(200, {
      codigo, hay: true,
      base: guardado.base,
      aportes: guardado.aportes.length,
      datos: consolidar(guardado.aportes)
    });
  }

  if (req.method !== "POST") return respuesta(405, { error: "metodo_no_permitido" });

  let cuerpo;
  try { cuerpo = await req.json(); }
  catch(e){ return respuesta(400, { error: "json_invalido" }); }

  const base = cuerpo.base === "100ml" ? "100ml" : "100g";
  const { valores, error } = limpiar(cuerpo.valores || {});
  if (error) return respuesta(400, { error: "valores_invalidos", mensaje: error });

  const problemas = incoherencias(valores);
  if (problemas.length){
    return respuesta(400, { error: "incoherente", mensaje: problemas.join(" ") });
  }

  const guardado = (await tienda.get(codigo, { type: "json" })) || { base, aportes: [] };
  if (guardado.aportes.length >= MAX_APORTES){
    return respuesta(429, { error: "demasiados_aportes",
      mensaje: "Este producto ya tiene muchos aportes cargados." });
  }

  /* Nunca se sobrescribe: se agrega al historial y se recalcula. */
  guardado.base = base;
  guardado.aportes.push({ valores, fecha: new Date().toISOString() });
  await tienda.setJSON(codigo, guardado);

  return respuesta(200, {
    ok: true, codigo,
    aportes: guardado.aportes.length,
    datos: consolidar(guardado.aportes)
  });
};

export const config = { path: "/api/datos" };
