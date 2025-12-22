// Utility functions

// Display error message
function showError(message, elementId = 'error-message') {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        errorEl.classList.add('alert', 'alert-error');
    }
}

// Display success message
function showSuccess(message, elementId = 'success-message') {
    const successEl = document.getElementById(elementId);
    if (successEl) {
        successEl.textContent = message;
        successEl.classList.remove('hidden');
        successEl.classList.add('alert', 'alert-success');
    }
}

// Hide message
function hideMessage(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.add('hidden');
    }
}

// Form validation
function validateUsername(username) {
    if (!username || username.length < 3 || username.length > 20) {
        return 'Username must be between 3 and 20 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
}

function validatePassword(password) {
    if (!password || password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    return null;
}

function validateEmail(email) {
    if (!email) {
        return 'Email is required';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return 'Please enter a valid email address';
    }
    return null;
}

function validateCharacterName(name) {
    if (!name || name.trim().length < 2 || name.trim().length > 20) {
        return 'Character name must be between 2 and 20 characters';
    }
    return null;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format relative time (e.g., "3 days ago")
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

// Get initials from username
function getInitials(username) {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
}

// Redirect to page
function redirectTo(page) {
    window.location.href = page;
}

// Loading state
function setLoading(buttonEl, isLoading) {
    if (isLoading) {
        buttonEl.disabled = true;
        buttonEl.dataset.originalText = buttonEl.textContent;
        buttonEl.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
        buttonEl.disabled = false;
        buttonEl.textContent = buttonEl.dataset.originalText || 'Submit';
    }
}

// Check if user is authenticated
async function checkAuth() {
    try {
        const data = await API.auth.checkSession();
        return data.authenticated;
    } catch (error) {
        return false;
    }
}

// Protect page (redirect to login if not authenticated)
async function protectPage() {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        redirectTo('/');
    }
}

// Redirect if already authenticated
async function redirectIfAuthenticated(targetPage = '/dashboard.html') {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        redirectTo(targetPage);
    }
}
