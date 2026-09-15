\# Pyroguard - Sistema Integrado de Alerta Temprana de Incendios Forestales



\## Descripción

Los incendios forestales en la región de Valparaíso y Viña del Mar provocan pérdidas humanas y materiales debido a la demora en la detección y las alertas tardías de evacuación. \*\*Pyroguard\*\* soluciona este problema mediante un sistema que conecta sensores físicos en terreno con una central de emergencias, automatizando la alerta temprana, permitiendo a los oficiales validar focos para evitar falsas alarmas, y trazando rutas de evacuación seguras en los dispositivos móviles de los vecinos.



\## Integrantes

\- Iván Mandiola

\- Maximiliano Ávila

\- José Luis Marabolí



\## Arquitectura

El sistema utiliza una arquitectura \*\*Cliente-Servidor\*\* estructurada bajo un modelo de \*\*Monolito Modular\*\* dividido en capas (Presentación, Aplicación, Dominio e Infraestructura). La sección visual implementa el patrón Modelo-Vista-Controlador (MVC).



\## Tecnologías

\- \*\*Frontend / Móvil:\*\* React y React Native.

\- \*\*Backend:\*\* Python (FastAPI o Django).

\- \*\*Base de Datos:\*\* PostgreSQL con soporte para coordenadas (PostGIS).

\- \*\*Alojamiento (Cloud):\*\* Google Cloud o AWS.

\- \*\*Integraciones externas:\*\* Google Maps API y Firebase Cloud Messaging.



\## Organización del repositorio

\- `/docs`: Documentación técnica, diagramas UML, manuales y evidencias de gestión (Taiga).

\- `/src`: Código fuente del proyecto (incluye submódulos de frontend y backend).

\- `/tests`: Scripts y archivos para las pruebas unitarias y de integración del sistema.

