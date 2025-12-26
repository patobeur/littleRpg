// Visit Counter - Display visitor statistics
class VisitCounter {
    constructor() {
        this.statsEndpoint = '/api/stats/visits';
        this.updateInterval = 5 * 60 * 1000; // Update every 5 minutes
        this.animationDuration = 2000; // 2 seconds for counting animation
    }

    async fetchStats() {
        try {
            const response = await fetch(this.statsEndpoint);
            if (!response.ok) {
                throw new Error('Failed to fetch visit stats');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching visit stats:', error);
            return null;
        }
    }

    animateCounter(element, targetValue, duration = this.animationDuration) {
        const startValue = parseInt(element.textContent) || 0;
        const startTime = Date.now();

        const updateCounter = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuad = progress * (2 - progress);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuad);

            element.textContent = currentValue.toLocaleString('fr-FR');

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = targetValue.toLocaleString('fr-FR');
            }
        };

        requestAnimationFrame(updateCounter);
    }

    async updateDisplay() {
        const stats = await this.fetchStats();

        if (!stats) {
            console.log('Failed to load visit stats');
            return;
        }

        // Update total visitors
        const totalElement = document.getElementById('totalVisitors');
        if (totalElement) {
            this.animateCounter(totalElement, stats.totalUnique);
        }

        // Update today's visitors
        const todayElement = document.getElementById('todayVisitors');
        if (todayElement) {
            this.animateCounter(todayElement, stats.today);
        }

        // Optionally display other stats if elements exist
        const weekElement = document.getElementById('weekVisitors');
        if (weekElement) {
            this.animateCounter(weekElement, stats.thisWeek);
        }

        const monthElement = document.getElementById('monthVisitors');
        if (monthElement) {
            this.animateCounter(monthElement, stats.thisMonth);
        }
    }

    init() {
        // Initial update
        this.updateDisplay();

        // Set up periodic updates
        setInterval(() => {
            this.updateDisplay();
        }, this.updateInterval);
    }
}

// Initialize counter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const counter = new VisitCounter();
    counter.init();
});
