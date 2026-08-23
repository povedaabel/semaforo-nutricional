# Despliegue

## Con GitHub conectado

Netlify se conecta al repositorio una sola vez y a partir de ahí cada
cambio subido se publica solo.

Configuración, una única vez:

1. En Netlify: Project configuration → Build & deploy → link repository.
2. Publish directory: `.`
3. Functions directory: `netlify/functions`
4. Build command: vacío. No hay compilación.

Las variables de entorno **no viajan en el repositorio** y siguen
configurándose en Netlify.

## Variables de entorno

| Variable          | Para qué                                            |
|-------------------|-----------------------------------------------------|
| `OFF_USER`        | Usuario de Open Food Facts (el nombre, no el mail)  |
| `OFF_PASSWORD`    | Contraseña de esa cuenta                            |
| `OFF_ENTORNO`     | `prueba` manda las fotos a la base de ensayo        |
| `OFF_PRUEBA_AUTH` | Credenciales del entorno de ensayo, `usuario:clave` |

Sin las dos primeras, la aplicación avisa que no se puede aportar en vez de
fingir que envió algo.

Después de cambiar una variable hay que volver a desplegar: no se aplican
al sitio que ya está publicado.

## Nunca en el repositorio

Contraseñas, claves de API, tokens. El `index.html` es público: cualquiera
puede leerlo. Todo lo secreto vive en variables de entorno del servidor.

## Verificar después de desplegar

Dos comprobaciones que valen la pena, porque un despliegue exitoso no
garantiza que la aplicación funcione:

1. Consultar un producto conocido y ver que devuelva sus datos.
2. Mandar un pedido inválido a `/api/aportar` y ver que lo rechace. Si
   responde que faltan credenciales, las variables no se aplicaron.
