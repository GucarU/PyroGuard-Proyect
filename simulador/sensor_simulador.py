import argparse
import json
import random
import time
import urllib.error
import urllib.request


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


def send_detection(url: str, detection: dict) -> None:
    endpoint = f"{url.rstrip('/')}/api/sensors/detections"
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(detection).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            print(f"HTTP {response.status}: {response.read().decode('utf-8')}")
    except urllib.error.HTTPError as error:
        print(f"HTTP {error.code}: {error.read().decode('utf-8')}")
    except urllib.error.URLError as error:
        print(f"No se pudo conectar con {endpoint}: {error.reason}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="URL base del backend")
    parser.add_argument(
        "--modo", choices=["humo", "sin-humo", "invalido", "aleatorio"], default="humo"
    )
    parser.add_argument("--intervalo", type=float, default=5, help="Segundos entre envíos aleatorios")
    parser.add_argument("--cantidad", type=int, default=5, help="Envíos en modo aleatorio")
    args = parser.parse_args()

    if args.modo != "aleatorio":
        send_detection(args.url, build_detection(args.modo))
        return
    if args.intervalo < 0 or args.cantidad < 1:
        parser.error("--intervalo debe ser >= 0 y --cantidad debe ser >= 1")
    for index in range(args.cantidad):
        mode = random.choice(["humo", "sin-humo"])
        print(f"Envío {index + 1}/{args.cantidad} ({mode})")
        send_detection(args.url, build_detection(mode))
        if index + 1 < args.cantidad:
            time.sleep(args.intervalo)


if __name__ == "__main__":
    main()
