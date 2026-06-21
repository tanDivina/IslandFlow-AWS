import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")

def test_marine():
    url = "https://marine-api.open-meteo.com/v1/marine?latitude=9.3403&longitude=-82.2420&hourly=wave_height&timezone=auto"
    res = requests.get(url, timeout=5)
    print(f"Marine Status Code: {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        heights = hourly.get("wave_height", [])
        print(f"Total hourly marine points: {len(times)}")
        for t, h in list(zip(times, heights))[:10]:
            print(f"{t}: {h}m")
    else:
        print(res.text)

if __name__ == "__main__":
    test_marine()
