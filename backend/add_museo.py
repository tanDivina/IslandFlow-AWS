import os
import datetime
from db import get_db
from mock_data import get_dynamic_dates

def main():
    db, is_real = get_db()
    tours_coll = db["tours"]
    
    dates = get_dynamic_dates()
    
    museo = {
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
    }
    
    existing = tours_coll.find_one({"_id": "t7"})
    if not existing:
        tours_coll.insert_one(museo)
        print("Successfully inserted Museo Hou Wang into the database!")
    else:
        print("Museo Hou Wang already exists in the database.")

if __name__ == "__main__":
    main()
