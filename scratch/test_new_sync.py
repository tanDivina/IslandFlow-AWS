import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")
sys.path.append("backend")
from db import db

def test_new_sync_thresholds():
    owm_key = os.getenv("OPENWEATHER_API_KEY")
    dates_in_db = [doc["date"] for doc in db["logistics"].find({})]

    # 1. Fetch Marine wave heights from Open-Meteo
    wave_heights_by_date = {}
    try:
        marine_url = "https://marine-api.open-meteo.com/v1/marine?latitude=9.3403&longitude=-82.2420&hourly=wave_height&timezone=auto"
        res_marine = requests.get(marine_url, timeout=5)
        if res_marine.status_code == 200:
            marine_data = res_marine.json().get("hourly", {})
            m_times = marine_data.get("time", [])
            m_heights = marine_data.get("wave_height", [])
            for t, h in zip(m_times, m_heights):
                if h is not None:
                    d_part = t.split("T")[0].split(" ")[0]
                    if d_part not in wave_heights_by_date:
                        wave_heights_by_date[d_part] = []
                    wave_heights_by_date[d_part].append(h)
    except Exception as e:
        print(f"Error fetching marine data: {e}")

    # 2. Fetch meteorological forecast
    weather_by_date = {}
    if owm_key:
        try:
            url = f"http://api.openweathermap.org/data/2.5/forecast?q=Bocas%20del%20Toro,PA&appid={owm_key}&units=metric"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                owm_data = res.json()
                forecasts = owm_data.get("list", [])
                for f in forecasts:
                    dt_txt = f.get("dt_txt", "")
                    d_part = dt_txt.split(" ")[0]
                    if d_part not in weather_by_date:
                        weather_by_date[d_part] = []
                    weather_by_date[d_part].append({
                        "temp": f.get("main", {}).get("temp"),
                        "main": f.get("weather", [{}])[0].get("main", ""),
                        "desc": f.get("weather", [{}])[0].get("description", ""),
                        "precip": f.get("rain", {}).get("3h", 0)
                    })
        except Exception as e:
            print(f"Error querying OpenWeatherMap: {e}")

    # 3. Test different thresholds
    print("--- Using 2.5mm Volume Threshold ---")
    for date in dates_in_db:
        waves = wave_heights_by_date.get(date, [])
        max_wave = max(waves) if waves else 0.6
        day_points = weather_by_date.get(date, [])
        weather_status = "Sunny"
        alert_status = "none"
        total_rain = 0.0
        rain_periods = 0

        if day_points:
            total_rain = sum(p.get("precip", 0) for p in day_points)
            rain_periods = sum(1 for p in day_points if p.get("main", "").lower() in ["rain", "drizzle", "thunderstorm", "heavy rain"])
            heavy_detected = any("heavy" in p.get("desc", "").lower() or "thunderstorm" in p.get("desc", "").lower() or p.get("main") == "Heavy Rain" for p in day_points)
            descriptions = [p.get("main") for p in day_points]

            # Threshold 2.5mm instead of 1.5mm
            if heavy_detected or (total_rain >= 5.0 and rain_periods >= 2):
                weather_status = "Heavy Rain"
                alert_status = "rain_warning"
            elif (total_rain >= 2.5 or rain_periods >= 4) and any(p.get("main", "").lower() in ["rain", "drizzle", "thunderstorm"] for p in day_points):
                weather_status = "Rainy"
                alert_status = "rain_warning"
            else:
                non_rain_desc = [d for d in descriptions if d.lower() not in ["rain", "drizzle", "thunderstorm", "heavy rain"]]
                common_main = max(set(non_rain_desc), key=non_rain_desc.count) if non_rain_desc else "Clear"
                if common_main.lower() == "clouds":
                    weather_status = "Cloudy"
                elif common_main.lower() == "clear":
                    weather_status = "Sunny"
                else:
                    weather_status = common_main.capitalize()
                alert_status = "none"

        print(f"Date: {date} | Weather: {weather_status} (Rain: {total_rain:.2f}mm, Periods: {rain_periods}) | Alert: {alert_status} | Waves: {max_wave:.2f}m")

if __name__ == "__main__":
    test_new_sync_thresholds()
