import os
import sys
from dotenv import load_dotenv

load_dotenv("backend/.env")
sys.path.append("backend")
from db import db

def inspect():
    docs = list(db["logistics"].find({}))
    print(f"Found {len(docs)} logistics documents:")
    for d in docs:
        print(d)

if __name__ == "__main__":
    inspect()
