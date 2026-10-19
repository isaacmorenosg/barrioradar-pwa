# BarrioRadar — PWA de opiniones vecinales moderadas

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