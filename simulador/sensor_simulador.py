import argparse
import os
import random
import time
from getpass import getpass

import httpx


def build_detection(mode: str) -> dict:
    detection = {
        "sensor_id": f"PG-SIM-{random.randint(1, 99):02d}",
        "sector": "Camino La Pólvora",
        "smoke_detected": mode != "sin-humo",
        "smoke_level": random.randint(40, 95) if mode != "sin-humo" else 0,
        "latitude": -33.0757,
        "longitude": -71.6136,
    }
    if mode == "invalido":
        detection["smoke_level"] = 150
    return detection


def send_detection(client: httpx.Client, detection: dict) -> None:
    response = client.post("/api/sensors/detections", json=detection)
    print(f"HTTP {response.status_code}: {response.text}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="URL base del backend")
    parser.add_argument(
        "--modo", choices=["humo", "sin-humo", "invalido", "aleatorio"], default="humo"
    )
    parser.add_argument("--intervalo", type=float, default=5, help="Segundos entre envíos aleatorios")
    parser.add_argument("--cantidad", type=int, default=5, help="Envíos en modo aleatorio")
    args = parser.parse_args()

    if args.modo == "aleatorio" and (args.intervalo < 0 or args.cantidad < 1):
        parser.error("--intervalo debe ser >= 0 y --cantidad debe ser >= 1")
    email = os.environ.get("PYROGUARD_ADMIN_EMAIL") or input("Correo operativo: ")
    password = os.environ.get("PYROGUARD_ADMIN_PASSWORD") or getpass("Contraseña operativa: ")
    with httpx.Client(base_url=args.url, timeout=10) as client:
        client.post("/api/auth/login", json={"email": email, "password": password}).raise_for_status()
        if args.modo != "aleatorio":
            send_detection(client, build_detection(args.modo))
            return
        for index in range(args.cantidad):
            mode = random.choice(["humo", "sin-humo"])
            print(f"Envío {index + 1}/{args.cantidad} ({mode})")
            send_detection(client, build_detection(mode))
            if index + 1 < args.cantidad:
                time.sleep(args.intervalo)


if __name__ == "__main__":
    try:
        main()
    except httpx.HTTPError as error:
        raise SystemExit(f"No fue posible iniciar sesión o conectar con PyroGuard: {error}") from error
