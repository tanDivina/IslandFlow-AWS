import os
import sys
import requests
import datetime
import logging
from dotenv import load_dotenv

load_dotenv("backend/.env")
sys.path.append("backend")
from db import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sync_live_weather():
    owm_key = os.getenv("OPENWEATHER_API_KEY")
    
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
            logger.info("Successfully fetched live marine wave heights from Open-Meteo.")
        else:
            logger.warning(f"Failed to fetch marine wave heights: HTTP {res_marine.status_code}")
    except Exception as e:
        logger.error(f"Error fetching marine data: {e}")

    # 2. Fetch meteorological forecast
    weather_by_date = {}
    owm_success = False
    
    if owm_key:
        try:
            logger.info("Attempting to query OpenWeatherMap forecast...")
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
                owm_success = True
                logger.info("Successfully fetched weather forecast from OpenWeatherMap.")
            else:
                logger.warning(f"OpenWeatherMap API returned status code {res.status_code}")
        except Exception as e:
            logger.error(f"Error querying OpenWeatherMap: {e}")

    if not owm_success:
        logger.info("Falling back to Open-Meteo meteorological API...")
        try:
            weather_url = "https://api.open-meteo.com/v1/forecast?latitude=9.3403&longitude=-82.2420&hourly=temperature_2m,precipitation,weathercode&timezone=auto"
            res_weather = requests.get(weather_url, timeout=5)
            if res_weather.status_code == 200:
                weather_data = res_weather.json().get("hourly", {})
                w_times = weather_data.get("time", [])
                temps = weather_data.get("temperature_2m", [])
                precips = weather_data.get("precipitation", [])
                w_codes = weather_data.get("weathercode", [])
                
                for t, temp, precip, code in zip(w_times, temps, precips, w_codes):
                    d_part = t.split("T")[0].split(" ")[0]
                    if d_part not in weather_by_date:
                        weather_by_date[d_part] = []
                    
                    # Map WMO weather codes to OWM categories
                    if code in [95, 96, 99, 63, 65, 81, 82]:
                        main_cat = "Heavy Rain"
                        desc_cat = "heavy rain/thunderstorm"
                    elif code in [51, 53, 55, 56, 57, 61, 66, 80]:
                        main_cat = "Rain"
                        desc_cat = "rainy/drizzle"
                    elif code in [1, 2, 3, 45, 48]:
                        main_cat = "Clouds"
                        desc_cat = "cloudy"
                    else:
                        main_cat = "Clear"
                        desc_cat = "sunny/clear"
                    
                    weather_by_date[d_part].append({
                        "temp": temp,
                        "main": main_cat,
                        "desc": desc_cat,
                        "precip": precip
                    })
                logger.info("Successfully fetched weather forecast from Open-Meteo fallback.")
            else:
                logger.warning(f"Failed to fetch weather forecast from Open-Meteo: HTTP {res_weather.status_code}")
        except Exception as e:
            logger.error(f"Error querying Open-Meteo fallback: {e}")

    # 3. Synchronize with database
    dates_in_db = [doc["date"] for doc in db["logistics"].find({})]
    logger.info(f"Synchronizing forecast for dates in database: {dates_in_db}")
    
    for date in dates_in_db:
        # Determine wave heights
        waves = wave_heights_by_date.get(date, [])
        max_wave = max(waves) if waves else 0.6
        wave_status = "dangerous" if max_wave > 1.5 else "safe"
        
        # Determine weather conditions
        day_points = weather_by_date.get(date, [])
        weather_status = "Sunny"
        alert_status = "none"
        
        if day_points:
            total_rain = sum(p.get("precip", 0) for p in day_points)
            rain_periods = sum(1 for p in day_points if p.get("main", "").lower() in ["rain", "drizzle", "thunderstorm", "heavy rain"])
            heavy_detected = any("heavy" in p.get("desc", "").lower() or "thunderstorm" in p.get("desc", "").lower() or p.get("main") in ["Heavy Rain", "Thunderstorm"] for p in day_points)
            descriptions = [p.get("main") for p in day_points]
            
            # Threshold classification logic
            if heavy_detected or (total_rain >= 5.0 and rain_periods >= 2):
                weather_status = "Heavy Rain"
                alert_status = "rain_warning"
            elif total_rain >= 2.5 and any(p.get("main", "").lower() in ["rain", "drizzle", "thunderstorm"] for p in day_points):
                weather_status = "Rainy"
                alert_status = "rain_warning"
            else:
                # Find most common non-rainy condition
                non_rain_desc = [d for d in descriptions if d.lower() not in ["rain", "drizzle", "thunderstorm", "heavy rain"]]
                common_main = max(set(non_rain_desc), key=non_rain_desc.count) if non_rain_desc else "Clear"
                if common_main.lower() == "clouds":
                    weather_status = "Cloudy"
                elif common_main.lower() == "clear":
                    weather_status = "Sunny"
                else:
                    weather_status = common_main.capitalize()
                alert_status = "none"
            
            logger.info(f"Processed {date}: Rain={total_rain:.2f}mm, Periods={rain_periods}, Heavy={heavy_detected} -> Weather={weather_status}, Alert={alert_status}")
        else:
            # Look up existing doc to maintain values if possible
            existing_doc = db["logistics"].find_one({"date": date})
            if existing_doc:
                weather_status = existing_doc.get("weather", "Sunny")
                alert_status = existing_doc.get("alert", "none")
                max_wave = existing_doc.get("wave_height", max_wave)
                wave_status = existing_doc.get("wave_status", wave_status)
        
        # Incorporate wave warning into alert status
        if max_wave > 1.5:
            if alert_status == "none":
                alert_status = "wave_warning"
            elif "wave_warning" not in alert_status:
                alert_status = f"{alert_status}+wave_warning"
        
        print(f"UPDATING MongoDB {date} -> Weather: {weather_status}, Alert: {alert_status}, Waves: {max_wave:.2f}m ({wave_status})")
        
        db["logistics"].update_one(
            {"date": date},
            {"$set": {
                "weather": weather_status,
                "alert": alert_status,
                "wave_height": max_wave,
                "wave_status": wave_status
            }}
        )

if __name__ == "__main__":
    sync_live_weather()
