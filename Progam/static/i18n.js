(function () {
    const LANG_KEY = 'coto-lang';

    function getInitialLanguage() {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved === 'id' || saved === 'en') return saved;
        return 'id';
    }

    function applyLanguage(lang) {
        const safeLang = lang === 'en' ? 'en' : 'id';
        document.documentElement.lang = safeLang;
        localStorage.setItem(LANG_KEY, safeLang);

        document.querySelectorAll('[data-i18n-id][data-i18n-en]').forEach(element => {
            const value = element.getAttribute(`data-i18n-${safeLang}`);
            if (!value) return;

            if (element.matches('input, textarea')) {
                element.value = value;
            } else {
                element.textContent = value;
            }
        });

        document.querySelectorAll('[data-i18n-title-id][data-i18n-title-en]').forEach(element => {
            const value = element.getAttribute(`data-i18n-title-${safeLang}`);
            if (value) element.setAttribute('title', value);
        });

        document.querySelectorAll('[data-lang-target]').forEach(button => {
            const isActive = button.getAttribute('data-lang-target') === safeLang;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    function bindLanguageSwitcher() {
        applyLanguage(getInitialLanguage());

        document.querySelectorAll('[data-lang-target]').forEach(button => {
            button.addEventListener('click', () => {
                applyLanguage(button.getAttribute('data-lang-target'));
            });
        });
    }

    function getActiveLanguage() {
        return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'id';
    }

    function t(idText, enText) {
        return getActiveLanguage() === 'en' ? enText : idText;
    }

    window.CotoI18n = {
        getInitialLanguage,
        applyLanguage,
        bindLanguageSwitcher,
        getActiveLanguage,
        t
    };

    document.addEventListener('DOMContentLoaded', bindLanguageSwitcher);
})();
