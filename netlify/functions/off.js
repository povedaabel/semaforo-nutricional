/* ═══════════════════════════════════════════════════════════════════════
   SEMÁFORO NUTRICIONAL — proxy hacia Open Food Facts
   ───────────────────────────────────────────────────────────────────────
   Existe por cuatro razones concretas:

   1. IDENTIFICACIÓN. Open Food Facts exige un User-Agent que diga quién
      consulta. El navegador no permite ponerlo. Acá sí.
   2. CACHÉ. Sin esto, cada usuario le pega a la base por su cuenta y nos
      bloquean a todos. Con caché, mil personas escaneando el mismo pan
      son una sola consulta.
   3. ERRORES HONESTOS. Desde el navegador, un bloqueo por límite y una
      caída de red se ven igual, y terminábamos diciéndole al usuario
      "revisá tu conexión" cuando la conexión estaba perfecta.
   4. SUPERFICIE CERRADA. Sólo dos operaciones permitidas y validadas.
      No es un proxy abierto: nadie puede usar nuestro dominio para
      consultar cualquier cosa.
   ═══════════════════════════════════════════════════════════════════════ */

// ⚠ COMPLETAR ANTES DE USO REAL. Open Food Facts pide un contacto válido.
const CONTACTO = "https://keen-ganache-2c9dea.netlify.app";
const VERSION  = "0.4";
const UA = `SemaforoNutricional/${VERSION} (${CONTACTO})`;

const OFF = "https://world.openfoodfacts.org";
const CAMPOS = "code,product_name,product_name_es,brands,categories_tags,nutriments,stores,countries_tags,last_modified_t";

/* Caché en memoria. Vive lo que vive la instancia: es best-effort, no una
   garantía. El paso siguiente es un almacenamiento que persista entre
   invocaciones. */
const cache = new Map();
const MAX_ENTRADAS = 500;
const TTL_PRODUCTO  = 24 * 60 * 60 * 1000;
const TTL_BUSQUEDA  =  6 * 60 * 60 * 1000;
const TTL_NO_EXISTE =  6 * 60 * 60 * 1000;

function leer(clave){
  const e = cache.get(clave);
  if (!e) return null;
  if (Date.now() > e.expira){ cache.delete(clave); return null; }
  return e.valor;
}
function guardar(clave, valor, ttl){
  if (cache.size >= MAX_ENTRADAS) cache.delete(cache.keys().next().value);
  cache.set(clave, { valor, expira: Date.now() + ttl });
}

function respuesta(codigo, cuerpo, extra = {}){
  return {
    statusCode: codigo,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...extra
    },
    body: JSON.stringify(cuerpo)
  };
}
exports.handler = async (event) => {
  const p = event.queryStringParameters || {};
  let url, clave, ttl;

  if (p.tipo === "producto"){
    const codigo = String(p.codigo || "").replace(/\D/g, "");
    if (codigo.length < 8 || codigo.length > 14){
      return respuesta(400, { error:"codigo_invalido",
        mensaje:"El código de barras tiene entre 8 y 14 dígitos." });
    }
    clave = "producto:" + codigo;
    ttl   = TTL_PRODUCTO;
    url   = `${OFF}/api/v2/product/${codigo}?fields=${CAMPOS}`;

  } else if (p.tipo === "similares"){
    const categoria = String(p.categoria || "");
    if (!/^[a-z]{2}:[a-z0-9\-]{1,80}$/i.test(categoria)){
      return respuesta(400, { error:"categoria_invalida" });
    }
    const pais = String(p.pais || "argentina").replace(/[^a-z\-]/gi, "").slice(0, 40);
    clave = `similares:${categoria}:${pais}`;
    ttl   = TTL_BUSQUEDA;
    url   = `${OFF}/api/v2/search?categories_tags=${encodeURIComponent(categoria)}`
          + `&countries_tags_en=${encodeURIComponent(pais)}`
          + `&fields=${CAMPOS}&page_size=24`;

  } else {
    return respuesta(400, { error:"tipo_invalido",
      mensaje:"Operaciones permitidas: producto, similares." });
  }

  const enCache = leer(clave);
  if (enCache) return respuesta(200, enCache, { "X-Semaforo-Cache":"hit" });

  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), 9000);
  try{
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept":"application/json" },
      signal: corte.signal
    });

    // 404 = el producto no está cargado. No es una falla: es una respuesta.
    if (r.status === 404){
      const vacio = { status:0, __noExiste:true };
      guardar(clave, vacio, TTL_NO_EXISTE);
      return respuesta(200, vacio, { "X-Semaforo-Cache":"miss" });
    }
    if (r.status === 429){
      return respuesta(429, { error:"limite_upstream",
        mensaje:"Open Food Facts está limitando las consultas. Hay que esperar." });
    }
    if (!r.ok){
      return respuesta(502, { error:"upstream", http:r.status });
    }

    const datos = await r.json();
    guardar(clave, datos, ttl);
    return respuesta(200, datos, { "X-Semaforo-Cache":"miss" });

  }catch(e){
    const abortado = e.name === "AbortError";
    return respuesta(504, { error: abortado ? "demoro_demasiado" : "sin_respuesta" });
  }finally{
    clearTimeout(reloj);
  }
};
