# Zonenta — Conoce el lugar antes de elegirlo.

La identidad pública de BarrioRadar cambia a **Zonenta**, con azul marino `#0F2D5B`, naranja `#FF6B3D` y fondo `#F8F9FB`. El nombre técnico del repositorio, los identificadores `br_*` y el dominio de Render permanecen sin cambios para conservar datos y compatibilidad. Los colores del mapa (verde/ámbar/rojo) son indicadores de valoración y no cambian con la marca.

**Despliegue importante:** Render sigue compilando mediante `.github/workflows/barrioradar-pwa.zip`. Para activar la nueva interfaz es necesario publicar directamente `public/` o regenerar ese ZIP en el mismo formato antes de desplegar.

BarrioRadar muestra **percepciones subjetivas de personas con correo verificado**, no estadísticas oficiales de delitos ni indicadores objetivos de seguridad. El mapa se abre en **Huelva**. Las opiniones reales solo aparecen cuando están **aprobadas**. Una única opinión aprobada puede visualizarse con aviso explícito de muestra muy limitada.

## Sitio de producción

- Aplicación: https://barrioradar-pwa.onrender.com/
- Moderación: https://barrioradar-pwa.onrender.com/admin.html
- Versión de muestra: `/?muestras=1` (opiniones **ficticias**, sin mezclarse con los datos reales).
- Datos y autenticación: Supabase Postgres/Auth. SMTP de autenticación: Brevo, gestionado por Supabase Auth.

## Sectores del mapa (revisión 2)

Los hexágonos de selección tienen **200 m de radio en la proyección Web Mercator** (antes 400 m); cada sector ocupa una cuarta parte de la superficie anterior. El mapa abre con zoom 14 para poder seleccionarlos cómodamente. Se conservan las opiniones previas trasladando cada sector histórico `(q,r)` a `(2q,2r)`, con el mismo centro geográfico y la misma identidad del autor. No se multiplican votos.

La migración SQL en `supabase/migrations/20261019_smaller_sectors.sql` ajusta las funciones de geolocalización y los identificadores de los sectores. Durante la transición acepta peticiones de clientes con la cuadrícula antigua, que se normalizan al tamaño nuevo. El frontend consulta su valoración previa con `br_my_sector_review_v2`; el punto de entrada anterior sigue disponible para clientes PWA aún sin actualizar. Las guardadas y comparaciones en `localStorage` se convierten automáticamente una sola vez en el navegador.

## Cómo funcionan las valoraciones

1. El usuario inicia sesión con un correo confirmado.
2. Puede valorar **todas las zonas que quiera**.
3. En cada zona se almacena **solo una valoración vigente** por usuario autenticado (`actor_id`, `cell_id`). Las modificaciones sustituyen la anterior en la base de datos, nunca se suman como votos adicionales.
4. La valoración nueva y **cada modificación** vuelven a moderación. El comentario libre es opcional (máx. 500 caracteres).
5. Al editar una zona ya valorada, se presenta un aviso visible y **se pide confirmación antes de sobrescribir** la contribución anterior. Cancelar no modifica nada.
6. Para evitar reenvíos repetidos, el backend exige **esperar al menos 2 minutos** antes de modificar de nuevo la misma zona. No existe un máximo de zonas ni un límite de por vida para editar.

### Controles de privacidad

- La base de datos comprueba la titularidad del voto con `auth.uid()`, no con una dirección de correo enviada desde el navegador.
- `br_my_sector_review` solo está disponible para usuarios autenticados y únicamente indica si ese usuario ya valoró ese sector. No expone puntuaciones ni correos de otros usuarios.
- Los comentarios públicos solo se obtienen de las valoraciones aprobadas, previa moderación, escapando HTML en el navegador.
- Nunca subir claves de servicio, contraseñas SMTP ni secretos al repositorio.

## Desarrollo

Los archivos públicos, editables y revisables están en `public/`. Requiere Node 22 para el servidor local opcional:

