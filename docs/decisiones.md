# Decisiones y preguntas abiertas

Cada decisión con su motivo. Si alguna se revierte, que sea sabiendo qué
problema resolvía.

---

## Decidido

### Comparar, no juzgar
La aplicación muestra números y deja elegir. No hay puntaje agregado porque
combinar sodio, azúcar y grasas en un solo valor es decidir por el usuario.

### Los umbrales no se inventan
Fase 0 de investigación normativa antes de programar el motor. Cuando una
fuente contradice a otra, se muestran las dos, no se elige en silencio.

### Sólo fotos hacia Open Food Facts, nunca datos
Una foto mala se descarta; un dato mal cargado contamina la base y lo
copian otras aplicaciones. Además, la IA de ellos extrae datos de las
fotos, así que aportando fotos se aportan datos igual.

### Cuenta única del proyecto para aportar
La aplicación nunca pide ni maneja contraseñas de usuarios. Las
credenciales viven en variables de entorno del servidor.

### El indicador propio no imita el sello oficial
Se usan verde, ámbar y rojo, pero nunca la forma del octógono ni el texto
"EXCESO EN". La pantalla aclara que no reemplaza al etiquetado regulatorio.

### Ante la duda, no mostrar
"Información insuficiente" antes que un número inventado. Vale para datos
faltantes, para ceros sospechosos y para porcentajes imposibles.

### Licencia AGPL-3.0
El riesgo real no es que copien el código: es que alguien tome el motor de
comparación, le agregue un puntaje de "saludable", publicidad y ranking
pago, y lo lance cerrado. La AGPL es la única licencia con copyleft que
cubre el caso de una aplicación web, donde no se distribuye ningún archivo
y por eso las demás no se activan.

Además es coherente con los datos: Open Food Facts ya obliga a compartir lo
derivado. Contra asumida: espanta aportes de empresas.

Y pesó que la decisión es asimétrica. Con un solo autor se puede
relicenciar hacia una licencia más permisiva en cualquier momento; al revés
no, porque lo que salió bajo MIT ya no vuelve.

---

## Reglas de datos que costó descubrir

Cada una salió de un error real en producción:

**Un cero declarado en azúcares añadidos, con azúcares totales por encima,
no es confiable.** Una Coca-Cola en la base tenía añadidos 0 y totales 7,5:
salía 0% en verde. Ahora ese cero se descarta y se muestra la cota
superior.

**Hay un techo matemático por nutriente.** El azúcar no puede aportar más
del 100% de la energía de un producto, así que no puede superar el 1000%
del límite. Un Gatorade marcaba 4500%: eran datos rotos, no un producto
extremo.

**Los códigos de 12 dígitos son UPC-A** y Open Food Facts los guarda con un
cero adelante. Sin normalizar, productos que existen aparecen como
inexistentes.

**El 404 de Open Food Facts significa "no está cargado", no "falló la
red".** Confundirlos hacía que le pidiéramos paciencia al usuario en vez de
invitarlo a aportar el producto.

**La categoría paraguas plant-based-foods-and-beverages contiene la palabra
"beverages".** Detectar líquidos buscando esa palabra mandaba pan y
galletitas al umbral de bebidas: un pan lactal marcaba 1044% en calorías.

**El lector de códigos puede equivocarse y devolver un número que igual
pasa la validación del dígito verificador.** Por eso el número se le
muestra a la persona antes de buscar, y otra vez antes de aportar fotos.

---

## Abierto

### Obligaciones de ODbL sobre una base derivada propia
Mientras sólo leemos datos de Open Food Facts no importa. Si guardamos
datos propios mezclados con los de ellos y los publicamos, sí. Hay que
resolverlo antes de publicar, no después.

### Datos propios
Cuando la base no tiene los datos, la idea es que la persona los tipee de
la etiqueta que tiene en la mano, con la IA proponiendo y la persona
confirmando, nunca al revés. Requiere base de datos real, respaldo y una
leyenda de "dato no oficial" que viaje con el número hasta la última
pantalla donde se muestre, incluida la comparación. Y si nuestro dato
difiere del de la base, se muestran los dos: nunca reemplazar en silencio.

### Productos excluidos por la norma
El etiquetado frontal no se aplica a alimentos de un solo ingrediente ni
mínimamente procesados: arroz, harina, aceite, legumbres. La aplicación hoy
les calcula porcentajes igual. Debería decir que están fuera del sistema.

### Leyendas precautorias
Faltan las de edulcorantes y cafeína. Aparecen en productos comunes: una
Coca-Cola común lleva sucralosa además de azúcar.

### Ceros por descuido
Un cero puede ser un dato real o un campo vacío. Hoy sólo se detecta el
caso de los azúcares añadidos. El problema es general.

### Cuando la energía está mal, contamina todo
Los límites de azúcares, grasas y sodio se calculan sobre las calorías. Si
las calorías están mal cargadas, todos los indicadores quedan mal, pero hoy
se marca sólo la fila que supera su techo.

### Duplicados
Hay dos fichas de Coca-Cola en la base con códigos distintos: una con datos
y otra vacía. Cuál se muestra depende de cuál esté impresa en la botella
que tenés en la mano.

### Otros países
La arquitectura contempla varios motores normativos, pero sólo Argentina
está verificado. Traducir la interfaz sin las tablas de cada país sería
mostrar números de una ley aplicados a productos de otra.
