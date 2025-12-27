/**
 * Cookie Consent Manager
 * Handles GDPR compliance for tracking cookies
 */
(function () {
    console.log('🍪 Cookie Consent Script Loaded');
    const COOKIE_NAME = 'cookie_consent';
    const TRACKING_COOKIE = 'rpg.sid';

    // Check if user has already made a choice
    function hasConsent() {
        return document.cookie.split('; ').some(row => row.startsWith(COOKIE_NAME + '='));
    }

    // Set cookie helper
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
    }

    // Create and show banner
    function showBanner() {
        if (document.getElementById('cookie-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.className = 'cookie-banner glass-panel';
        banner.innerHTML = `
            <div class="cookie-content">
                <h3>🍪 Cookies & Confidentialité</h3>
                <p>
                    Nous utilisons un cookie pour <b>mémoriser votre choix</b> ci-dessous.
                    <br>
                    Note : Si vous jouez, un cookie technique <b>indispensable</b> sera créé pour vous <b>garder connecté automatiquement</b> (7 jours), quel que soit votre choix ici.
                    <br>
                    <a href="https://www.cnil.fr/fr/cookies-et-autres-traceurs" target="_blank" style="color: var(--color-accent-primary); text-decoration: underline; font-size: 0.85rem;">
                        Info CNIL
                    </a>
                </p>
            </div>
            <div class="cookie-actions">
                <button id="cookie-reject" class="btn btn-secondary btn-sm">Refuser le suivi</button>
                <button id="cookie-accept" class="btn btn-primary btn-sm">Accepter & Jouer</button>
            </div>
        `;

        document.body.appendChild(banner);

        // Add event listeners
        document.getElementById('cookie-accept').addEventListener('click', () => {
            setCookie(COOKIE_NAME, 'true', 365);
            removeBanner();
            // Reload to enable tracking/session immediately
            window.location.reload();
        });

        document.getElementById('cookie-reject').addEventListener('click', () => {
            setCookie(COOKIE_NAME, 'false', 365);
            removeBanner();
        });
    }

    function removeBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.classList.add('fade-out');
            setTimeout(() => banner.remove(), 500);
        }
    }

    // Initialize
    window.addEventListener('load', () => {
        if (!hasConsent()) {
            // Small delay for smooth entrance
            setTimeout(showBanner, 1000);
        }
    });
})();
