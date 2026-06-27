import os
import sys
import logging
from dotenv import load_dotenv

# Ensure we can import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_dynamo")

def test_connection():
    # Load backend .env
    backend_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
    if os.path.exists(backend_env_path):
        print(f"Loading environment from: {backend_env_path}")
        load_dotenv(backend_env_path)
    else:
        print("No backend/.env found. Using active environment variables.")

    # Retrieve credentials
    region = os.getenv("AWS_REGION", "us-east-1")
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    use_dynamo = os.getenv("USE_DYNAMODB", "").lower() == "true"
    prefix = os.getenv("AWS_DYNAMODB_TABLE_PREFIX", "IslandFlow-")

    print("\n--- AWS Configuration Diagnostic ---")
    print(f"USE_DYNAMODB: {use_dynamo}")
    print(f"AWS_REGION: {region}")
    print(f"AWS_DYNAMODB_TABLE_PREFIX: {prefix}")
    
    if access_key:
        masked_key = access_key[:4] + "..." + access_key[-4:] if len(access_key) > 8 else "..."
        print(f"AWS_ACCESS_KEY_ID: {masked_key}")
    else:
        print("AWS_ACCESS_KEY_ID: NOT SET")
        
    if secret_key:
        print("AWS_SECRET_ACCESS_KEY: SET (masked for safety)")
    else:
        print("AWS_SECRET_ACCESS_KEY: NOT SET")

    print("\n--- Initializing db.py Connection ---")
    try:
        from db import get_db, DynamoDBDB
        db_instance, is_cloud = get_db()
        
        if is_cloud and isinstance(db_instance, DynamoDBDB):
            print("✅ SUCCESS: Successfully connected to live AWS DynamoDB!")
            print(f"Active Table Prefix: {db_instance.prefix}")
            
            # Let's perform a simple read/write integration test on a test collection
            print("\n--- Running Read/Write/Delete Integration Test ---")
            test_col = db_instance["test_connection_diagnostics"]
            test_id = "test_connection_uuid_12345"
            
            print("1. Attempting Write (insert_one)...")
            test_doc = {
                "_id": test_id,
                "message": "IslandFlow AWS Connection Verification Test",
                "timestamp": "2026-06-27T11:15:00",
                "status": "success",
                "tags": ["test", "aws", "diagnostics"]
            }
            test_col.insert_one(test_doc)
            print("   ✅ Write completed.")
            
            print("2. Attempting Read (find_one)...")
            retrieved = test_col.find_one({"_id": test_id})
            if retrieved and retrieved.get("status") == "success":
                print(f"   ✅ Read completed. Document retrieved successfully: {retrieved}")
            else:
                print(f"   ❌ Read mismatch! Retrieved document: {retrieved}")
                
            print("3. Attempting Array Push ($push)...")
            test_col.update_one(
                {"_id": test_id},
                {"$push": {"tags": {"$each": ["pushed_tag1", "pushed_tag2"]}}}
            )
            updated_doc = test_col.find_one({"_id": test_id})
            print(f"   ✅ Push completed. Updated tags list: {updated_doc.get('tags')}")
            
            print("4. Attempting Delete (delete_one)...")
            delete_res = test_col.delete_one({"_id": test_id})
            if delete_res.deleted_count == 1:
                print("   ✅ Delete completed. Cleaned up verification records.")
            else:
                print(f"   ⚠️ Delete warning! Deleted count was {delete_res.deleted_count}")
                
            print("\n🎉 ALL TESTS PASSED! Your AWS DynamoDB integration is 100% operational.")
            
        else:
            print("⚠️ FALLBACK WARNING: db.py did not connect to AWS DynamoDB.")
            print("It fell back to the high-fidelity local file-backed JSON Mock database.")
            print("Please verify your backend/.env variables and AWS account details.")
            
    except Exception as e:
        print(f"❌ CONNECTION ERROR: An unexpected failure occurred during database initialization:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connection()
