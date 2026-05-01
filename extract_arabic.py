import os
import re
import json

arabic_regex = re.compile(r'[\u0600-\u06FF]+(?:[\s\.\,\:\-\_]+[\u0600-\u06FF]+)*')

files_to_scan = [
    'templates/login.html',
    'templates/admin.html',
    'templates/reception.html',
    'templates/doctor.html',
    'templates/booking.html',
    'templates/base.html',
    'static/js/app.js'
]

found_strings = set()

for file_path in files_to_scan:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
        # We need to find Arabic strings but avoid breaking HTML. 
        # A simple approach: split by > and < to get text nodes, then extract Arabic
        # For JS, we extract string literals
        
        # Just grab any Arabic substring for now:
        matches = re.finditer(r'[\u0600-\u06FF\s]+', content)
        for match in matches:
            text = match.group(0).strip()
            if len(text) > 1:
                found_strings.add(text)

print(f"Found {len(found_strings)} unique Arabic phrases.")
with open('arabic_strings.json', 'w', encoding='utf-8') as f:
    json.dump(list(found_strings), f, ensure_ascii=False, indent=2)
