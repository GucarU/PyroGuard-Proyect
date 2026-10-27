# PyroGuard · Corrección de alertas y mapas · 26/10/2026

## Qué se corrigió
- El botón **Generar alerta aleatoria** crea una alerta de humo con sector, sensor e intensidad variables. **Dos clics consecutivos no repiten el mismo sensor**.
- Tras crear una alerta, el filtro y el mapa cambian a su sector automáticamente; se desplaza la vista hacia el mapa y aparece un recuadro con el sensor seleccionado.
- En **Central y mapa** aparece el mapa de focos, viento, albergues y grifos de demostración si el rol es bombero o municipal.
- **Logística → Grifos** ahora incluye **su propio mapa**. Un usuario con rol Operador verá el mapa sin grifos y un botón **Ver mapa como Bombero (demo)**. Para Bombero/Municipal hay pines de prueba; si no existen registros aún, se ven tres ejemplos ficticios claramente señalizados. Haz clic para definir coordenadas de un nuevo grifo de prueba.
- La sección Sensores muestra una batería gráfica y textos más legibles.
- La solicitud de apoyo tiene un **mapa secundario** para seleccionar la ubicación; el backend registra solicitudes de agua de práctica, NO un servicio de despacho real de cuadrillas.
- Se corrigió el texto de las nuevas alertas: «detectó» en vez de «detectÃ³». También se muestra correctamente en el historial viejo.

## Cómo ejecutar ESTA versión
**IMPORTANTE:** la descarga de este ZIP NO actualiza automáticamente el clon GitHub anterior. Descomprime este ZIP en una carpeta nueva, ábrela en VS Code y trabaja desde esa carpeta.

En la carpeta raíz de PyroGuard:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```

En una **segunda terminal**:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Abre `http://localhost:5173` y recarga con `Ctrl + Shift + R`.

### Verificaciones visuales
1. En **Central y mapa**, verás **Generar alerta aleatoria** y **Ver mapa**. Genera dos alertas. Comprueba que el sensor cambia y que el mapa salta a la ubicación nueva.
2. En **Logística**, abre **Grifos**. Con rol Bombero/Municipal debes ver un mapa con tres grifos ficticios de ejemplo si aún no guardaste ninguno. Haz clic en el mapa, pon un nombre, guarda y vuelve a Central.
3. En **Sensores**, comprueba la batería gráfica.
4. En **Logística → Solicitud**, haz clic en el mapa secundario para seleccionar el punto solicitado.

Si la cartografía se ve gris o sin calles, verifica Internet y el acceso a mosaicos OpenStreetMap. La API local puede funcionar incluso si los mosaicos externos están bloqueados.

## Pruebas ejecutadas en la entrega
- `python -m pytest -q`: **35 PASS**.
- `node --test frontend/src/lib/maxi.test.js frontend/src/lib/demoDetections.test.node.js`: **15 PASS**.
- Comprobación sintáctica de siete archivos JS/JSX: sin errores de parseo.

La compilación Vite y los tests de componentes React deben verificarse en tu PC con:

```powershell
cd frontend
npm.cmd run build
npm.cmd test
```

El entorno donde se preparó esta versión no pudo completar la instalación npm, así que no se afirma que esas dos verificaciones estén aprobadas.

## Nota de seguridad
Todo es un **prototipo académico** con detecciones de ejemplo, grifos ficticios y roles simulados. No corresponde a un sistema real de emergencias.
