function toggleLanguage() {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    if (lang === 'ar') {
        document.cookie = "googtrans=/ar/en; path=/";
        localStorage.setItem('sys_lang', 'en');
    } else {
        document.cookie = "googtrans=/ar/ar; path=/";
        localStorage.setItem('sys_lang', 'ar');
    }
    window.location.reload();
}

function initTranslator() {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const btn = document.getElementById('lang-toggle-btn');
    if (btn) {
        btn.innerHTML = lang === 'ar' ? 'English 🌐' : 'العربية 🌐';
    }

    if (lang === 'en') {
        const script = document.createElement('script');
        script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        document.head.appendChild(script);
        
        window.googleTranslateElementInit = function() {
            new google.translate.TranslateElement({
                pageLanguage: 'ar', 
                includedLanguages: 'en,ar', 
                autoDisplay: false
            }, 'google_translate_element');
        };
        
        // Handle LTR specific styling dynamically
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = 'en';
        
        const style = document.createElement('style');
        style.innerHTML = `
            body { top: 0 !important; }
            .skiptranslate iframe, .goog-te-banner-frame { display: none !important; }
            .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
            
            /* Flip layout specific styles */
            .sidebar { right: auto; left: 0; border-left: none; border-right: 1px solid var(--border-color); }
            .main-content { margin-right: 0; margin-left: 280px; }
            .header-info { text-align: left; }
            .user-profile { flex-direction: row-reverse; }
            input, select, textarea { text-align: left !important; }
            
            @media (max-width: 768px) {
                .main-content { margin-left: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initTranslator();
});
