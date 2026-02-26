/* ═══════════════════════════════════════════════════════════════
   Login Page Logic
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const form = document.getElementById('loginForm');
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorText');
    const togglePw = document.getElementById('togglePw');

    // ─── Check if already logged in ─────────────────────────
    fetch('/api/me', { credentials: 'same-origin' })
        .then(res => {
            if (res.ok) {
                window.location.href = '/index.html';
            }
        })
        .catch(() => { /* not logged in, stay on login page */ });

    // ─── Toggle Password Visibility ─────────────────────────
    if (togglePw) {
        togglePw.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePw.innerHTML = isPassword
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        });
    }

    // ─── Handle Login ───────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ username, password })
            });

            // Handle non-JSON responses (rate limit, server errors)
            let data;
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { error: text || `Server error (${res.status})` };
            }

            if (res.ok && data.success) {
                // Quick transition out
                const panel = document.querySelector('.login-panel');
                if (panel) {
                    panel.style.transition = 'opacity 0.15s, transform 0.15s';
                    panel.style.opacity = '0';
                    panel.style.transform = 'translateX(20px)';
                }

                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 100);
            } else if (res.status === 429) {
                showError('Too many attempts. Please wait and try again.');
                setLoading(false);
            } else {
                showError(data.error || 'Invalid username or password');
                setLoading(false);
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (err) {
            console.error('Login error:', err);
            showError('Cannot reach server. Check if the server is running.');
            setLoading(false);
        }
    });

    // ─── Helpers ────────────────────────────────────────────
    function showError(msg) {
        errorText.textContent = msg;
        errorDiv.classList.add('visible');
    }

    function hideError() {
        errorDiv.classList.remove('visible');
    }

    function setLoading(loading) {
        loginBtn.disabled = loading;
        loginBtn.classList.toggle('loading', loading);
        usernameInput.disabled = loading;
        passwordInput.disabled = loading;
    }

    // Clear error on new input
    usernameInput.addEventListener('input', hideError);
    passwordInput.addEventListener('input', hideError);

    // Auto-focus username
    usernameInput.focus();
})();
