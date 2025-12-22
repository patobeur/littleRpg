// Homepage JavaScript - Interactive elements and smooth scrolling

// Configuration
const HERO_ROTATION_INTERVAL = 8000; // milliseconds (adjustable)

// Hero Image Carousel Manager
class HeroCarousel {
    constructor(containerSelector, interval) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.images = Array.from(this.container.querySelectorAll('.hero-image'));
        this.currentIndex = 0;
        this.interval = interval;
        this.intervalId = null;

        this.init();
    }

    init() {
        if (this.images.length <= 1) return;
        this.start();
    }

    start() {
        this.intervalId = setInterval(() => this.rotate(), this.interval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    rotate() {
        // Remove active class from current image
        this.images[this.currentIndex].classList.remove('active');

        // Calculate next index
        this.currentIndex = (this.currentIndex + 1) % this.images.length;

        // Add active class to next image
        this.images[this.currentIndex].classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize hero carousel
    const heroCarousel = new HeroCarousel('.hero-background', HERO_ROTATION_INTERVAL);
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const navElement = document.querySelector('.main-nav');
                const navHeight = navElement ? navElement.offsetHeight : 80;
                const targetPosition = targetSection.offsetTop - navHeight - 20; // Extra 20px padding

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinksContainer = document.querySelector('.nav-links');

    if (mobileMenuToggle && navLinksContainer) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
    }

    // Scroll reveal animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all cards and features
    const animatedElements = document.querySelectorAll('.news-card, .feature-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });

    // Add parallax effect to hero background
    const heroBackground = document.querySelector('.hero-background');

    if (heroBackground) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallaxSpeed = 0.5;
            heroBackground.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
        });
    }

    // Add hover sound effects (optional, can be expanded)
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
    });

    // Console easter egg
    console.log('%c⚔️ LittleRPG', 'font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;');
    console.log('%cBienvenue, aventurier ! Prêt à explorer notre monde ?', 'font-size: 14px; color: #b8b8cc;');
});
