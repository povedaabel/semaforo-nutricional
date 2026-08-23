# Semáforo Nutricional

Una herramienta para **comparar alimentos, no para juzgarlos**.

Escaneás el código de barras de un producto envasado y ves qué porcentaje
del límite de referencia representa en azúcares, sodio, grasas y calorías.
Después podés compararlo con productos de la misma categoría que se
consiguen en Argentina.

**La aplicación informa. La persona decide.**

No dice qué comprar, no puntúa alimentos, no recomienda dietas, no da
consejo médico y no ordena la comparación por "el mejor". Muestra números
y deja elegir el criterio.

Probala: https://keen-ganache-2c9dea.netlify.app

---

## Estado

Prototipo funcional, en pruebas con usuarios reales.

Funciona hoy:

- Escáner de código de barras en Android, iPhone y computadora.
- Panel con el porcentaje de cada nutriente sobre su límite.
- Comparación con productos argentinos de la misma categoría.
- Aporte de fotos de etiquetas a Open Food Facts.
- Controles de coherencia que detectan datos imposibles.

No funciona todavía:

- Leyendas precautorias de edulcorantes y cafeína.
- Distinguir los productos que la norma excluye (arroz, harina, aceite).
- Datos propios cuando Open Food Facts no los tiene.
- Instalación como aplicación real (falta el service worker).

---

## Cómo está hecho

Una sola página HTML sin compilación, más dos funciones sin servidor.
No hay framework ni dependencias que instalar.

```
index.html                    la aplicación entera
netlify/functions/off.js      consulta a Open Food Facts, con caché
netlify/functions/aportar.js  subida de fotos a Open Food Facts
netlify.toml                  configuración de despliegue
docs/                         decisiones, normativa y motor de reglas
```

### Por qué hay un backend

Tres razones, todas descubiertas probándolo:

1. Open Food Facts exige identificar la aplicación con un User-Agent, y el
   navegador no permite ponerlo.
2. Sin caché, cada usuario consulta por su cuenta y bloquean a todos.
   Nos pasó.
3. Desde el navegador no se distingue un bloqueo por límite de una caída de
   red, y terminábamos diciendo "revisá tu conexión" con la conexión
   perfecta.

---

## Los números

Los límites **no están inventados**. Salen del Modelo de Perfil de
Nutrientes de OPS/OMS, adoptado por la Ley 27.642 de Argentina, en su
Segunda Etapa. Ver `docs/motor-de-reglas.md`.

**Validación contra la realidad**: un paquete de galletitas con los cuatro
octógonos oficiales impresos da exactamente esos cuatro excesos al pasar
por el motor, y ninguno de sodio, que tampoco lleva.

---

## Lo que este proyecto no hace, a propósito

- **No escribe datos en Open Food Facts.** Sólo fotos. Un dato mal cargado
  contamina la base y lo copian otras aplicaciones.
- **No calcula un puntaje de salud.** Combinar sodio, azúcar y grasas en un
  número implica decidir por el usuario.
- **No ordena la comparación por "el mejor".** El criterio lo elige quien
  compara.
- **No imita los octógonos oficiales.** El indicador es propio y lo dice.

---

## Datos y licencias

Los datos de productos vienen de [Open Food Facts](https://world.openfoodfacts.org),
bajo licencia ODbL. Son colaborativos: pueden estar incompletos o
equivocados, y la aplicación lo advierte en pantalla.

Las fotos que aporta la gente se publican allá bajo Creative Commons.

El código está bajo **AGPL-3.0**. En criollo: podés usarlo, copiarlo y
modificarlo, pero si ofrecés una versión modificada —incluso como sitio web,
sin distribuir ningún archivo— tenés que publicar tu código con la misma
licencia. Las mejoras vuelven.

---

## Cómo colaborar

Lo más útil hoy no es escribir código: es **escanear productos argentinos y
aportar las fotos de los que falten**. La cobertura de la góndola local es
el factor que decide si esta herramienta sirve.

Si encontrás un número que no coincide con el envase, avisá. Un dato
equivocado en verde es el peor error posible.
