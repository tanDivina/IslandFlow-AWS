import os
import logging
import datetime
import requests
import hmac
import hashlib
import base64
import json
import time
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from dotenv import load_dotenv

from db import db, get_bocas_today
from mock_data import seed_db
from agent import run_concierge_agent, clear_adk_session
from mcp_server import reschedule_booking, generate_itinerary

load_dotenv()
load_dotenv("backend/.env")


# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend_main")

SECRET_KEY = os.getenv("SECRET_KEY", "BocasConciergeSecretSuperKey2026!")

def generate_guest_token(guest_id: str) -> str:
    payload = {
        "guest_id": guest_id,
        "exp": int(time.time()) + (86400 * 30) # 30 days
    }
    payload_json = json.dumps(payload)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode('utf-8')).decode('utf-8')
    
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        payload_b64.encode('utf-8'),
        hashlib.sha256
    ).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode('utf-8')
    
    return f"{payload_b64}.{signature_b64}"

def verify_guest_token(token: str) -> str:
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, signature_b64 = parts[0], parts[1]
        
        expected_signature = hmac.new(
            SECRET_KEY.encode('utf-8'),
            payload_b64.encode('utf-8'),
            hashlib.sha256
        ).digest()
        expected_signature_b64 = base64.urlsafe_b64encode(expected_signature).decode('utf-8')
        
        if not hmac.compare_digest(signature_b64, expected_signature_b64):
            return None
            
        payload_json = base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8')
        payload = json.loads(payload_json)
        
        if int(time.time()) > payload.get("exp", 0):
            return None
            
        return payload.get("guest_id")
    except Exception:
        return None

