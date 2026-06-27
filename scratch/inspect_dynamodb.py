import os
import sys
import boto3

# Load backend environment
backend_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
if os.path.exists(backend_env_path):
    from dotenv import load_dotenv
    load_dotenv(backend_env_path)

def inspect_db():
    region = os.getenv("AWS_REGION", "us-east-1")
    prefix = os.getenv("AWS_DYNAMODB_TABLE_PREFIX", "IslandFlow-")
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

    if aws_access_key and aws_secret_key:
        session = boto3.Session(
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=region
        )
    else:
        session = boto3.Session(region_name=region)

    client = session.client('dynamodb')
    dynamodb = session.resource('dynamodb')

    print("=== AWS DynamoDB Inspection ===")
    print(f"Region: {region}")
    print(f"Table Prefix: '{prefix}'")

    try:
        # List all tables
        response = client.list_tables()
        table_names = response.get('TableNames', [])
        
        # Filter tables starting with our prefix
        islandflow_tables = [t for table_name in table_names if (t := table_name).startswith(prefix)]
        
        if not islandflow_tables:
            print("\n❌ No tables starting with prefix found.")
            print("To seed your database, run the backend server (`python main.py` in the backend directory).")
            return

        print(f"\nFound {len(islandflow_tables)} active database collections in AWS:")
        
        for table_name in islandflow_tables:
            table = dynamodb.Table(table_name)
            # Scan to count items
            scan_res = table.scan()
            items = scan_res.get('Items', [])
            item_count = len(items)
            
            clean_name = table_name.replace(prefix, "")
            print(f"\n📂 Collection: {clean_name} ({table_name})")
            print(f"   └─ Item Count: {item_count}")
            
            # Print specific previews depending on table
            if clean_name == "guests" and item_count > 0:
                print("   └─ Active Guests:")
                for item in items[:5]:
                    name = item.get("name")
                    room = item.get("room", "Unknown")
                    hotel = item.get("hotel_name", "Unknown Resort")
                    print(f"      • Guest: {name} (ID: {item.get('_id')}) | Room: {room} | Property: {hotel}")
                    
            elif clean_name == "tenants" and item_count > 0:
                print("   └─ Configured Resort Properties (Tenants):")
                for item in items:
                    print(f"      • {item.get('name')} (ID: {item.get('_id')}) | Prefix: {item.get('prefix')}")
                    
            elif clean_name == "tours" and item_count > 0:
                print("   └─ Available Island Tours (Sample):")
                for item in items[:3]:
                    t_type = item.get("type", "outdoor").upper()
                    print(f"      • [{t_type}] {item.get('name')} | Price: ${item.get('price')}")
                    
            elif clean_name == "bookings" and item_count > 0:
                print("   └─ Active Bookings (Sample):")
                for item in items[:3]:
                    print(f"      • Booking ID: {item.get('_id')} | Guest ID: {item.get('guest_id')} | Date: {item.get('date')} | Slot: {item.get('slot')}")

            elif clean_name == "logistics" and item_count > 0:
                print("   └─ Weather Logistics Days:")
                for item in items:
                    print(f"      • Date: {item.get('date')} | Weather: {item.get('weather')} | Wave Height: {item.get('wave_height', 0.0)}m")

    except Exception as e:
        print(f"❌ Failed to inspect DynamoDB: {e}")

if __name__ == "__main__":
    inspect_db()
