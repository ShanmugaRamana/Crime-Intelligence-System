

document.addEventListener('DOMContentLoaded', () => {
    console.log('Frontend script loaded successfully');

    const langSwitch = document.getElementById('lang-switch');

    // Translation Elements
    const tWelcome = document.getElementById('t-welcome');
    const tSubtitle = document.getElementById('t-subtitle');
    const tUsernameLabel = document.getElementById('t-username-label');
    const inputUsername = document.getElementById('username');
    const tPasswordLabel = document.getElementById('t-password-label');
    const inputPassword = document.getElementById('password');
    const tLoginBtn = document.getElementById('t-login-btn');

    // Language Change Listener
    langSwitch.addEventListener('change', (e) => {
        if (e.target.name === 'language') {
            const lang = e.target.value;
            const dict = loginTranslations[lang];

            if (dict) {
                tWelcome.textContent = dict.welcome;
                tSubtitle.textContent = dict.subtitle;
                tUsernameLabel.textContent = dict.usernameLabel;
                inputUsername.placeholder = dict.usernamePlaceholder;
                tPasswordLabel.textContent = dict.passwordLabel;
                inputPassword.placeholder = dict.passwordPlaceholder;
                tLoginBtn.textContent = dict.loginBtn;
            }
        }
    });

    // Login Form Submission
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = inputUsername.value.trim();
        const password = inputPassword.value.trim();

        if (!username || !password) {
            alert('Please enter both username and password.');
            return;
        }

        // Disable button while loading
        tLoginBtn.disabled = true;
        tLoginBtn.textContent = 'Logging in...';

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success && data.redirect) {
                window.location.replace(data.redirect);
            } else {
                alert(data.message || 'Login failed. Please try again.');
                tLoginBtn.disabled = false;
                tLoginBtn.textContent = loginTranslations['en'].loginBtn;
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('Unable to connect to the server. Please try again later.');
            tLoginBtn.disabled = false;
            tLoginBtn.textContent = loginTranslations['en'].loginBtn;
        }
    });
});