app = FastAPI(title="Bocas Eco-Concierge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Background task for weather syncing
async def periodic_weather_sync():
    """Background task to periodically sync live weather with OpenWeatherMap every 10 minutes."""
    while True:
        try:
            logger.info("Automated Background Weather Sync: Starting sync...")
            sync_live_weather()
            logger.info("Automated Background Weather Sync: Completed.")
        except Exception as e:
            logger.error(f"Automated Background Weather Sync: Error during sync: {e}")
        await asyncio.sleep(600)  # Sleep for 10 minutes

# Seed database on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database...")
    seed_db()
    # Start automated background weather sync task
    asyncio.create_task(periodic_weather_sync())

# --- Pydantic Schemas ---
class TokenGeneratePayload(BaseModel):
    guest_id: str

class ChatPayload(BaseModel):
    guest_id: str = "g1"
    message: str
    history: list = []  # list of dicts: {"role": "user"|"model", "text": "..."}

class WeatherSimulationPayload(BaseModel):
    guest_id: str = "g1"
    date: str
    weather: str  # "Sunny", "Rainy", "Heavy Rain"
    alert: str    # "none", "rain_warning"
    wave_height: Optional[float] = None

class WeatherUpdatePayload(BaseModel):
    date: str
    weather: str  # "Sunny", "Rainy", "Heavy Rain", etc.
    alert: str    # "none", "rain_warning", etc.
    wave_height: Optional[float] = None

class ProposalPayload(BaseModel):
    guest_id: str = "g1"
    booking_id: str
    new_date: str
    alternative_tour_id: str = None
    accepted: bool

class PMSSyncPayload(BaseModel):
    guest_id: str
    name: str
    phone: str
    preferences: list = []
    stay_start: str
    stay_end: str
    notes: str = ""
    bookings: list = []  # list of dicts with {"tour_id": "...", "date": "...", "slot": "...", "price": 0.0}
    hotel_id: Optional[str] = None
    hotel_name: Optional[str] = None

class CaptainStatusPayload(BaseModel):
    booking_id: str
    status: str  # "confirmed", "en-route", "delayed", "unsafe-conditions", "completed"
    notes: Optional[str] = ""

class CaptainConditionsPayload(BaseModel):
    captain_id: str
    sea_state: str  # "calm", "moderate", "rough"
    visibility: str  # "clear", "moderate", "poor"
    rain: str  # "none", "light", "heavy"
    notes: Optional[str] = ""

class CaptainAssignPayload(BaseModel):
    booking_id: str
    captain_id: Optional[str] = None

class OperatorLoginPayload(BaseModel):
    email: str
    password: str


# --- Automated Weather Rescheduling ---
def trigger_automated_weather_reschedules(date: str, weather: str, alert: str):
    """
    Automated background rescheduling workflow.
    When a date's weather changes to rainy/heavy rain, this function finds all active outdoor bookings on that date,
    and runs the concierge agent's proactive rescheduling loop for each affected guest.
    """
    if weather not in ["Rainy", "Heavy Rain"] and alert != "rain_warning":
        return

    logger.info(f"Checking automated weather reschedules for {date} due to {weather} ({alert})")
    
    # 1. Find all confirmed bookings on this date
    bookings = list(db["bookings"].find({"date": date, "status": "confirmed"}))
    processed_guests_in_run = set()
    
    for b in bookings:
        # Retrieve the tour to check if it is outdoor
        tour = db["tours"].find_one({"_id": b["tour_id"]})
        if tour and tour.get("type") == "outdoor":
            guest_id = b["guest_id"]
            if guest_id in processed_guests_in_run:
                continue
                
            # Check if this weather alert has already been processed for this guest
            guest = db["guests"].find_one({"_id": guest_id})
            if not guest:
                continue
                
            processed_alerts = guest.get("processed_weather_alerts", [])
            if date in processed_alerts:
                logger.info(f"Weather alert for {date} already processed for guest {guest_id}. Skipping.")
                continue
                
            processed_guests_in_run.add(guest_id)
            
            alert_prompt = (
                f"[SYSTEM EVENT: Weather alert updated for {date} to {weather}. "
                f"Please run a scheduling check using your tools. "
                f"MANDATE: You are in PROPOSAL MODE. Under no circumstances are you allowed to call the `reschedule_booking` tool. "
                f"If this weather affects the guest's outdoor bookings on that day, you must ONLY identify indoor alternatives "
                f"from the tours database and list them in the chat as a reschedule proposal. The user will select and confirm their choice "
                f"using the interactive dropdown on the proposal card in the frontend UI. Do NOT execute any database updates or "
                f"rescheduling yourself in this turn! Explain the weather reason and details of the proposal clearly, and ask for their preference.]"
            )
            
            logger.info(f"Automatically triggering concierge agent rescheduling proposal loop for guest {guest_id} on {date}")
            try:
                # Load saved history to feed to the agent
                saved_history = guest.get("chat_history", [])
                formatted_history = []
                for h in saved_history:
                    role = "user" if h.get("role") == "user" else "model"
                    text = h.get("text") or h.get("message")
                    if text:
                        formatted_history.append({"role": role, "text": text})
                        
                response_text, logs = run_concierge_agent(
                    guest_id=guest_id,
                    user_message=alert_prompt,
                    history=formatted_history
                )
                
                # Append model message to guest's chat log
                new_msg = {"role": "model", "text": response_text, "timestamp": datetime.datetime.now().isoformat()}
                
                db["guests"].update_one(
                    {"_id": guest_id},
                    {
                        "$push": {
                            "chat_history": new_msg,
                            "processed_weather_alerts": date
                        }
                    }
                )
                logger.info(f"Successfully processed weather alert reschedule proposal for guest {guest_id}")
            except Exception as e:
                logger.error(f"Failed to run automated rescheduling for guest {guest_id}: {e}")

# --- Weather Sync Helper ---
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
    try:
        dates_in_db = [doc["date"] for doc in db["logistics"].find({})]
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
            
            db["logistics"].update_one(
                {"date": date},
                {"$set": {
                    "weather": weather_status,
                    "alert": alert_status,
                    "wave_height": max_wave,
                    "wave_status": wave_status
                }}
            )
            
            # Automatically trigger reschedule proposal loop for affected guests
            trigger_automated_weather_reschedules(date, weather_status, alert_status)
        logger.info("Successfully synced real-world weather and wave heights with MongoDB logistics.")
    except Exception as e:
        logger.error(f"Failed to synchronize live weather/marine data with database: {e}")

# --- Endpoints ---

@app.get("/api/status")
async def get_status(guest_id: str = "g1", token: str = None, secure: bool = False, hotel_id: Optional[str] = None):
    """Retrieve full database state for frontend visualization."""
    try:
        token_valid = False
        if token:
            resolved_guest_id = verify_guest_token(token)
            if resolved_guest_id:
                token_valid = True
                guest_id = resolved_guest_id
            else:
                raise HTTPException(status_code=401, detail="Invalid or expired secure token")

        # Auto-refresh database if dates do not match today's date
        today_str = get_bocas_today().strftime("%Y-%m-%d")
        first_logistic = db["logistics"].find_one({}, sort=[("date", 1)])
        if first_logistic and first_logistic.get("date", "") != today_str:
            logger.info("Seeded dates do not match today's date. Automatically resetting database to current dates...")
            db["tours"].delete_many({})
            db["guests"].delete_many({"_id": {"$in": [f"g{i}" for i in range(1, 11)]}})
            db["bookings"].delete_many({"guest_id": {"$in": [f"g{i}" for i in range(1, 11)]}})
            db["logistics"].delete_many({})
            db["tenants"].delete_many({})
            # Remove all mock itineraries
            for file in os.listdir("."):
                if file.startswith("mock_itinerary_") and file.endswith(".md"):
                    try:
                        os.remove(file)
                    except Exception:
                        pass
            seed_db()
            for i in range(1, 11):
                clear_adk_session(f"g{i}")

        # Sync actual real-world weather before reading from DB
        sync_live_weather()

        tours = list(db["tours"].find({}))
        bookings = list(db["bookings"].find({}))
        guests = list(db["guests"].find({}))
        logistics = list(db["logistics"].find({}))
        tenants = list(db["tenants"].find({}))
        dispatches = list(db["dispatches"].find({}))
        captains = list(db["captains"].find({}))
        
        # Clean mongo ObjectId to string for JSON serialization
        for collection in [tours, bookings, guests, logistics, tenants, dispatches, captains]:
            for doc in collection:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                    
        if token_valid or secure:
            guests = [g for g in guests if g["_id"] == guest_id]
            # Ensure bookings are also filtered to the specific guest
            bookings = [b for b in bookings if b.get("guest_id") == guest_id]
            
        if hotel_id:
            guests = [g for g in guests if g.get("hotel_id") == hotel_id]
            guest_ids = {g["_id"] for g in guests}
            bookings = [b for b in bookings if b.get("guest_id") in guest_ids]
                    
        # Generate fresh itinerary from DB
        try:
            itinerary_md = generate_itinerary(guest_id)
        except Exception as ge:
            logger.error(f"Failed to generate dynamic itinerary: {ge}")
            # Fallback to local file if dynamic generation fails
            itinerary_md = ""
            filename = f"mock_itinerary_{guest_id}.md"
            if os.path.exists(filename):
                try:
                    with open(filename, "r") as f:
                        itinerary_md = f.read()
                except Exception:
                    itinerary_md = ""
 
        # Fetch tenant brand configuration if guest exists
        current_guest = db["guests"].find_one({"_id": guest_id})
        tenant_brand = None
        chat_history = []
        if current_guest:
            hotel_id = current_guest.get("hotel_id")
            if hotel_id:
                tenant_brand = db["tenants"].find_one({"_id": hotel_id})
                if tenant_brand and "_id" in tenant_brand:
                    tenant_brand["_id"] = str(tenant_brand["_id"])
            chat_history = current_guest.get("chat_history", [])
 
        # Clean ObjectId from chat_history if any
        for msg in chat_history:
            if "_id" in msg:
                msg["_id"] = str(msg["_id"])
 
        return {
            "is_real_dynamodb": db.is_real_dynamo,
            "guest_id": guest_id,
            "tours": tours,
            "bookings": bookings,
            "guests": guests,
            "logistics": logistics,
            "tenants": tenants,
            "dispatches": dispatches,
            "captains": captains,
            "itinerary_markdown": itinerary_md,
            "tenant_brand": tenant_brand,
            "secure_token_active": token_valid,
            "chat_history": chat_history
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_concierge(payload: ChatPayload):
    """Chat endpoint to communicate with the Gemini Concierge Agent."""
    guest_id = payload.guest_id
    try:
        # Reformat history if necessary
        formatted_history = []
        for h in payload.history:
            role = "user" if h.get("role") == "user" else "model"
            text = h.get("text") or h.get("message")
            if text:
                formatted_history.append({"role": role, "text": text})

        response_text, logs = run_concierge_agent(
            guest_id=guest_id,
            user_message=payload.message,
            history=formatted_history
        )

        # Update MongoDB chat history
        user_msg = {"role": "user", "text": payload.message, "timestamp": datetime.datetime.now().isoformat()}
        model_msg = {"role": "model", "text": response_text, "timestamp": datetime.datetime.now().isoformat()}
        db["guests"].update_one(
            {"_id": guest_id},
            {"$push": {"chat_history": {"$each": [user_msg, model_msg]}}}
        )

        return {
            "response": response_text,
            "logs": logs
        }
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate-weather")
async def simulate_weather(payload: WeatherSimulationPayload):
    """Simulate weather alerts and trigger the agent's automated replanning loop."""
    guest_id = payload.guest_id
    try:
        # 1. Update weather logistics in database
        wave_h = payload.wave_height
        if wave_h is None:
            if payload.weather == "Heavy Rain":
                wave_h = 2.2
            elif payload.weather == "Rainy":
                wave_h = 1.2
            else:
                wave_h = 0.6
        wave_status = "dangerous" if wave_h > 1.5 else "safe"
        
        db["logistics"].update_one(
            {"date": payload.date},
            {"$set": {
                "weather": payload.weather,
                "alert": payload.alert,
                "wave_height": wave_h,
                "wave_status": wave_status
            }}
        )
        logger.info(f"Simulated weather updated for {payload.date}: {payload.weather} (Alert: {payload.alert}, Waves: {wave_h}m)")

        # Clear processed weather alert flag for this date if weather is sunny/normal, so it can be re-triggered later if needed
        if payload.weather not in ["Rainy", "Heavy Rain"]:
            db["guests"].update_many(
                {},
                {"$pull": {"processed_weather_alerts": payload.date}}
            )

        # 2. Automatically trigger reschedule proposals for ALL affected guests
        trigger_automated_weather_reschedules(payload.date, payload.weather, payload.alert)

        # Fetch the active guest's updated chat history to return the latest response
        active_guest = db["guests"].find_one({"_id": guest_id})
        agent_response = None
        if active_guest:
            history = active_guest.get("chat_history", [])
            if history and history[-1]["role"] == "model":
                agent_response = history[-1]["text"]

        # Fallback if active guest wasn't affected but we still want a message
        if not agent_response:
            agent_response = f"I've updated our island weather logistics for {payload.date} to {payload.weather}. No rescheduling was required for your itinerary, my friend!"

        return {
            "message": "Weather simulated successfully.",
            "agent_response": agent_response,
            "agent_logs": []
        }
    except Exception as e:
        logger.error(f"Error in weather simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/weather/update")
async def update_weather_api(payload: WeatherUpdatePayload):
    """
    Standard automated API to update weather logistics for a specific date
    and automatically trigger the agent's background reschedule proposal loop.
    """
    try:
        wave_h = payload.wave_height
        if wave_h is None:
            if payload.weather == "Heavy Rain":
                wave_h = 2.2
            elif payload.weather == "Rainy":
                wave_h = 1.2
            else:
                wave_h = 0.6
        wave_status = "dangerous" if wave_h > 1.5 else "safe"
        
        db["logistics"].update_one(
            {"date": payload.date},
            {"$set": {
                "weather": payload.weather,
                "alert": payload.alert,
                "wave_height": wave_h,
                "wave_status": wave_status
            }},
            upsert=True
        )
        logger.info(f"Automated weather update via API for {payload.date}: {payload.weather} (Alert: {payload.alert}, Waves: {wave_h}m)")

        # Clear processed alerts if sunny/normal so they can be re-triggered
        if payload.weather not in ["Rainy", "Heavy Rain"]:
            db["guests"].update_many(
                {},
                {"$pull": {"processed_weather_alerts": payload.date}}
            )

        # Automatically trigger reschedule proposals for ALL affected guests in the background
        trigger_automated_weather_reschedules(payload.date, payload.weather, payload.alert)

        return {
            "status": "success",
            "message": f"Weather logistics successfully updated for {payload.date}.",
            "details": {
                "date": payload.date,
                "weather": payload.weather,
                "alert": payload.alert,
                "wave_height": wave_h,
                "wave_status": wave_status
            }
        }
    except Exception as e:
        logger.error(f"Error in automated weather update API: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/respond-proposal")
async def respond_proposal(payload: ProposalPayload):
    """Accept or decline a reschedule booking proposal."""
    guest_id = payload.guest_id
    try:
        if payload.accepted:
            # 1. Call reschedule tool
            res = reschedule_booking(
                booking_id=payload.booking_id,
                new_date=payload.new_date,
                alternative_tour_id=payload.alternative_tour_id
            )
            # 2. Regenerate itinerary document
            generate_itinerary(guest_id)
            
            # Save accepted proposal to chat history
            tour = db["tours"].find_one({"_id": payload.alternative_tour_id})
            tour_name = tour["name"] if tour else "alternative tour"
            response_text = f"Reschedule confirmed! I have swapped your rainy day excursion on {payload.new_date} to the indoor '{tour_name}' workshop, my friend. Your updated itinerary is now live in your Portal!"
            
            user_msg = {"role": "user", "text": "Approve reschedule proposal", "timestamp": datetime.datetime.now().isoformat()}
            model_msg = {"role": "model", "text": response_text, "timestamp": datetime.datetime.now().isoformat()}
            db["guests"].update_one(
                {"_id": guest_id},
                {"$push": {"chat_history": {"$each": [user_msg, model_msg]}}}
            )
            
            return {
                "success": True,
                "message": f"Proposal accepted and processed. Details: {res}"
            }
        else:
            # Set booking status back to confirmed / log rejection
            db["bookings"].update_one(
                {"_id": payload.booking_id},
                {"$set": {"status": "confirmed"}}
            )
            
            # Save declined proposal to chat history
            response_text = "Respect! I have preserved your original outdoor excursion schedule, my friend. Let me know if you would like to explore any other alternatives. No stress!"
            
            user_msg = {"role": "user", "text": "Decline reschedule proposal", "timestamp": datetime.datetime.now().isoformat()}
            model_msg = {"role": "model", "text": response_text, "timestamp": datetime.datetime.now().isoformat()}
            db["guests"].update_one(
                {"_id": guest_id},
                {"$push": {"chat_history": {"$each": [user_msg, model_msg]}}}
            )
            
            return {
                "success": False,
                "message": "Proposal declined by guest. Booking restored to confirmed status."
            }
    except Exception as e:
        logger.error(f"Error responding to proposal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-secure-token")
async def generate_token_endpoint(payload: TokenGeneratePayload):
    try:
        # Verify guest exists
        guest = db["guests"].find_one({"_id": payload.guest_id})
        if not guest:
            raise HTTPException(status_code=404, detail="Guest not found")
        
        token = generate_guest_token(payload.guest_id)
        return {
            "success": True,
            "token": token
        }
    except Exception as e:
        logger.error(f"Error generating token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset")
async def reset_simulation():
    """Reset database to initial seeded state (zero-out for repeat tests)."""
    try:
        # Delete existing
        db["tours"].delete_many({})
        db["guests"].delete_many({})
        db["bookings"].delete_many({})
        db["logistics"].delete_many({})
        db["tenants"].delete_many({})
        db["dispatches"].delete_many({})
        db["captains"].delete_many({})
        
        # Remove all guest itinerary files
        for file in os.listdir("."):
            if file.startswith("mock_itinerary_") and file.endswith(".md"):
                try:
                    os.remove(file)
                except Exception:
                    pass
            
        # Seed
        seed_db()
        for i in range(1, 11):
            clear_adk_session(f"g{i}")
        return {"status": "success", "message": "Database and itinerary reset to initial seeded state."}
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pms/sync-guest")
async def sync_guest_from_pms(payload: PMSSyncPayload):
    """Property Management System (PMS) webhook entry point to sync checked-in guests and reservations."""
    try:
        # Update or Insert Guest Profile
        guest_doc = {
            "name": payload.name,
            "phone": payload.phone,
            "preferences": payload.preferences,
            "stay_start": payload.stay_start,
            "stay_end": payload.stay_end,
            "notes": payload.notes,
            "hotel_id": payload.hotel_id,
            "hotel_name": payload.hotel_name
        }
        db["guests"].update_one(
            {"_id": payload.guest_id},
            {"$set": guest_doc},
            upsert=True
        )

        # Clear existing bookings for this guest if replacing
        db["bookings"].delete_many({"guest_id": payload.guest_id})

        # Insert new bookings, protecting against duplicate tour bookings during PMS sync
        seen_tours = set()
        synced_count = 0
        for index, b in enumerate(payload.bookings):
            tour_id = b.get("tour_id")
            if not tour_id:
                continue
            if tour_id in seen_tours:
                logger.warning(f"Discarding duplicate reservation for tour_id '{tour_id}' during PMS sync for guest {payload.guest_id}.")
                continue
            seen_tours.add(tour_id)
            
            booking_id = f"b_pms_{payload.guest_id}_{index}"
            booking_doc = {
                "_id": booking_id,
                "guest_id": payload.guest_id,
                "tour_id": tour_id,
                "date": b.get("date"),
                "slot": b.get("slot", "morning"),
                "status": b.get("status", "confirmed"),
                "price": b.get("price", 0.0)
            }
            db["bookings"].insert_one(booking_doc)
            synced_count += 1

        # Auto-generate initial itinerary for the guest
        generate_itinerary(payload.guest_id)
        clear_adk_session(payload.guest_id)

        logger.info(f"Successfully synced guest {payload.name} ({payload.guest_id}) from PMS with {synced_count} bookings.")
        return {
            "success": True,
            "message": f"Guest {payload.name} and {synced_count} bookings successfully synced via PMS API."
        }
    except Exception as e:
        logger.error(f"Error in PMS sync endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AddTourPayload(BaseModel):
    name: str
    type: str  # "outdoor" or "indoor"
    description: str
    price: float
    slots: list = ["morning", "afternoon"]
    capacity: int = 10
    location: str = "Bocas del Toro"

@app.post("/api/operator/add-tour")
async def add_tour(payload: AddTourPayload):
    """Register a new excursion in the database."""
    try:
        # Generate a unique custom tour ID
        timestamp = int(time.time() * 1000) % 10000
        tour_id = f"t_custom_{timestamp}"
        
        tour_doc = {
            "_id": tour_id,
            "name": payload.name,
            "type": payload.type,
            "description": payload.description,
            "price": payload.price,
            "slots": payload.slots,
            "capacity": payload.capacity,
            "location": payload.location
        }
        
        db["tours"].insert_one(tour_doc)
        logger.info(f"Successfully added custom tour: {payload.name} ({tour_id})")
        return {
            "success": True,
            "tour_id": tour_id,
            "message": f"Successfully registered new excursion: {payload.name}"
        }
    except Exception as e:
        logger.error(f"Error adding custom tour: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TenantBrandExtraction(BaseModel):
    name: str = Field(description="The elegant name of the hotel, resort, or luxury lodge (e.g. 'Nayara Bocas del Toro')")
    primary_color: str = Field(description="A curated, premium brand primary color in HSL format 'hsl(H, S%, L%)'. Must be dark-mode-friendly, highly vibrant, and elegant. Avoid raw dull colors; prefer sand gold, emerald green, warm amber, sea turquoise, hibiscus magenta.")
    primary_glow: str = Field(description="A matching transparent glow in rgba format 'rgba(R, G, B, 0.12)' that perfectly corresponds to the HSL color.")
    font: str = Field(description="A premium Google Font family name stack matching the resort's vibe (e.g. 'Playfair Display, Georgia, serif' or 'Outfit, Poppins, system-ui, sans-serif').")
    welcome_message: str = Field(description="A highly bespoke, premium luxury welcome message for the resort's guest dashboard. It must sound warm, elite, and hospitable (e.g., 'Welcome to your Balinese wellness sanctuary in the Caribbean. Pura vida!'). Do NOT start with repetitious cliché greetings like 'respect, my friend', make it unique.")
    logo_url: Optional[str] = Field(None, description="The brand's actual logo or real favicon image URL if found in HTML meta properties (e.g. 'og:logo', 'shortcut icon') or actual image elements on the page. If no authentic, real brand logo is found in the website content, return null or an empty string. DO NOT use generic fallbacks or invented logos like Clearbit or Google favicon API generators.")

class BrandExtractPayload(BaseModel):
    url: str

@app.post("/api/tenant/extract-brand")
async def extract_brand_endpoint(payload: BrandExtractPayload):
    """Scrapes a URL and uses Gemini to extract and onboard a hotel's premium brand design system."""
    import re
    from urllib.parse import urlparse
    from google import genai
    from google.genai import types

    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")
        
    # Ensure URL has a scheme
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    domain = ""
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc or parsed_url.path
        if domain.startswith("www."):
            domain = domain[4:]
    except Exception:
        domain = url

    # Clean domain to use as ID
    clean_id = re.sub(r'[^a-zA-Z0-9]', '_', domain).lower()
    if clean_id.endswith("_"):
        clean_id = clean_id[:-1]
    hotel_id = f"hotel_{clean_id}"

    # Scraping HTML metadata with robust extraction and cleaning
    html_content = ""
    scrape_success = False
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            scrape_success = True
            text = res.text
            
            # Extract page title
            title_match = re.search(r'<title>(.*?)</title>', text, re.IGNORECASE | re.DOTALL)
            title = title_match.group(1).strip() if title_match else ""
            
            # Parse all meta tags regardless of attribute order or casing
            meta_tags = re.findall(r'<meta\s+([^>]+)>', text, re.IGNORECASE)
            meta_properties = {}
            for tag in meta_tags:
                name_match = re.search(r'(?:name|property|itemprop)\s*=\s*["\']([^"\']+)["\']', tag, re.IGNORECASE)
                content_match = re.search(r'content\s*=\s*["\']([^"\']*)["\']', tag, re.IGNORECASE)
                if name_match and content_match:
                    name = name_match.group(1).lower()
                    content = content_match.group(1).strip()
                    meta_properties[name] = content
            
            # Extract standard elements, OpenGraph social tags, and theme colors
            desc = meta_properties.get("description") or meta_properties.get("og:description") or meta_properties.get("twitter:description") or ""
            site_name = meta_properties.get("og:site_name") or meta_properties.get("og:title") or meta_properties.get("twitter:title") or ""
            theme_color = meta_properties.get("theme-color") or ""
            keywords = meta_properties.get("keywords") or ""
            
            # Extract up to 10 headings for context
            headings = re.findall(r'<h[123]>(.*?)</h[123]>', text, re.IGNORECASE | re.DOTALL)[:10]
            headings_text = " | ".join([re.sub(r'<[^>]*>', '', h).strip() for h in headings])
            
            # Clean HTML to strip heavy inline scripts, styling, and SVG nodes
            clean_text = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', text, flags=re.IGNORECASE)
            clean_text = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', clean_text, flags=re.IGNORECASE)
            clean_text = re.sub(r'<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>', '', clean_text, flags=re.IGNORECASE)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            
            html_content = (
                f"Page Title: {title}\n"
                f"Brand Hint: {site_name}\n"
                f"Meta Description: {desc}\n"
                f"Meta Keywords: {keywords}\n"
                f"Theme Color: {theme_color}\n"
                f"Headings: {headings_text}\n"
                f"Clean Body Snippet: {clean_text[:5000]}"
            )
    except Exception as e:
        logger.warning(f"Failed to scrape URL {url}: {e}. Falling back to domain heuristics.")

    # Formulate Prompt
    if scrape_success:
        prompt = (
            f"You are given scraped metadata and HTML context from a website URL: {url}.\n"
            f"HTML Context:\n{html_content}\n\n"
            f"Analyze this luxury brand, its identity, name, and style. "
            f"Create a complete premium dark-mode hospitality design system for this tenant."
        )
    else:
        prompt = (
            f"The website URL '{url}' could not be scraped directly. "
            f"Using the domain name '{domain}', identify the brand/hotel name, and design "
            f"a complete bespoke premium dark-mode hospitality design system for this tenant."
        )

    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set on the server")
            
        client = genai.Client()
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TenantBrandExtraction,
                system_instruction=(
                    "You are an elite luxury hospitality brand manager and senior UI design system architect.\n"
                    "Your job is to generate a beautifully coordinated brand color, typography, and messaging system.\n"
                    "RULES:\n"
                    "1. name: Determine the elegant brand name (e.g. 'Faro Blanco' or 'The Ritz-Carlton, Maui').\n"
                    "2. primary_color: Pick a vibrant, highly elegant brand primary color in HSL format, e.g. 'hsl(215, 80%, 60%)'. "
                    "Avoid dark/light backgrounds or dull colors; pick a primary color that will pop beautifully as buttons, selections, and glowing borders on a dark-mode obsidian dashboard.\n"
                    "3. primary_glow: Generate a matching semi-transparent RGBA glow with 0.12 opacity, e.g. 'rgba(34, 150, 240, 0.12)'.\n"
                    "4. font: Select a premium Google Font family name stack (e.g. 'Outfit, Poppins, sans-serif' or 'Playfair Display, Georgia, serif' or 'Montserrat, Inter, sans-serif').\n"
                    "5. welcome_message: Create a warm, bespoke, luxury 1-sentence welcome message incorporating local elements, but DO NOT start it with cliches like 'respect' or 'my friend'. Keep it unique.\n"
                    f"6. logo_url: Locate and provide the brand's actual logo or real favicon image URL if found in metadata, icons, or page content. If no authentic brand logo or high-quality favicon is found on the website, return null or an empty string. Absolutely do NOT construct invented or fallback/generic logos using Clearbit, Google favicon, or other third-party domain logo APIs."
                )
            ),
        )
        
        extracted_data = json.loads(response.text)
        
        # Save or update in database
        tenant_doc = {
            "_id": hotel_id,
            "name": extracted_data.get("name", domain.capitalize()),
            "primary_color": extracted_data.get("primary_color", "hsl(38, 45%, 60%)"),
            "primary_glow": extracted_data.get("primary_glow", "rgba(212, 175, 55, 0.12)"),
            "font": extracted_data.get("font", "Inter, sans-serif"),
            "welcome_message": extracted_data.get("welcome_message", "Welcome to our paradise!"),
            "logo_url": extracted_data.get("logo_url") or None,
            "theme": f"theme-custom-{clean_id}"
        }
        
        db["tenants"].update_one(
            {"_id": hotel_id},
            {"$set": tenant_doc},
            upsert=True
        )
        
        logger.info(f"Successfully brand-onboarded hotel: {tenant_doc['name']} ({hotel_id})")
        return {
            "success": True,
            "hotel_id": hotel_id,
            "tenant_brand": tenant_doc,
            "message": f"Successfully brand-onboarded {tenant_doc['name']}!"
        }
        
    except Exception as e:
        logger.error(f"Error in brand extraction: {e}")
        raise HTTPException(status_code=500, detail=f"Brand extraction failed: {str(e)}")

@app.delete("/api/tenant/{hotel_id}")
async def delete_tenant_endpoint(hotel_id: str):
    """Deletes a custom onboarded tenant brand from the database."""
    try:
        # Prevent deletion of default system hotels
        if hotel_id in ["hotel_nayara", "hotel_lacoralina", "hotel_sweetbocas", "hotel_bocasvillas", "hotel_redfrog"]:
            raise HTTPException(status_code=400, detail="Cannot delete default system hotels.")
            
        result = db["tenants"].delete_one({"_id": hotel_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Hotel not found")
            
        logger.info(f"Successfully deleted custom hotel brand: {hotel_id}")
        return {"success": True, "message": "Hotel successfully removed!"}
    except Exception as e:
        logger.error(f"Error deleting tenant {hotel_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/guest/{guest_id}")
async def delete_guest_endpoint(guest_id: str):
    """Deletes a guest and their bookings from the database."""
    try:
        # Prevent deleting default system mock guests
        if guest_id in [f"g{i}" for i in range(1, 11)]:
            raise HTTPException(status_code=400, detail="Cannot delete default system mock guests.")
            
        # Delete guest document
        result = db["guests"].delete_one({"_id": guest_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Guest not found.")
            
        # Delete guest bookings
        db["bookings"].delete_many({"guest_id": guest_id})
        
        # Remove itinerary file if exists
        filename = f"mock_itinerary_{guest_id}.md"
        if os.path.exists(filename):
            try:
                os.remove(filename)
            except Exception:
                pass
                
        # Clear ADK session
        clear_adk_session(guest_id)
        
        logger.info(f"Successfully deleted guest: {guest_id}")
        return {"success": True, "message": f"Successfully deleted guest {guest_id} and associated bookings."}
    except Exception as e:
        logger.error(f"Error deleting guest {guest_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Captain Portal & Dispatch API Routes ---

@app.get("/api/captains")
async def get_captains_endpoint():
    """Retrieve all boat captains for operator assignment UI."""
    try:
        captains = list(db["captains"].find({}))
        for cap in captains:
            cap["_id"] = str(cap["_id"])
        return captains
    except Exception as e:
        logger.error(f"Error fetching captains: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/captain/manifest/{captain_id}")
async def get_captain_manifest_endpoint(captain_id: str):
    """Retrieve today's/assigned trip manifest for a specific captain."""
    try:
        # Find bookings assigned to this captain
        bookings = list(db["bookings"].find({"captain_id": captain_id}))
        manifest = []
        for b in bookings:
            b["_id"] = str(b["_id"])
            
            # Fetch guest details
            guest = db["guests"].find_one({"_id": b["guest_id"]})
            if guest:
                guest["_id"] = str(guest["_id"])
                # Resolve hotel name
                hotel_name = "Independent"
                if guest.get("hotel_id"):
                    tenant = db["tenants"].find_one({"_id": guest["hotel_id"]})
                    if tenant:
                        hotel_name = tenant.get("name", "Unknown Hotel")
                guest["hotel_name"] = hotel_name
                if "chat_history" in guest:
                    del guest["chat_history"] # don't bloat manifest with chat history
            
            # Fetch tour details
            tour = db["tours"].find_one({"_id": b["tour_id"]})
            if tour:
                tour["_id"] = str(tour["_id"])
                
            manifest.append({
                "booking": b,
                "guest": guest,
                "tour": tour
            })
        return manifest
    except Exception as e:
        logger.error(f"Error getting manifest for captain {captain_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/captain/update-status")
async def update_captain_status_endpoint(payload: CaptainStatusPayload):
    """Update status of a booking from captain's perspective and notify guest."""
    try:
        booking = db["bookings"].find_one({"_id": payload.booking_id})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
            
        # Update the booking's captain status
        db["bookings"].update_one(
            {"_id": payload.booking_id},
            {"$set": {
                "captain_status": payload.status,
                "captain_status_notes": payload.notes,
                "captain_status_updated_at": datetime.datetime.now().isoformat()
            }}
        )
        
        # Resolve Captain Name
        captain_name = "Your boat captain"
        cap_id = booking.get("captain_id")
        if cap_id:
            cap = db["captains"].find_one({"_id": cap_id})
            if cap:
                captain_name = cap.get("name", "Your boat captain")
                
        # Resolve Tour Name
        tour_name = "your tour"
        tour = db["tours"].find_one({"_id": booking.get("tour_id")})
        if tour:
            tour_name = tour.get("name", "your tour")

        # Map status to a beautiful user-facing notification message
        messages = {
            "confirmed": f"[Boat Captain] {captain_name} has confirmed your pickup and is ready for {tour_name}!",
            "en-route": f"[Boat Captain] {captain_name} is en route to your hotel dock! Get ready for pickup!",
            "delayed": f"[Boat Captain] {captain_name} reports a slight delay. Notes: {payload.notes or 'Navigating traffic/weather.'}",
            "unsafe-conditions": f"[Unsafe Warning] {captain_name} flagged UNSAFE conditions on the water for {tour_name}. Notes: {payload.notes or 'Rough waves/heavy squall.'}",
            "completed": f"[Completed] {captain_name} reports your trip to {tour_name} is completed! We hope you had a beautiful adventure!"
        }
        
        system_text = messages.get(payload.status, f"[Status Update] Status updated to '{payload.status}' by {captain_name}.")
        
        # Inject system/captain message into guest chat history
        guest_id = booking.get("guest_id")
        if guest_id:
            model_msg = {
                "role": "model",
                "text": system_text,
                "timestamp": datetime.datetime.now().isoformat(),
                "is_system_notification": True
            }
            db["guests"].update_one(
                {"_id": guest_id},
                {"$push": {"chat_history": model_msg}}
            )
            
        logger.info(f"Captain status update: Booking {payload.booking_id} status={payload.status}")
        return {"success": True, "message": "Status updated successfully and guest notified!"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating captain status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/captain/report-conditions")
async def report_conditions_endpoint(payload: CaptainConditionsPayload):
    """Save real-time condition reports submitted by boat captains on the water."""
    try:
        # Save to logs/dispatches or update captain's status
        db["captains"].update_one(
            {"_id": payload.captain_id},
            {"$set": {
                "reported_conditions": {
                    "sea_state": payload.sea_state,
                    "visibility": payload.visibility,
                    "rain": payload.rain,
                    "notes": payload.notes,
                    "timestamp": datetime.datetime.now().isoformat()
                }
            }}
        )
        
        # Resolve Captain
        cap = db["captains"].find_one({"_id": payload.captain_id})
        captain_name = cap.get("name", "A captain") if cap else "A captain"
        
        # Log dispatch alert if conditions are rough
        if payload.sea_state == "rough" or payload.rain == "heavy":
            alert_msg = f"[ALERT] Wave-level warning reported by {captain_name} on water: Sea State={payload.sea_state.upper()}, Rain={payload.rain.upper()}!"
            db["dispatches"].insert_one({
                "type": "weather_warning",
                "message": alert_msg,
                "severity": "high",
                "timestamp": datetime.datetime.now().isoformat()
            })
            
        logger.info(f"Captain {payload.captain_id} reported conditions: Sea={payload.sea_state}, Rain={payload.rain}")
        return {"success": True, "message": "Field report submitted successfully!"}
    except Exception as e:
        logger.error(f"Error reporting captain conditions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/operator/assign-captain")
async def assign_captain_endpoint(payload: CaptainAssignPayload):
    """Assign/unassign a boat captain to a booking."""
    try:
        booking = db["bookings"].find_one({"_id": payload.booking_id})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
            
        # Update the booking
        db["bookings"].update_one(
            {"_id": payload.booking_id},
            {"$set": {
                "captain_id": payload.captain_id,
                "captain_status": "assigned" if payload.captain_id else None
            }}
        )
        
        # Add system notification to guest chat if captain is newly assigned
        if payload.captain_id:
            cap = db["captains"].find_one({"_id": payload.captain_id})
            if cap:
                captain_name = cap.get("name", "Your boat captain")
                boat_name = cap.get("boat", "local panga")
                
                tour_name = "your tour"
                tour = db["tours"].find_one({"_id": booking.get("tour_id")})
                if tour:
                    tour_name = tour.get("name", "your tour")
                    
                notify_msg = f"[Boat Dispatch] Good news! Boat Captain {captain_name} has been assigned to guide your {tour_name} on the boat '{boat_name}'!"
                guest_id = booking.get("guest_id")
                if guest_id:
                    db["guests"].update_one(
                        {"_id": guest_id},
                        {"$push": {"chat_history": {
                            "role": "model",
                            "text": notify_msg,
                            "timestamp": datetime.datetime.now().isoformat(),
                            "is_system_notification": True
                        }}}
                    )
                    
        logger.info(f"Operator assigned captain {payload.captain_id} to booking {payload.booking_id}")
        return {"success": True, "message": "Captain assigned successfully!"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error assigning captain: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/operator/login")
async def operator_login(payload: OperatorLoginPayload):
    """Authenticate hotel operators and return their hotel_id."""
    email_clean = payload.email.strip().lower()
    
    # Pre-seeded real-world hotel operators
    MOCK_OPERATORS = {
        "nayara@hotel.com": {"hotel_id": "hotel_nayara", "hotel_name": "Nayara Bocas del Toro"},
        "sweetbocas@hotel.com": {"hotel_id": "hotel_sweetbocas", "hotel_name": "Sweet Bocas"},
        "redfrog@hotel.com": {"hotel_id": "hotel_redfrog", "hotel_name": "Red Frog Beach Resort"},
        "lacoralina@hotel.com": {"hotel_id": "hotel_lacoralina", "hotel_name": "La Coralina Island House"},
        "bocasvillas@hotel.com": {"hotel_id": "hotel_bocasvillas", "hotel_name": "Bocas Luxury Villas"},
    }
    
    if email_clean not in MOCK_OPERATORS:
        raise HTTPException(status_code=401, detail="Invalid hotel operator email.")
        
    if payload.password != "admin":
        raise HTTPException(status_code=401, detail="Incorrect password. Please use 'admin' for demo.")
        
    operator_info = MOCK_OPERATORS[email_clean]
    return {
        "status": "success",
        "email": email_clean,
        "hotel_id": operator_info["hotel_id"],
        "hotel_name": operator_info["hotel_name"],
        "token": f"mock-session-token-{operator_info['hotel_id']}"
    }

# Serve React Frontend Static Files in Production (if frontend/dist exists)
FRONTEND_DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend/dist")
if os.path.exists(FRONTEND_DIST_DIR):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    
    # Mount assets directory
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        
    # Serve index.html for all other non-API routes
    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        
        # Check if the file exists directly in the frontend dist root (like concierge_avatar.png)
        if catchall:
            file_path = os.path.join(FRONTEND_DIST_DIR, catchall)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
                
        index_path = os.path.join(FRONTEND_DIST_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend index.html not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
