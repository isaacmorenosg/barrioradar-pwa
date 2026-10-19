# BarrioRadar · PWA comunitaria

Aplicación web progresiva con Supabase PostgreSQL/Auth para recopilar **percepciones vecinales moderadas**, no estadísticas oficiales de delitos.

## Producción

- [Abrir BarrioRadar](https://barrioradar-pwa.onrender.com/)
- [Administración](https://barrioradar-pwa.onrender.com/admin.html)
- Proyecto Supabase: `ipbqymwaxgsoshwexusk`
- Ciudad inicial: Huelva, España.
- Una valoración **aprobada** basta para mostrar un sector. De 1 a 4 opiniones se advierte que la muestra es muy limitada. No se publican opiniones pendientes.
- `/?muestras=1` muestra un modo de diseño con puntuaciones ficticias, segregado de los datos reales.

## Despliegue actual en Render

El servicio original utiliza temporalmente el archivo de compatibilidad `.github/workflows/barrioradar-pwa.zip`, porque su Build Command ya estaba configurado para descomprimirlo. Este ZIP contiene `barrioradar/public/` y **no debe confundirse con un workflow de GitHub Actions**.

**Pendiente de mantenimiento:** mover los archivos fuente descomprimidos a la raíz del repositorio y cambiar el Build Command de Render a `echo 'Sitio estático listo'` con Publish Directory `public`.

En Supabase Auth, configurar la URL principal `https://barrioradar-pwa.onrender.com` entre los destinos de redirección permitidos, manteniendo la URL beta si aún se utiliza.

## Seguridad y alcance

El cliente solo utiliza una clave **publishable**. Las validaciones y la moderación se aplican en las funciones RPC de PostgreSQL. El servicio está en beta y la política de privacidad provisional requiere completar la identidad/contacto del responsable y revisión legal antes de una apertura general.
