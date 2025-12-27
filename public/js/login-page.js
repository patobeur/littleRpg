// Login page functionality
(async function () {
    // Redirect if already authenticated
    await redirectIfAuthenticated();

    // Handle login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtns = e.target.querySelectorAll('button[type="submit"]');
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Hide previous errors
        hideMessage('error-message');

        // Validate
        const usernameError = validateUsername(username);
        if (usernameError) {
            showError(usernameError);
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            showError(passwordError);
            return;
        }

        // Submit
        submitBtns.forEach(btn => setLoading(btn, true));

        try {
            await API.auth.login(username, password);
            // Redirect to dashboard on success
            redirectTo('/dashboard.html');
        } catch (error) {
            showError(error.message || 'Login failed');
            submitBtns.forEach(btn => setLoading(btn, false));
        }
    });
})();
