require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Prevent browser caching of pages (fixes back button issues)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// --- Auth Middleware ---
function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    return res.redirect('/');
}

// --- Routes ---

// Login page
app.get('/', (req, res) => {
    if (req.session && req.session.isAuthenticated) {
        return res.redirect('/home');
    }
    res.render('index', { title: 'Crime Intelligence System' });
});

// Login API proxy
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const apiKey = process.env.BACKEND_API_KEY;

    try {
        const response = await fetch(`${backendUrl}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            req.session.isAuthenticated = true;
            req.session.username = username;
            return res.json({ success: true, redirect: '/home' });
        } else {
            return res.status(401).json({ success: false, message: data.detail || 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Unable to connect to backend server' });
    }
});

// Home page (protected)
app.get('/home', requireAuth, (req, res) => {
    res.render('home', {
        title: 'Crime Intelligence System',
        username: req.session.username
    });
});

// Data page (protected)
app.get('/data', requireAuth, (req, res) => {
    res.render('data', {
        title: 'Crime Intelligence System',
        username: req.session.username
    });
});

// Data upload proxy (protected)
app.post('/data/upload', requireAuth, async (req, res) => {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const apiKey = process.env.BACKEND_API_KEY;

    try {
        // Forward the raw request body as multipart form data
        const contentType = req.headers['content-type'];
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);

        const response = await fetch(`${backendUrl}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'x-api-key': apiKey
            },
            body: body
        });

        const data = await response.json();

        if (response.ok) {
            return res.json(data);
        } else {
            return res.status(response.status).json(data);
        }
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ success: false, message: 'Unable to connect to backend server' });
    }
});

// Get current dataset proxy (protected)
app.get('/data/current', requireAuth, async (req, res) => {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const apiKey = process.env.BACKEND_API_KEY;

    try {
        const response = await fetch(`${backendUrl}/dataset`, {
            headers: { 'x-api-key': apiKey }
        });
        const data = await response.json();
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Unable to connect to backend server' });
    }
});

// Delete current dataset proxy (protected)
app.delete('/data/current', requireAuth, async (req, res) => {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const apiKey = process.env.BACKEND_API_KEY;

    try {
        const response = await fetch(`${backendUrl}/dataset`, {
            method: 'DELETE',
            headers: { 'x-api-key': apiKey }
        });
        const data = await response.json();
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Unable to connect to backend server' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Auth check endpoint (for client-side verification)
app.get('/auth/check', (req, res) => {
    res.json({ authenticated: !!(req.session && req.session.isAuthenticated) });
});

app.listen(port, () => {
    console.log(`Frontend server is running at http://localhost:${port}`);
});
