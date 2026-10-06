# Medición del RNF01

RNF01 establece que la alerta debe llegar en menos de un minuto. La medición se realiza con el backend iniciado: el script cronometra desde el POST de una detección hasta que el sensor aparece en `GET /api/alerts`. Ejecuta diez muestras por defecto y registra promedio y máximo al final de este archivo.

## Criterios de ejecución

- Comando: `python scripts/medir_latencia.py`
- Muestras: 10
- Límite por muestra: 60 segundos
- Frecuencia de consulta: 250 ms
- Métricas: promedio y máximo de las muestras completadas.

## Resultados

Pendiente de ejecución en un entorno con el backend levantado. No se informan valores estimados como resultados medidos.
