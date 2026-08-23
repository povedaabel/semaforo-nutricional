# Motor de reglas

## Qué calcula

Para cada nutriente: **qué porcentaje del límite de referencia** representa
el producto, cada 100 g o 100 ml.

    porcentaje = valor / límite × 100

100% es el umbral normativo de exceso. La barra de la interfaz pone esa
marca en el medio, para que 101% y 350% no se vean iguales.

## Umbrales vigentes — Argentina, Ley 27.642, Segunda Etapa

| Nutriente         | Límite                                    |
|-------------------|-------------------------------------------|
| Azúcares añadidos | 10% de la energía                         |
| Grasas totales    | 30% de la energía                         |
| Grasas saturadas  | 10% de la energía                         |
| Sodio             | 1 mg por kcal **O** 300 mg/100 g          |
| Calorías          | 275 kcal/100 g · 25 kcal/100 ml           |

Bebidas sin aporte energético: 40 mg de sodio cada 100 ml.

### Detalles que cambian el resultado

**El sodio es una condición doble, no un tope.** Hay exceso si supera
1 mg/kcal *o* si supera 300 mg/100 g. Para el porcentaje se usa el umbral
más exigente de los dos, que da el mismo veredicto.

**Las calorías no son un sello autónomo.** La norma sólo las señala si
además hay exceso de azúcares o grasas. Sin eso, un producto que supera el
límite se muestra en ámbar con la aclaración. Por eso un paquete de polenta
marca 127% y no se pinta de rojo.

**Las grasas trans no son sello en Argentina.** El modelo general de OPS
las contempla, la implementación argentina no. Se muestran como
información, sin indicador.

**El criterio usa azúcares añadidos, no totales.** Cuando sólo hay totales,
se calcula una **cota superior**: si ni siquiera el máximo posible llega al
límite, es concluyente y se pinta verde. Si la cota pasa el límite, no se
puede determinar y se dice.

## Etapa anterior (histórico)

| Nutriente         | Primera Etapa                    |
|-------------------|----------------------------------|
| Azúcares añadidos | 20% de la energía                |
| Grasas totales    | 35% de la energía                |
| Grasas saturadas  | 12% de la energía                |
| Sodio             | 5 mg/kcal o 600 mg/100 g         |
| Calorías          | 300 kcal/100 g · 50 kcal/100 ml  |

Se conserva versionada. Los números que circulan por internet mezclan las
dos etapas, y eso costó una tarde de confusión.

## Validación contra un envase real

Galletitas integrales de avena con chips de chocolate, con los octógonos
oficiales impresos. Tabla nutricional llevada a 100 g:

| Indicador         | Calculado | Sello impreso |
|-------------------|-----------|---------------|
| Azúcares añadidos | 177%      | sí            |
| Grasas saturadas  | 169%      | sí            |
| Calorías          | 167%      | sí            |
| Grasas totales    | 138%      | sí            |
| Sodio             | 75%       | no            |

Cuatro de cuatro, y el que no corresponde tampoco se marcó.

## Controles de coherencia

Antes de pintar un color, el motor se pregunta si los números se
contradicen entre sí.

**Techos matemáticos.** Un nutriente no puede aportar más energía que la
que el producto declara. Azúcares y saturadas no pueden pasar de 1000%;
grasas totales, de 333%. Por encima de eso el dato está roto: un Gatorade
marcaba 4500%.

**Controles cruzados.** Más azúcares que carbohidratos es imposible. Más
saturadas que grasas totales, también. Y si las calorías declaradas no se
explican con los nutrientes cargados, falta algo.

Cuando algo no cierra, se avisa arriba del panel y se aclara que la
etiqueta del envase manda.

## Los colores

El corte rojo en 100% es normativo.

Los tramos verde (menos de 75%) y ámbar **son una convención de este
proyecto**, no de la norma, que es binaria. La aplicación lo aclara.
