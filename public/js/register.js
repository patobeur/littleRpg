// Registration page functionality
(async function () {
    // Redirect if already authenticated
    await redirectIfAuthenticated();

    // Handle registration form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Hide previous errors
        hideMessage('error-message');

        // Validate
        const usernameError = validateUsername(username);
        if (usernameError) {
            showError(usernameError);
            return;
        }

        const emailError = validateEmail(email);
        if (emailError) {
            showError(emailError);
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            showError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        // Submit
        setLoading(submitBtn, true);

        try {
            await API.auth.register(username, email, password, confirmPassword);
            // Redirect to dashboard on success
            redirectTo('/dashboard.html');
        } catch (error) {
            showError(error.message || 'Registration failed');
            setLoading(submitBtn, false);
        }
    });
})();
