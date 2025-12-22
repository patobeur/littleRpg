// Login page functionality
(async function () {
    // Redirect if already authenticated
    await redirectIfAuthenticated();

    // Handle login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
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
        setLoading(submitBtn, true);

        try {
            await API.auth.login(username, password);
            // Redirect to dashboard on success
            redirectTo('/dashboard.html');
        } catch (error) {
            showError(error.message || 'Login failed');
            setLoading(submitBtn, false);
        }
    });
})();