```sh
npm start
npm test
```

Para conectarlo a Supabase se utiliza `public/config.js` con una clave **publishable** (pública), nunca una service-role/secret key.

## Despliegue de producción

El servicio Render existente sirve `barrioradar/public` después de ejecutar:

```sh
unzip -q .github/workflows/barrioradar-pwa.zip -d . && test -f barrioradar/public/index.html && test -f barrioradar/public/manifest.webmanifest && test -f barrioradar/public/sw.js
```

La raíz contiene el código fuente de la PWA para permitir su mantenimiento. Por compatibilidad con el Build Command del servicio actualmente desplegado, `barrioradar-pwa.zip` sigue versionado en `.github/workflows/`, **aunque no es un workflow de GitHub Actions**. Cada actualización debe regenerar el ZIP con los mismos archivos de `public/` hasta que se actualice el comando de compilación de Render para publicar directamente `public/`. No borrar el ZIP sin cambiar primero la configuración de Render.

El proyecto utiliza el dominio principal `https://barrioradar-pwa.onrender.com` para que la PWA instalada pueda actualizar su service worker y caché.

La privacidad y las condiciones del servicio deben recibir revisión jurídica antes de abrir al público.

## Corrección de la ciudad inicial (v13)

El HTML, el estado inicial y las etiquetas del mapa arrancan todos en Huelva. Un sincronizador central actualiza el título, la navegación y la ubicación visible al inicio y al cambiar de ciudad. La nota principal de la ficha representa el indicador de día o noche seleccionado, no el promedio global de las cuatro métricas. Se renueva la caché PWA para desplegar la corrección.

## Buscador nacional (v14)

