// Common Navigation Component
// Injects navigation dynamically into all pages with authentication awareness

class NavigationManager {
    constructor() {
        this.isAuthenticated = false;
        this.userRole = null;
        this.currentPage = this.getCurrentPage();
    }

    async checkAuth() {
        // Check if user is authenticated via session API
        try {
            const response = await fetch('/api/auth/session', {
                method: 'GET',
                credentials: 'include' // Important for cookies
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.user) {
                    this.userRole = data.user.role;
                }
                return data.authenticated || false;
            }
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path.endsWith('index.html')) return 'home';
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('profile')) return 'profile';
        if (path.includes('stats')) return 'stats';
        if (path.includes('login')) return 'login';
        if (path.includes('register')) return 'register';
        return 'other';
    }

    generateNavHTML() {
        if (this.isAuthenticated) {
            return this.getAuthenticatedNav();
        }
        return this.getPublicNav();
    }

    getPublicNav() {
        const homeActive = this.currentPage === 'home' ? 'active' : '';

        return `
            <nav class="main-nav">
                <div class="container nav-container">
                    <a href="/" class="nav-logo">
                        <img src="/medias/littlerpg_logo_nav_50.png" alt="LittleRPG Logo" class="logo-icon">
                        <span class="logo-text">.</span>
                    </a>
                    <div class="nav-links">
                        <a href="/#features" class="nav-link">Fonctionnalités</a>
                        <a href="/#news" class="nav-link">Actualités</a>
                        <a href="/login.html" class="btn btn-outline">Connexion</a>
                        <a href="/register.html" class="btn btn-primary">S'inscrire</a>
                    </div>
                    <button class="mobile-menu-toggle" aria-label="Menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </nav>
        `;
    }

    getAuthenticatedNav() {
        const dashboardActive = this.currentPage === 'dashboard' ? 'active' : '';
        const profileActive = this.currentPage === 'profile' ? 'active' : '';
        const statsActive = this.currentPage === 'stats' ? 'active' : '';

        // SuperAdmin links
        const superAdminLinks = this.userRole === 'superAdmin'
            ? `<a href="/stats.html" class="nav-link ${statsActive}">📊 Stats</a>
               <a href="/map_generator.html" class="nav-link">🛠️ Map Generator</a>`
            : '';

        return `
            <nav class="main-nav">
                <div class="container nav-container">
                    <a href="/" class="nav-logo">
                        <img src="/medias/littlerpg_logo_nav_50.png" alt="LittleRPG Logo" class="logo-icon">
                        <span class="logo-text">.</span>
                    </a>
                    <div class="nav-links">
                        <a href="/dashboard.html" class="nav-link ${dashboardActive}">Dashboard</a>
                        <a href="/profile.html" class="nav-link ${profileActive}">Profile</a>
                        ${superAdminLinks}
                        <a href="#" id="logout-link" class="nav-link">Logout</a>
                    </div>
                    <button class="mobile-menu-toggle" aria-label="Menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </nav>
        `;
    }

    attachEventListeners() {
        // Mobile menu toggle
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const navLinksContainer = document.querySelector('.nav-links');

        if (mobileMenuToggle && navLinksContainer) {
            mobileMenuToggle.addEventListener('click', () => {
                navLinksContainer.classList.toggle('active');
                mobileMenuToggle.classList.toggle('active');
            });
        }

        // Navbar background on scroll
        const nav = document.querySelector('.main-nav');
        if (!nav) return;

        const updateNavbar = () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 100) {
                nav.style.background = 'rgba(10, 10, 15, 0.7)';
                nav.style.backdropFilter = 'blur(20px)';
                nav.style.webkitBackdropFilter = 'blur(20px)';
                nav.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.5)';
            } else {
                nav.style.background = 'rgba(10, 10, 15, 0.5)';
                nav.style.backdropFilter = 'blur(20px)';
                nav.style.webkitBackdropFilter = 'blur(20px)';
                nav.style.boxShadow = 'none';
            }
        };

        // Set initial state
        updateNavbar();

        // Update on scroll
        window.addEventListener('scroll', updateNavbar);

        // Logout handler for authenticated users
        if (this.isAuthenticated) {
            const logoutLink = document.getElementById('logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', async (e) => {
                    e.preventDefault();

                    try {
                        await fetch('/api/auth/logout', {
                            method: 'POST',
                            credentials: 'include'
                        });
                        window.location.href = '/';
                    } catch (error) {
                        console.error('Logout failed:', error);
                        window.location.href = '/';
                    }
                });
            }
        }
    }

    async inject(targetSelector = 'body') {
        // Check auth state first
        this.isAuthenticated = await this.checkAuth();

        const navHTML = this.generateNavHTML();
        const target = document.querySelector(targetSelector);

        if (target) {
            // Insert at the beginning of body
            target.insertAdjacentHTML('afterbegin', navHTML);

            // Attach event listeners after DOM insertion
            this.attachEventListeners();
        } else {
            console.error('Navigation target not found:', targetSelector);
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const navManager = new NavigationManager();
    await navManager.inject();
});
