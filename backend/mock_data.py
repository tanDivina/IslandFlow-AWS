import logging
import datetime
from db import get_db, get_bocas_today

logger = logging.getLogger("seeder")

def get_dynamic_dates():
    today = get_bocas_today()
    d0 = (today).strftime("%Y-%m-%d")                     # Today
    d1 = (today + datetime.timedelta(days=1)).strftime("%Y-%m-%d") # Tomorrow
    d2 = (today + datetime.timedelta(days=2)).strftime("%Y-%m-%d") # Day 2
    d3 = (today + datetime.timedelta(days=3)).strftime("%Y-%m-%d") # Day 3
    
    # Stay start / end
    stay_start = (today - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    stay_end = (today + datetime.timedelta(days=3)).strftime("%Y-%m-%d")
    
    return {
        "d0": d0,
        "d1": d1,
        "d2": d2,
        "d3": d3,
        "stay_start": stay_start,
        "stay_end": stay_end
    }

def get_tours_data(dates):
    return [
        {
            "_id": "t1",
            "name": "Cayos Zapatilla Reef Snorkeling",
            "location": "Bastimentos National Marine Park",
            "description": "Board a local panga boat to Cayos Zapatilla. Snorkel crystal-clear reefs, spot marine turtles, and walk white-sand beaches. Perfect for wildlife lovers.",
            "type": "outdoor",
            "price": 45.0,
            "capacity": 10,
            "available_slots": {
                dates["d0"]: 8,
                dates["d1"]: 10,
                dates["d2"]: 10
            },
            "tags": ["wildlife", "adventure", "water"]
        },
        {
            "_id": "t2",
            "name": "Bastimentos Canopy Zip Line",
            "location": "Red Frog Beach Canopy",
            "description": "Fly through the tropical rainforest canopy on 7 zipline cables. Get a bird's-eye view of Bastimentos Island and spot red frogs along the jungle floor.",
            "type": "outdoor",
            "price": 65.0,
            "capacity": 8,
            "available_slots": {
                dates["d0"]: 5,
                dates["d1"]: 6,
                dates["d2"]: 8
            },
            "tags": ["adventure", "forest"]
        },
        {
            "_id": "t3",
            "name": "Red Frog Rainforest Guided Hike",
            "location": "Red Frog Beach Reserve",
            "description": "A guided walk through the rainforest trails. Learn about indigenous flora, spot sloths, caimans, and the famous red poison dart frogs.",
            "type": "outdoor",
            "price": 30.0,
            "capacity": 12,
            "available_slots": {
                dates["d0"]: 11,
                dates["d1"]: 12,
                dates["d2"]: 12
            },
            "tags": ["wildlife", "hiking", "forest"]
        },
        {
            "_id": "t4",
            "name": "Finca Montezuma Chocolate Workshop",
            "location": "Isla San Cristóbal (Dolphin Bay)",
            "description": "A hands-on chocolate workshop in a jungle sanctuary. Harvest fresh cacao, learn the fermentation process, and grind raw cacao to craft your own organic truffles and chocolate bars.",
            "type": "indoor",
            "price": 40.0,
            "capacity": 12,
            "available_slots": {
                dates["d0"]: 12,
                dates["d1"]: 12,
                dates["d2"]: 12
            },
            "tags": ["food", "culture", "indoor"]
        },
        {
            "_id": "t5",
            "name": "Afro-Caribbean Cooking Masterclass",
            "location": "Old Bank Town",
            "description": "Cook traditional Bocatoreño dishes (coconut rice, run-down fish stew, jerk chicken) with local chef Elena in a covered seaside kitchen. Sip fresh passionfruit juice.",
            "type": "indoor",
            "price": 40.0,
            "capacity": 8,
            "available_slots": {
                dates["d0"]: 8,
                dates["d1"]: 8,
                dates["d2"]: 8
            },
            "tags": ["food", "culture", "indoor"]
        },
        {
            "_id": "t6",
            "name": "Carenero Island Spa & Massage",
            "location": "Carenero Island Overwater Deck",
            "description": "Relax on a covered overwater deck with a 60-minute Swedish massage. Listen to the gentle waves under the deck while receiving a botanical coconut oil treatment.",
            "type": "indoor",
            "price": 75.0,
            "capacity": 4,
            "available_slots": {
                dates["d0"]: 4,
                dates["d1"]: 4,
                dates["d2"]: 4
            },
            "tags": ["relaxation", "indoor"]
        },
        {
            "_id": "t7",
            "name": "Museo Hou Wang (Archipelago History)",
            "location": "Calle Primera (1st Street), Isla Colón",
            "description": "Discover the multiethnic history of the archipelago. Highlights include the century-old Hou Wang Chinese Altar (unique in the Americas), Pre-Columbian artifacts, Spanish exploration history, and banana golden era exhibits.",
            "type": "indoor",
            "price": 8.0,
            "capacity": 20,
            "available_slots": {
                dates["d0"]: 20,
                dates["d1"]: 20,
                dates["d2"]: 20
            },
            "tags": ["culture", "history", "indoor"]
        },
        {
            "_id": "t8",
            "name": "Finca Natural Regenerative Farm Tour",
            "location": "Isla Solarte",
            "description": "An educational-focused regenerative farm tour. Explore the covered animal zone and reforestation paths. Visit the 40x20 bamboo welcome center with a full roof to taste home-brewed herbal teas, sample fresh tropical fruits, and try hand-crafted plant elixirs.",
            "type": "indoor",
            "price": 30.0,
            "capacity": 12,
            "available_slots": {
                dates["d0"]: 12,
                dates["d1"]: 12,
                dates["d2"]: 12
            },
            "tags": ["indoor", "food", "culture", "farm", "nature"]
        },
        {
            "_id": "t9",
            "name": "Texas Hold'em Poker at JJ's",
            "location": "JJ's (Bocas Town)",
            "description": "Join the local community for Texas Hold'em Poker, held on Thursdays at 12:00. Play two or three games across up to 3 tables under a fully covered deck. $10.00 buy-in.",
            "type": "indoor",
            "price": 10.0,
            "capacity": 15,
            "available_slots": {
                dates["d0"]: 15,
                dates["d1"]: 15,
                dates["d2"]: 15
            },
            "tags": ["indoor", "social", "games", "culture"]
        },
        {
            "_id": "t10",
            "name": "Seahorse Point Whistle-Stop Sloth Tour",
            "location": "Sea Horse Point (Sloth Point), Bahia Honda, Isla Bastimentos",
            "description": "Embark on a guided stroll along the boardwalks of Seahorse Point, known locally as Sloth Point. Spot wild sloths up close in their natural canopy habitat and learn how the reserve protects local mangroves from boat damage. Rain or shine—high-end bubble umbrellas, waterproof capes, and boots are provided!",
            "type": "outdoor",
            "price": 5.0,
            "capacity": 15,
            "available_slots": {
                dates["d0"]: 15,
                dates["d1"]: 15,
                dates["d2"]: 15
            },
            "tags": ["wildlife", "nature", "conservation", "sloths"]
        },
        {
            "_id": "t11",
            "name": "Seahorse Point Safari Lunch & Tamal Class",
            "location": "Sea Horse Point (Sloth Point), Bahia Honda, Isla Bastimentos",
            "description": "Indulge in a unique eco-culinary excursion! Support a local lady entrepreneur and learn the traditional art of making (and eating) authentic hand-wrapped tamales. Followed by a premium Safari Lunch at the covered Seagrass Café, featuring fresh-baked cookies, island tea brewed from local trees, and breathtaking sunset overwater views.",
            "type": "indoor",
            "price": 45.0,
            "capacity": 8,
            "available_slots": {
                dates["d0"]: 8,
                dates["d1"]: 8,
                dates["d2"]: 8
            },
            "tags": ["food", "culture", "cooking", "indoor"]
        },
        {
            "_id": "t12",
            "name": "Seahorse Point Wet-Day Science & Art Workshops",
            "location": "Sea Horse Point (Sloth Point), Bahia Honda, Isla Bastimentos",
            "description": "Turn a rainy day into an educational adventure! Step inside the Seahorse Point research labs and pottery studio to make clay corals (learning coral ecology), experiment with microwave pottery, collect live marine samples for Plankton Science, craft giant flowers from fine Italian paper, or discover the tiny microworld of pinhead works of art critical to bird life.",
            "type": "indoor",
            "price": 25.0,
            "capacity": 12,
            "available_slots": {
                dates["d0"]: 12,
                dates["d1"]: 12,
                dates["d2"]: 12
            },
            "tags": ["indoor", "science", "art", "ecology", "culture"]
        }
    ]

def get_guests_data(dates):
    return [
        {
            "_id": "g1",
            "name": "Alex Mercer",
            "phone": "+507-6111-2222",
            "preferences": ["wildlife", "adventure"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Family of 2, interested in local animals and active tours. Prefers morning schedules.",
            "hotel_id": "hotel_nayara",
            "hotel_name": "Nayara Bocas del Toro"
        },
        {
            "_id": "g2",
            "name": "Sarah Connor",
            "phone": "+507-6222-3333",
            "preferences": ["wildlife", "culture", "food"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Traveling solo. Passionate about local recipes, rainforest flora/fauna, and sustainability.",
            "hotel_id": "hotel_lacoralina",
            "hotel_name": "La Coralina Island House"
        },
        {
            "_id": "g3",
            "name": "Liam Neeson",
            "phone": "+507-6333-4444",
            "preferences": ["relaxation", "indoor"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Requires peaceful surroundings. Interested in wellness treatments, spa days, and private settings.",
            "hotel_id": "hotel_sweetbocas",
            "hotel_name": "Sweet Bocas"
        },
        {
            "_id": "g4",
            "name": "Bruce Wayne",
            "phone": "+507-6444-5555",
            "preferences": ["relaxation", "indoor"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "VIP guest. Requires extreme privacy and discretion. Arriving via private heli/yacht.",
            "hotel_id": "hotel_bocasvillas",
            "hotel_name": "Bocas Luxury Villas"
        },
        {
            "_id": "g5",
            "name": "Indiana Jones",
            "phone": "+507-6555-6666",
            "preferences": ["adventure", "wildlife"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Interested in deep jungle treks, archaeological history, and indigenous flora/fauna.",
            "hotel_id": "hotel_redfrog",
            "hotel_name": "Red Frog Beach Resort"
        },
        {
            "_id": "g6",
            "name": "Lara Croft",
            "phone": "+507-6666-7777",
            "preferences": ["adventure"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Extremely active explorer. Interested in ziplines, reef snorkeling, and boat-based expeditions.",
            "hotel_id": "hotel_nayara",
            "hotel_name": "Nayara Bocas del Toro"
        },
        {
            "_id": "g7",
            "name": "Tony Stark",
            "phone": "+507-6777-8888",
            "preferences": ["relaxation", "food"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Inquires about exclusive dining, private overwater massage tables, and high-end botanical spa oils.",
            "hotel_id": "hotel_sweetbocas",
            "hotel_name": "Sweet Bocas"
        },
        {
            "_id": "g8",
            "name": "Hermione Granger",
            "phone": "+507-6888-9999",
            "preferences": ["culture", "wildlife"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Traveling for ecological research. Fascinated by local marine life and cacao botany.",
            "hotel_id": "hotel_lacoralina",
            "hotel_name": "La Coralina Island House"
        },
        {
            "_id": "g9",
            "name": "James Bond",
            "phone": "+507-6999-0000",
            "preferences": ["relaxation", "food"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Prefers premium seaside terraces, sunset cocktails, and high-end overwater massages.",
            "hotel_id": "hotel_bocasvillas",
            "hotel_name": "Bocas Luxury Villas"
        },
        {
            "_id": "g10",
            "name": "Luke Skywalker",
            "phone": "+507-6000-1111",
            "preferences": ["wildlife", "adventure"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Traveling with family. Prefers nature hikes and marine tours with clean ocean viewpoints.",
            "hotel_id": "hotel_redfrog",
            "hotel_name": "Red Frog Beach Resort"
        }
    ]

def get_bookings_data(dates):
    return [
        # Guest 1 (Alex Mercer) Bookings
        {
            "_id": "b1",
            "guest_id": "g1",
            "tour_id": "t1", # Snorkeling
            "date": dates["d0"],
            "slot": "morning",
            "status": "confirmed",
            "price": 45.0,
            "captain_id": "cap1"
        },
        {
            "_id": "b2",
            "guest_id": "g1",
            "tour_id": "t2", # Canopy Zipline
            "date": dates["d1"],
            "slot": "afternoon",
            "status": "confirmed",
            "price": 65.0,
            "captain_id": "cap2"
        },
        # Guest 2 (Sarah Connor) Bookings
        {
            "_id": "b3",
            "guest_id": "g2",
            "tour_id": "t3", # Rainforest Guided Hike
            "date": dates["d0"],
            "slot": "morning",
            "status": "confirmed",
            "price": 30.0,
            "captain_id": "cap3"
        },
        {
            "_id": "b4",
            "guest_id": "g2",
            "tour_id": "t5", # Afro-Caribbean Cooking Masterclass
            "date": dates["d1"],
            "slot": "afternoon",
            "status": "confirmed",
            "price": 40.0,
            "captain_id": None
        },
        # Guest 3 (Liam Neeson) Bookings
        {
            "_id": "b5",
            "guest_id": "g3",
            "tour_id": "t6", # Carenero Island Spa & Massage
            "date": dates["d0"],
            "slot": "morning",
            "status": "confirmed",
            "price": 75.0,
            "captain_id": None
        },
        # Guest 4 (Bruce Wayne) Bookings
        {
            "_id": "b6",
            "guest_id": "g4",
            "tour_id": "t6", # Carenero Island Spa & Massage
            "date": dates["d1"],
            "slot": "afternoon",
            "status": "confirmed",
            "price": 75.0,
            "captain_id": None
        },
        # Guest 5 (Indiana Jones) Bookings
        {
            "_id": "b7",
            "guest_id": "g5",
            "tour_id": "t3", # Rainforest Hike
            "date": dates["d0"],
            "slot": "morning",
            "status": "confirmed",
            "price": 30.0,
            "captain_id": None
        },
        # Guest 6 (Lara Croft) Bookings
        {
            "_id": "b8",
            "guest_id": "g6",
            "tour_id": "t2", # Canopy Zipline
            "date": dates["d1"],
            "slot": "morning",
            "status": "confirmed",
            "price": 65.0,
            "captain_id": "cap2"
        },
        # Guest 7 (Tony Stark) Bookings
        {
            "_id": "b9",
            "guest_id": "g7",
            "tour_id": "t4", # Chocolate Workshop
            "date": dates["d0"],
            "slot": "afternoon",
            "status": "confirmed",
            "price": 40.0,
            "captain_id": None
        },
        # Guest 8 (Hermione Granger) Bookings
        {
            "_id": "b10",
            "guest_id": "g8",
            "tour_id": "t5", # Cooking Masterclass
            "date": dates["d1"],
            "slot": "morning",
            "status": "confirmed",
            "price": 40.0,
            "captain_id": None
        },
        # Guest 9 (James Bond) Bookings
        {
            "_id": "b11",
            "guest_id": "g9",
            "tour_id": "t6", # Overwater Spa & Massage
            "date": dates["d0"],
            "slot": "afternoon",
            "status": "confirmed",
            "price": 75.0,
            "captain_id": None
        },
        # Guest 10 (Luke Skywalker) Bookings
        {
            "_id": "b12",
            "guest_id": "g10",
            "tour_id": "t1", # Reef Snorkeling
            "date": dates["d0"],
            "slot": "morning",
            "status": "confirmed",
            "price": 45.0,
            "captain_id": "cap1"
        }
    ]

def get_logistics_data(dates):
    return [
        {"_id": "l_30", "date": dates["d0"], "weather": "Sunny", "alert": "none", "wave_height": 0.6, "wave_status": "safe"},
        {"_id": "l_31", "date": dates["d1"], "weather": "Sunny", "alert": "none", "wave_height": 0.6, "wave_status": "safe"},
        {"_id": "l_01", "date": dates["d2"], "weather": "Sunny", "alert": "none", "wave_height": 0.6, "wave_status": "safe"},
        {"_id": "l_02", "date": dates["d3"], "weather": "Sunny", "alert": "none", "wave_height": 0.6, "wave_status": "safe"}
    ]

def get_tenants_data():
    return [
        {
            "_id": "hotel_nayara",
            "name": "Nayara Bocas del Toro",
            "primary_color": "hsl(188, 86%, 38%)",
            "primary_glow": "rgba(15, 186, 211, 0.12)",
            "font": "Inter, system-ui, sans-serif",
            "welcome_message": "Your luxury overwater villa experience begins now. Pura vida!",
            "logo_url": None,
            "theme": "theme-ocean"
        },
        {
            "_id": "hotel_lacoralina",
            "name": "La Coralina Island House",
            "primary_color": "hsl(45, 60%, 55%)",
            "primary_glow": "rgba(212, 175, 55, 0.12)",
            "font": "var(--font-serif), Georgia, serif",
            "welcome_message": "Welcome to your Balinese wellness sanctuary in the Caribbean. Pura vida!",
            "logo_url": None,
            "theme": "theme-wellness"
        },
        {
            "_id": "hotel_sweetbocas",
            "name": "Sweet Bocas",
            "primary_color": "hsl(330, 75%, 45%)",
            "primary_glow": "rgba(219, 39, 119, 0.12)",
            "font": "Outfit, Poppins, system-ui, sans-serif",
            "welcome_message": "Step into absolute, sustainable luxury on our private island estate. Respect!",
            "logo_url": None,
            "theme": "theme-hibiscus"
        },
        {
            "_id": "hotel_bocasvillas",
            "name": "Bocas Luxury Villas",
            "primary_color": "hsl(150, 65%, 35%)",
            "primary_glow": "rgba(34, 197, 94, 0.12)",
            "font": "Roboto, system-ui, sans-serif",
            "welcome_message": "Your boutique cliffside eco-villa retreat is ready, my friend. No stress!",
            "logo_url": None,
            "theme": "theme-forest"
        },
        {
            "_id": "hotel_redfrog",
            "name": "Red Frog Beach Resort",
            "primary_color": "hsl(15, 85%, 50%)",
            "primary_glow": "rgba(249, 115, 22, 0.12)",
            "font": "Poppins, Inter, system-ui, sans-serif",
            "welcome_message": "Welcome to our vibrant beachfront jungle playground. Pura vida!",
            "logo_url": None,
            "theme": "theme-volcano"
        }
    ]

def get_captains_data():
    return [
        {"_id": "cap1", "name": "Captain Luis", "phone": "+507-6655-1234", "boat": "La Estrella", "capacity": 8, "status": "available"},
        {"_id": "cap2", "name": "Captain Marco", "phone": "+507-6655-5678", "boat": "Isla Bonita", "capacity": 12, "status": "available"},
        {"_id": "cap3", "name": "Captain Rosa", "phone": "+507-6655-9012", "boat": "Coral Queen", "capacity": 6, "status": "available"}
    ]

def seed_db():
    current_db, is_real = get_db()
    
    tours_coll = current_db["tours"]
    guests_coll = current_db["guests"]
    bookings_coll = current_db["bookings"]
    logistics_coll = current_db["logistics"]
    tenants_coll = current_db["tenants"]
    captains_coll = current_db["captains"]
    
    # Check if existing seeded dates are in the past
    stale = False
    existing_log = logistics_coll.find_one({})
    today_bocas = get_bocas_today()
    if existing_log:
        try:
            log_date = datetime.datetime.strptime(existing_log["date"], "%Y-%m-%d").date()
            if log_date != today_bocas:
                stale = True
                logger.info(f"Database dates do not match today (found {existing_log['date']}, today is {today_bocas}). Cleared for dynamic shift.")
        except Exception:
            stale = True
    else:
        stale = True

    if stale:
        logger.info("Database empty or stale. Seeding dynamic Bocas del Toro concierge data relative to today...")
        # Clear existing dynamic data
        tours_coll.delete_many({})
        guests_coll.delete_many({})
        bookings_coll.delete_many({})
        logistics_coll.delete_many({})
        
        dates = get_dynamic_dates()
        
        # Seed Tours
        for tour in get_tours_data(dates):
            tours_coll.insert_one(tour)
            
        # Seed Guests
        for guest in get_guests_data(dates):
            guests_coll.insert_one(guest)
            
        # Seed Bookings
        for booking in get_bookings_data(dates):
            bookings_coll.insert_one(booking)
            
        # Seed Logistics
        for log in get_logistics_data(dates):
            logistics_coll.insert_one(log)
            
        # Seed Tenants (Branding)
        for tenant in get_tenants_data():
            tenants_coll.replace_one({"_id": tenant["_id"]}, tenant, upsert=True)
            
        # Seed Captains
        for captain in get_captains_data():
            captains_coll.replace_one({"_id": captain["_id"]}, captain, upsert=True)
            
        logger.info("Successfully seeded database collections with current real-world dates.")
    else:
        logger.info("Database is already seeded with current real-world dates. Ensuring defaults exist...")
        dates = get_dynamic_dates()
        for tour in get_tours_data(dates):
            if tours_coll.count_documents({"_id": tour["_id"]}) == 0:
                tours_coll.insert_one(tour)
                logger.info(f"Inserted missing tour: {tour['name']} ({tour['_id']})")
                
        # Ensure captains collection exists and is seeded
        for captain in get_captains_data():
            captains_coll.replace_one({"_id": captain["_id"]}, captain, upsert=True)
                
    # Always ensure default tenants are up-to-date with latest color, font, logo_url
    for tenant in get_tenants_data():
        tenants_coll.replace_one({"_id": tenant["_id"]}, tenant, upsert=True)
    logger.info("Synchronized and verified all default tenant brand settings in database.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_db()
