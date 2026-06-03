document.addEventListener('DOMContentLoaded', () => {
    const THEME_KEY = 'coto-theme';
    const DARK_LOGO = '/static/Logo%20mode%20gelap.PNG';
    const LIGHT_LOGO = '/static/Logo%20mode%20terang.PNG';

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const logoImg = document.querySelector('.coto-logo');
    const pageTransitionOverlay = document.getElementById('pageTransitionOverlay');

    function getInitialTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'dark' || saved === 'light') return saved;

        return window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    function updateLogoForTheme(theme) {
        if (!logoImg) return;
        logoImg.src = theme === 'dark' ? DARK_LOGO : LIGHT_LOGO;
    }

    function applyTheme(theme, shouldSave = true) {
        document.documentElement.setAttribute('data-theme', theme);
        updateLogoForTheme(theme);

        if (shouldSave) {
            localStorage.setItem(THEME_KEY, theme);
        }
    }

    function setTransitionOriginFromElement(overlay, element) {
        if (!overlay || !element) return;
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        overlay.style.setProperty('--transition-x', `${x}px`);
        overlay.style.setProperty('--transition-y', `${y}px`);
    }

    applyTheme(getInitialTheme(), false);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || getInitialTheme();
            applyTheme(current === 'dark' ? 'light' : 'dark', true);
        });
    }

    document.querySelectorAll('.route-transition-link').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();

            const target = link.getAttribute('data-route-target') || link.getAttribute('href') || '/';
            const reducedMotion = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!pageTransitionOverlay || reducedMotion) {
                window.location.href = target;
                return;
            }

            setTransitionOriginFromElement(pageTransitionOverlay, link);
            pageTransitionOverlay.classList.add('active');

            setTimeout(() => {
                window.location.href = target;
            }, 520);
        });
    });
});