La caja de búsqueda admite **municipios, ciudades, pueblos y entidades de población de toda España**, no solamente la lista de accesos rápidos. Consulta por nombre el servicio de geocodificación oficial [CartoCiudad (IGN/CNIG)](https://www.cartociudad.es/web/portal/directorio-de-servicios/geoprocesamiento), que incluye entidades poblacionales, y [Photon/OpenStreetMap](https://github.com/komoot/photon) como fuente complementaria o alternativa.

- Se buscan un máximo de 24 candidatos oficiales y 30 referencias OSM, limitadas al territorio español, priorizando coincidencias por nombre y mostrando el municipio y/o la provincia.
- Los municipios y poblaciones de CartoCiudad se geolocalizan por identificador al elegirlos; no se inventan coordenadas si el servicio no responde.
- Si uno de los servicios no está disponible se conservan los resultados del otro. Peticiones solo al enviar la búsqueda, con límite de frecuencia, caché temporal y tiempo máximo de respuesta.
- Los accesos rápidos a las capitales se mantienen como atajo, sin limitar la búsqueda libre.
- La cobertura de pedanías y barrios depende de los datos de origen; la app no afirma que todas las entidades existentes estén indexadas.

Las fuentes de los lugares proceden de IGN/CNIG (CartoCiudad) y de OpenStreetMap/Photon. El mapa base sigue siendo © OpenStreetMap.

## Comentarios completos y gestos móviles (v18)

El mapa muestra los promedios de los últimos 180 días. Al consultar una zona con valoraciones aprobadas, el cliente solicita sus **comentarios aprobados** a la función `public.br_sector_comments` en páginas de 20, con el botón «Ver más comentarios» hasta agotar el histórico. No se publican mensajes pendientes/rechazados ni datos de identidad; el texto se escapa en HTML.

El mapa es interactivo con un dedo para desplazarlo y tocar sectores. En móvil admite **pinza con dos dedos** para ampliar o reducir, manteniendo el punto medio como ancla. Una pinza no selecciona sectores ni abre la ficha. Los controles +/− continúan operativos y los comentarios siguen teniendo desplazamiento independiente en la ficha inferior.

La migración SQL está documentada en `supabase/migrations/20261020_paginated_sector_comments.sql`. La función RPC restringe cada página a 50 elementos y valida el identificador del sector.

## Corrección de la ficha móvil (v19)

La ficha de sector en pantallas de hasta 760 px se mueve al nivel superior del documento, fuera de la capa del mapa que interceptaba el gesto táctil. La ficha completa es ahora un único contenedor con scroll vertical natural, la barra de cierre permanece fija y se puede pulsar **Ampliar** para ocupar toda la pantalla (o **Reducir** para volver al tamaño inicial). La barra superior admite un gesto hacia arriba/abajo para ampliar/reducir. En escritorio la ficha se devuelve a su posición original. El JavaScript y CSS de esta corrección se sirven desde `public/mobile-sheet-fix.js` y `.css` y se precargan con el service worker v19.

Validación visual y táctil: Chromium móvil simulado en 320×568, 360×760 y 393×852; scroll táctil nativo comprobado en 360×760, contenido final visible, botones Ampliar/Reducir/Cerrar y restauración de la ubicación de la ficha en escritorio.

## Mapa móvil: selecciona primero, abre después (v20)

La leyenda de colores permanece siempre visible **encima de** los créditos de OpenStreetMap y CartoCiudad. El botón «Colores» ya no existe. Los sectores con valoraciones muestran el número de opiniones desde el zoom inicial 14.

En móvil, tocar una zona **solo la resalta** y revela su identificador y el total de opiniones aprobadas en un resumen visible sobre el mapa. La ficha de puntuaciones se abre únicamente al pulsar «Ver zona», que además lleva una insignia con ese total. Los botones de ver y compartir se mantienen deshabilitados hasta elegir expresamente un sector; al buscar otra localidad, se limpia la selección anterior. Los gestos de pinza siguen funcionando. La caché PWA se incrementa a v20.

## Mapa simplificado (v21)

El mapa muestra solamente los colores de los sectores, sin cifras encima de los hexágonos. Al seleccionar un sector, el pequeño resumen muestra su identificador y el total de opiniones aprobadas (formato español: 5.000, 100.000); el usuario decide cuándo abrir la ficha mediante «Ver zona».

El selector Día/Noche se elimina. Los colores se determinan mediante una **media aritmética con cuatro pesos iguales (25 % cada uno)**: seguridad percibida de día, de noche, iluminación y confort acústico. La ficha presenta los cuatro indicadores al mismo nivel y deja de destacar un único valor en un círculo. El color es una percepción subjetiva agregada y no una estadística oficial de delincuencia.

La consulta pública, la moderación, las valoraciones y comentarios existentes en Supabase, los controles táctiles y la leyenda visible junto a los créditos del mapa se conservan. El service worker v21 invalida la interfaz anterior.

## Legibilidad del mapa e icono de cuenta (v22)

La simplificación v21 ya muestra la media de cuatro percepciones para el color, los recuentos de opiniones únicamente en el resumen del sector y la apertura explícita mediante «Ver zona». En v22 se añade el símbolo `user` al sprite SVG (soluciona el icono ausente de «Cuenta») y se aligera el filtro de las teselas de OpenStreetMap: brillo 0,88 en escritorio y 0,86 en móvil (antes 0,55 y 0,48 respectivamente). Se conserva el tema oscuro en controles y fichas. Se invalida la caché mediante el service worker v22 y se añaden pruebas de regresión.

## Mayor visibilidad de los sectores en el mapa (v24)

Los polígonos mantienen sus tres tonos (verde, ámbar y coral) y siguen siendo translúcidos para permitir leer calles y edificios. Se incrementa moderadamente la opacidad de relleno: **60 %** cuando hay menos de cinco opiniones aprobadas (antes 38 %), **76 %** cuando hay cinco o más (antes 58 %) y **88 %** en la zona seleccionada (antes 79 %). Los contornos son un poco más visibles; los sectores con menos de cinco opiniones conservan la línea discontinua para señalar que la muestra es escasa. No cambian la geometría, las calificaciones, el número de opiniones ni la moderación. Caché PWA v24.
