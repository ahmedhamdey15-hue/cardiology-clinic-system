import json
import urllib.request
from app import app
from backend.extensions import db
from backend.models import Medicine

def import_drugs():
    url = "https://raw.githubusercontent.com/karem505/egyptian-drug-database/master/data/egyptian-drugs.json"
    print(f"Downloading Egyptian drugs database from {url}...")
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
    
    print(f"Downloaded {len(data)} drugs. Importing to database...")
    
    with app.app_context():
        added_count = 0
        existing_count = 0
        
        # To avoid querying the DB for every single drug, let's load existing names
        existing_names = set(m.name for m in Medicine.query.all())
        
        medicines_to_add = []
        for item in data:
            name = item.get("commercial_name_en")
            if not name:
                continue
                
            if name in existing_names:
                existing_count += 1
                continue
            
            scientific = item.get("scientific_name", "")
            manufacturer = item.get("manufacturer", "")
            route = item.get("route", "")
            price = item.get("price_egp", "")
            
            notes = f"المادة الفعالة: {scientific}\nالشركة: {manufacturer}\nالسعر: {price} ج.م"
            
            m = Medicine(
                name=name,
                dosage_form=route,
                strength="",
                instructions=item.get("drug_class", ""),
                notes=notes
            )
            medicines_to_add.append(m)
            existing_names.add(name)
            
            # Batch insert to save memory and time
            if len(medicines_to_add) >= 1000:
                db.session.bulk_save_objects(medicines_to_add)
                db.session.commit()
                added_count += len(medicines_to_add)
                print(f"Imported {added_count} drugs...")
                medicines_to_add = []
        
        if medicines_to_add:
            db.session.bulk_save_objects(medicines_to_add)
            db.session.commit()
            added_count += len(medicines_to_add)
            
        print(f"Import complete! Added {added_count} new drugs. Skipped {existing_count} existing drugs.")

if __name__ == "__main__":
    import_drugs()
