import glob

html_files = glob.glob('templates/*.html')

script_tag = '<script src="{{ url_for(\'static\', filename=\'js/translate.js\') }}"></script>'
button_html = '<button id="lang-toggle-btn" onclick="toggleLanguage()" style="position:fixed; bottom:20px; right:20px; z-index:9999; background:#1e40af; color:#fff; border:none; padding:10px 20px; border-radius:30px; cursor:pointer; font-family:Tajawal, sans-serif; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.2); transition:0.3s;">English 🌐</button>\n<div id="google_translate_element" style="display:none;"></div>'

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'translate.js' in content:
        continue
        
    # Inject button after body tag (find the first > after <body)
    import re
    body_pattern = re.compile(r'(<body[^>]*>)')
    match = body_pattern.search(content)
    if match:
        content = content[:match.end()] + '\n    ' + button_html + content[match.end():]
        
    # Inject script before </body>
    content = content.replace('</body>', f'    {script_tag}\n</body>')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Injected translate script and button into all templates.")
