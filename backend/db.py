import os
import json
import logging
from dotenv import load_dotenv
import boto3
from decimal import Decimal
import uuid


load_dotenv()
load_dotenv("backend/.env")

# Helper functions for DynamoDB float/Decimal conversion
def convert_float_to_decimal(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_float_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_float_to_decimal(x) for x in obj]
    return obj

def convert_decimal_to_float(obj):
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimal_to_float(x) for x in obj]
    return obj


logger = logging.getLogger("db_layer")

class MockCollection:
    def __init__(self, db_path, collection_name):
        self.db_path = db_path
        self.collection_name = collection_name

    def _read_data(self):
        if not os.path.exists(self.db_path):
            return {}
        try:
            with open(self.db_path, 'r') as f:
                return json.load(f)
        except Exception:
            return {}

    def _write_data(self, data):
        try:
            with open(self.db_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write mock db: {e}")

    def find(self, query=None, sort=None, *args, **kwargs):
        query = query or {}
        db_data = self._read_data()
        items = db_data.get(self.collection_name, [])
        results = []
        for item in items:
            match = True
            for k, v in query.items():
                if k == "$or":
                    or_match = False
                    for cond in v:
                        cond_match = True
                        for ck, cv in cond.items():
                            if item.get(ck) != cv:
                                cond_match = False
                                break
                        if cond_match:
                            or_match = True
                            break
                    if not or_match:
                        match = False
                        break
                elif item.get(k) != v:
                    match = False
                    break
            if match:
                results.append(item)

        if sort:
            if isinstance(sort, tuple):
                sort_keys = [sort]
            elif isinstance(sort, list):
                sort_keys = sort
            else:
                sort_keys = [(sort, 1)]

            for key, direction in reversed(sort_keys):
                reverse = (direction == -1)
                results.sort(key=lambda x: x.get(key, ""), reverse=reverse)

        return results

    def find_one(self, query=None, sort=None, *args, **kwargs):
        results = self.find(query, sort=sort, *args, **kwargs)
        return results[0] if results else None

    def insert_one(self, document):
        db_data = self._read_data()
        if self.collection_name not in db_data:
            db_data[self.collection_name] = []
        
        # Ensure _id exists
        if '_id' not in document:
            document['_id'] = str(len(db_data[self.collection_name]) + 1)
        
        db_data[self.collection_name].append(document)
        self._write_data(db_data)
        
        class InsertOneResult:
            inserted_id = document['_id']
        return InsertOneResult()

    def update_one(self, query, update, upsert=False):
        db_data = self._read_data()
        items = db_data.get(self.collection_name, [])
        updated = False
        
        for item in items:
            # Check match
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            
            if match:
                # Apply updates (typically $set)
                if '$set' in update:
                    for uk, uv in update['$set'].items():
                        if '.' in uk:
                            # Handle nested keys e.g. "available_slots.2026-05-30"
                            parts = uk.split('.')
                            curr = item
                            for p in parts[:-1]:
                                curr = curr.setdefault(p, {})
                            curr[parts[-1]] = uv
                        else:
                            item[uk] = uv
                elif '$push' in update:
                    for uk, uv in update['$push'].items():
                        target_list = item.setdefault(uk, [])
                        if not isinstance(target_list, list):
                            target_list = []
                            item[uk] = target_list
                        if isinstance(uv, dict) and '$each' in uv:
                            target_list.extend(uv['$each'])
                        else:
                            target_list.append(uv)
                else:
                    for uk, uv in update.items():
                        if '.' in uk:
                            parts = uk.split('.')
                            curr = item
                            for p in parts[:-1]:
                                curr = curr.setdefault(p, {})
                            curr[parts[-1]] = uv
                        else:
                            item[uk] = uv
                updated = True
                break
                
        if updated:
            db_data[self.collection_name] = items
            self._write_data(db_data)
        elif upsert:
            # build a new document
            new_doc = {}
            for k, v in query.items():
                new_doc[k] = v
            if "_id" not in new_doc:
                new_doc["_id"] = query.get("_id") or str(len(items) + 1)
            
            if '$set' in update:
                for uk, uv in update['$set'].items():
                    if '.' in uk:
                        parts = uk.split('.')
                        curr = new_doc
                        for p in parts[:-1]:
                            curr = curr.setdefault(p, {})
                        curr[parts[-1]] = uv
                    else:
                        new_doc[uk] = uv
            else:
                for uk, uv in update.items():
                    if not uk.startswith('$'):
                        new_doc[uk] = uv
            
            items.append(new_doc)
            db_data[self.collection_name] = items
            self._write_data(db_data)
            updated = True
            
        class UpdateResult:
            matched_count = 1 if (updated and not upsert) else 0
            modified_count = 1 if updated else 0
        return UpdateResult()

    def replace_one(self, query, replacement, upsert=False):
        db_data = self._read_data()
        items = db_data.get(self.collection_name, [])
        replaced = False
        
        for idx, item in enumerate(items):
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                if '_id' not in replacement and '_id' in item:
                    replacement['_id'] = item['_id']
                items[idx] = replacement
                replaced = True
                break
                
        if not replaced and upsert:
            if '_id' not in replacement:
                if '_id' in query:
                    replacement['_id'] = query['_id']
                else:
                    replacement['_id'] = str(len(items) + 1)
            items.append(replacement)
            replaced = True
            
        if replaced:
            db_data[self.collection_name] = items
            self._write_data(db_data)
            
        class ReplaceResult:
            matched_count = 1 if replaced else 0
            modified_count = 1 if replaced else 0
            upserted_id = replacement.get('_id') if (not replaced and upsert) else None
        return ReplaceResult()

    def delete_one(self, query):
        db_data = self._read_data()
        items = db_data.get(self.collection_name, [])
        new_items = []
        deleted = False
        
        for item in items:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match and not deleted:
                deleted = True
            else:
                new_items.append(item)
                
        if deleted:
            db_data[self.collection_name] = new_items
            self._write_data(db_data)
            
        class DeleteResult:
            deleted_count = 1 if deleted else 0
        return DeleteResult()

    def delete_many(self, query):
        db_data = self._read_data()
        items = db_data.get(self.collection_name, [])
        new_items = []
        deleted_count = 0
        
        for item in items:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                deleted_count += 1
            else:
                new_items.append(item)
                
        if deleted_count > 0:
            db_data[self.collection_name] = new_items
            self._write_data(db_data)
            
        class DeleteResult:
            pass
        res = DeleteResult()
        res.deleted_count = deleted_count
        return res

    def count_documents(self, query=None):
        return len(self.find(query))

class DynamoDBCollection:
    def __init__(self, table_name, collection_name, dynamodb_resource):
        self.table_name = table_name
        self.collection_name = collection_name
        self.dynamodb = dynamodb_resource
        self.table = self._get_or_create_table()

    def _get_or_create_table(self):
        try:
            table = self.dynamodb.Table(self.table_name)
            table.load()
            return table
        except self.dynamodb.meta.client.exceptions.ResourceNotFoundException:
            logger.info(f"Creating DynamoDB table: {self.table_name}")
            table = self.dynamodb.create_table(
                TableName=self.table_name,
                KeySchema=[
                    {'AttributeName': '_id', 'KeyType': 'HASH'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': '_id', 'AttributeType': 'S'}
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            table.meta.client.get_waiter('table_exists').wait(TableName=self.table_name)
            logger.info(f"DynamoDB table {self.table_name} created successfully.")
            return table
        except Exception as e:
            logger.error(f"Error connecting to DynamoDB table {self.table_name}: {e}")
            raise e

    def _get_all_items(self):
        try:
            response = self.table.scan()
            items = response.get('Items', [])
            while 'LastEvaluatedKey' in response:
                response = self.table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
                items.extend(response.get('Items', []))
            return convert_decimal_to_float(items)
        except Exception as e:
            logger.error(f"Error scanning DynamoDB table {self.table_name}: {e}")
            return []

    def find(self, query=None, sort=None, *args, **kwargs):
        query = query or {}
        items = self._get_all_items()
        results = []
        for item in items:
            match = True
            for k, v in query.items():
                if k == "$or":
                    or_match = False
                    for cond in v:
                        cond_match = True
                        for ck, cv in cond.items():
                            if item.get(ck) != cv:
                                cond_match = False
                                break
                        if cond_match:
                            or_match = True
                            break
                    if not or_match:
                        match = False
                        break
                elif item.get(k) != v:
                    match = False
                    break
            if match:
                results.append(item)

        if sort:
            if isinstance(sort, tuple):
                sort_keys = [sort]
            elif isinstance(sort, list):
                sort_keys = sort
            else:
                sort_keys = [(sort, 1)]

            for key, direction in reversed(sort_keys):
                reverse = (direction == -1)
                results.sort(key=lambda x: x.get(key, ""), reverse=reverse)

        return results

    def find_one(self, query=None, sort=None, *args, **kwargs):
        results = self.find(query, sort=sort, *args, **kwargs)
        return results[0] if results else None

    def insert_one(self, document):
        if '_id' not in document:
            document['_id'] = str(uuid.uuid4())
        
        item = convert_float_to_decimal(document)
        try:
            self.table.put_item(Item=item)
        except Exception as e:
            logger.error(f"Error inserting item into DynamoDB table {self.table_name}: {e}")
            raise e

        class InsertOneResult:
            inserted_id = document['_id']
        return InsertOneResult()

    def update_one(self, query, update, upsert=False):
        doc = self.find_one(query)
        if not doc:
            if upsert:
                new_doc = {}
                for k, v in query.items():
                    new_doc[k] = v
                if "_id" not in new_doc:
                    new_doc["_id"] = query.get("_id") or str(uuid.uuid4())
                
                if '$set' in update:
                    for uk, uv in update['$set'].items():
                        if '.' in uk:
                            parts = uk.split('.')
                            curr = new_doc
                            for p in parts[:-1]:
                                curr = curr.setdefault(p, {})
                            curr[parts[-1]] = uv
                        else:
                            new_doc[uk] = uv
                else:
                    for uk, uv in update.items():
                        if not uk.startswith('$'):
                            new_doc[uk] = uv
                
                self.insert_one(new_doc)
                class UpdateResult:
                    matched_count = 0
                    modified_count = 1
                return UpdateResult()
            else:
                class UpdateResult:
                    matched_count = 0
                    modified_count = 0
                return UpdateResult()

        updated = False
        if '$set' in update:
            for uk, uv in update['$set'].items():
                if '.' in uk:
                    parts = uk.split('.')
                    curr = doc
                    for p in parts[:-1]:
                        curr = curr.setdefault(p, {})
                    curr[parts[-1]] = uv
                else:
                    doc[uk] = uv
            updated = True
        elif '$push' in update:
            for uk, uv in update['$push'].items():
                target_list = doc.setdefault(uk, [])
                if not isinstance(target_list, list):
                    target_list = []
                    doc[uk] = target_list
                if isinstance(uv, dict) and '$each' in uv:
                    target_list.extend(uv['$each'])
                else:
                    target_list.append(uv)
            updated = True
        else:
            for uk, uv in update.items():
                if '.' in uk:
                    parts = uk.split('.')
                    curr = doc
                    for p in parts[:-1]:
                        curr = curr.setdefault(p, {})
                    curr[parts[-1]] = uv
                else:
                    doc[uk] = uv
            updated = True

        if updated:
            item = convert_float_to_decimal(doc)
            try:
                self.table.put_item(Item=item)
            except Exception as e:
                logger.error(f"Error updating item in DynamoDB table {self.table_name}: {e}")
                raise e

        class UpdateResult:
            matched_count = 1
            modified_count = 1 if updated else 0
        return UpdateResult()

    def update_many(self, query, update):
        docs = self.find(query)
        modified_count = 0
        for doc in docs:
            updated = False
            if '$set' in update:
                for uk, uv in update['$set'].items():
                    if '.' in uk:
                        parts = uk.split('.')
                        curr = doc
                        for p in parts[:-1]:
                            curr = curr.setdefault(p, {})
                        curr[parts[-1]] = uv
                    else:
                        doc[uk] = uv
                updated = True
            elif '$push' in update:
                for uk, uv in update['$push'].items():
                    target_list = doc.setdefault(uk, [])
                    if not isinstance(target_list, list):
                        target_list = []
                        doc[uk] = target_list
                    if isinstance(uv, dict) and '$each' in uv:
                        target_list.extend(uv['$each'])
                    else:
                        target_list.append(uv)
                updated = True
            else:
                for uk, uv in update.items():
                    if '.' in uk:
                        parts = uk.split('.')
                        curr = doc
                        for p in parts[:-1]:
                            curr = curr.setdefault(p, {})
                        curr[parts[-1]] = uv
                    else:
                        doc[uk] = uv
                updated = True

            if updated:
                item = convert_float_to_decimal(doc)
                try:
                    self.table.put_item(Item=item)
                    modified_count += 1
                except Exception as e:
                    logger.error(f"Error updating item in DynamoDB table {self.table_name}: {e}")
                    raise e

        class UpdateResult:
            def __init__(self, matched, modified):
                self.matched_count = matched
                self.modified_count = modified
        return UpdateResult(len(docs), modified_count)

    def replace_one(self, query, replacement, upsert=False):
        doc = self.find_one(query)
        replaced = False
        if doc:
            if '_id' not in replacement and '_id' in doc:
                replacement['_id'] = doc['_id']
            replaced = True
        elif upsert:
            if '_id' not in replacement:
                if '_id' in query:
                    replacement['_id'] = query['_id']
                else:
                    replacement['_id'] = str(uuid.uuid4())
            replaced = True

        if replaced:
            item = convert_float_to_decimal(replacement)
            try:
                self.table.put_item(Item=item)
            except Exception as e:
                logger.error(f"Error replacing item in DynamoDB table {self.table_name}: {e}")
                raise e

        class ReplaceResult:
            matched_count = 1 if doc else 0
            modified_count = 1 if replaced else 0
            upserted_id = replacement.get('_id') if (not doc and upsert) else None
        return ReplaceResult()

    def delete_one(self, query):
        doc = self.find_one(query)
        deleted = False
        if doc:
            try:
                self.table.delete_item(Key={'_id': doc['_id']})
                deleted = True
            except Exception as e:
                logger.error(f"Error deleting item from DynamoDB table {self.table_name}: {e}")
                raise e

        class DeleteResult:
            deleted_count = 1 if deleted else 0
        return DeleteResult()

    def delete_many(self, query):
        docs = self.find(query)
        deleted_count = 0
        for doc in docs:
            try:
                self.table.delete_item(Key={'_id': doc['_id']})
                deleted_count += 1
            except Exception as e:
                logger.error(f"Error deleting item from DynamoDB table {self.table_name}: {e}")
                raise e

        class DeleteResult:
            pass
        res = DeleteResult()
        res.deleted_count = deleted_count
        return res

    def count_documents(self, query=None):
        return len(self.find(query))

class DynamoDBDB:
    def __init__(self, prefix, resource):
        self.prefix = prefix
        self.resource = resource
        self.collections = {}

    def __getitem__(self, name):
        if name not in self.collections:
            table_name = f"{self.prefix}{name}"
            self.collections[name] = DynamoDBCollection(table_name, name, self.resource)
        return self.collections[name]

class MockDB:
    def __init__(self, db_path):
        self.db_path = db_path

    def __getitem__(self, name):
        return MockCollection(self.db_path, name)

def check_aws_credentials():
    try:
        session = boto3.Session()
        credentials = session.get_credentials()
        return credentials is not None
    except Exception:
        return False

# Database Selector
def get_db():
    use_dynamo = os.getenv("USE_DYNAMODB", "").lower() == "true"
    if use_dynamo or check_aws_credentials():
        try:
            logger.info("Initializing AWS DynamoDB connection...")
            region = os.getenv("AWS_REGION", "us-east-1")
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
                
            dynamodb = session.resource('dynamodb')
            prefix = os.getenv("AWS_DYNAMODB_TABLE_PREFIX", "IslandFlow-")
            client = session.client('dynamodb')
            client.list_tables()
            logger.info(f"Successfully connected to AWS DynamoDB with prefix '{prefix}'.")
            return DynamoDBDB(prefix, dynamodb), True
        except Exception as e:
            logger.warning(f"Failed to connect to AWS DynamoDB: {e}. Falling back to high-fidelity JSON Mock DB.")

    logger.info("Falling back to high-fidelity JSON Mock DB.")
    return MockDB("mock_db.json"), False

_db_instance = None
_is_real_dynamo_instance = None

def _lazy_init():
    global _db_instance, _is_real_dynamo_instance
    if _db_instance is None:
        _db_instance, _is_real_dynamo_instance = get_db()

class LazyDBProxy:
    def __getitem__(self, name):
        _lazy_init()
        return _db_instance[name]

    def __getattr__(self, name):
        _lazy_init()
        return getattr(_db_instance, name)

    @property
    def is_real_dynamo(self):
        _lazy_init()
        return _is_real_dynamo_instance

db = LazyDBProxy()

def get_bocas_today():
    import datetime
    # Panama Caribbean (Bocas del Toro) is always GMT-5
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    panama_tz = datetime.timezone(datetime.timedelta(hours=-5))
    return utc_now.astimezone(panama_tz).date()


