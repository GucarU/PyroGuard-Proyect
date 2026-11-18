import argparse
import json
import os
import statistics
import time
from datetime import datetime, timezone
from getpass import getpass
from pathlib import Path

import httpx


def run_measurements(client: httpx.Client, count: int, timeout: float, interval: float):
    samples = []
    for number in range(1, count + 1):
        sensor_id = f"PG-RNF01-{time.time_ns()}-{number}"
        payload = {
            "sensor_id": sensor_id,
            "sector": "Camino La Pólvora",
            "smoke_detected": True,
            "smoke_level": 82,
            "latitude": -33.0757,
            "longitude": -71.6136,
        }
        started = time.perf_counter()
        created = client.post("/api/sensors/detections", json=payload).raise_for_status().json()
        if created.get("alert_created") is not True:
            raise RuntimeError(f"El backend no confirmó la alerta de la medición {number}.")

        deadline = started + timeout
        while time.perf_counter() < deadline:
            alerts = client.get("/api/alerts").raise_for_status().json()
            if any(alert.get("sensor_id") == sensor_id for alert in alerts):
                elapsed = time.perf_counter() - started
                samples.append(elapsed)
                print(f"Medición {number}/{count}: {elapsed:.3f} s")
                break
            time.sleep(interval)
        else:
            raise TimeoutError(f"La alerta {sensor_id} no apareció en GET dentro de {timeout:.1f} s.")

    return samples


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="URL base de la API")
    parser.add_argument("--cantidad", type=int, default=10, help="Cantidad de mediciones (por defecto: 10)")
    parser.add_argument("--timeout", type=float, default=60, help="Límite por medición, en segundos")
    parser.add_argument("--intervalo", type=float, default=0.25, help="Pausa entre consultas GET")
    parser.add_argument("--informe", type=Path, default=Path("docs/sprint1/rnf01.md"))
    args = parser.parse_args()
    if args.cantidad < 1 or args.timeout <= 0 or args.intervalo < 0:
        parser.error("cantidad y timeout deben ser positivos; intervalo debe ser >= 0")

    base_url = args.url.rstrip("/")
    email = os.environ.get("PYROGUARD_ADMIN_EMAIL") or input("Correo operativo: ")
    password = os.environ.get("PYROGUARD_ADMIN_PASSWORD") or getpass("Contraseña operativa: ")
    with httpx.Client(base_url=base_url, timeout=10) as client:
        client.post("/api/auth/login", json={"email": email, "password": password}).raise_for_status()
        samples = run_measurements(client, args.cantidad, args.timeout, args.intervalo)
    average = statistics.mean(samples)
    maximum = max(samples)
    print(f"Promedio: {average:.3f} s | Máximo: {maximum:.3f} s")

    report = args.informe
    report.parent.mkdir(parents=True, exist_ok=True)
    section = (
        f"\n## Ejecución {datetime.now(timezone.utc).isoformat()}\n\n"
        f"- API: `{base_url}`\n- Muestras exitosas: {len(samples)}/{args.cantidad}\n"
        f"- Promedio: {average:.3f} s\n- Máximo: {maximum:.3f} s\n"
        "- Método: cronómetro monotónico desde el envío POST hasta que GET /api/alerts "
        "contiene el sensor simulado.\n"
    )
    with report.open("a", encoding="utf-8") as output:
        output.write(section)
    print(f"Resultados añadidos a {report}")


if __name__ == "__main__":
    try:
        main()
    except (httpx.HTTPError, TimeoutError, RuntimeError, json.JSONDecodeError) as error:
        raise SystemExit(f"Medición incompleta: {error}") from error
