/* ═══════════════════════════════════════════════════════════════
   Authentication Module — Users, Passwords, JWT
   ═══════════════════════════════════════════════════════════════ */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ─── JWT Secret Management ──────────────────────────────────
// Generate a fresh secret on every server start.
// This ensures all sessions are invalidated when the server restarts.
const JWT_SECRET = crypto.randomBytes(64).toString('hex');
console.log('  [Auth] New session key generated (old sessions invalidated)');
const JWT_EXPIRY = '8h';

// ─── Database Reference ─────────────────────────────────────
let db = null;

function initAuthDB(database) {
    db = database;

    // Drop old table if it has wrong schema (missing admin role)
    try {
        const tableInfo = db.pragma('table_info(users)');
        if (tableInfo.length > 0) {
            // Check if we need to migrate by testing admin role
            try {
                db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('__test__', '__test__', 'admin')").run();
                db.prepare("DELETE FROM users WHERE username = '__test__'").run();
            } catch (e) {
                // CHECK constraint failed — need to recreate table with admin role
                console.log('  [Auth] Migrating users table to support admin role...');
                const existing = db.prepare('SELECT * FROM users').all();
                db.exec('DROP TABLE users');
                createUsersTable();
                // Re-insert existing users
                const insert = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
                existing.forEach(u => {
                    // Convert old admin1 viewer to admin
                    const role = u.username === 'admin1' ? 'admin' : u.role;
                    insert.run(u.username, u.password_hash, role);
                });
                console.log('  [Auth] Migration complete');
                return;
            }
        } else {
            createUsersTable();
        }
    } catch (e) {
        createUsersTable();
    }

    // Seed default users if table is empty
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    if (count === 0) {
        seedDefaultUsers();
    }

    console.log('  [Auth] Authentication database initialized');
}

function createUsersTable() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('viewer', 'editor', 'admin')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

function seedDefaultUsers() {
    const salt = bcrypt.genSaltSync(12);
    const insert = db.prepare(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    );

    insert.run('admin1', bcrypt.hashSync('admin1@123', salt), 'admin');
    insert.run('admin2', bcrypt.hashSync('admin2@123', salt), 'editor');

    console.log('  [Auth] Seeded default users: admin1 (admin), admin2 (editor)');
}

// ─── Authentication ─────────────────────────────────────────
function authenticateUser(username, password) {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return null;

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return null;

    return { id: user.id, username: user.username, role: user.role };
}

function getUserByUsername(username) {
    const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE username = ?').get(username);
    return user || null;
}

// ─── User Management (Admin Only) ───────────────────────────
function getAllUsers() {
    return db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all();
}

function createUser(username, password, role) {
    if (!username || !password || !role) throw new Error('Username, password, and role are required');
    if (!['viewer', 'editor'].includes(role)) throw new Error('Role must be viewer or editor');
    if (username.length < 3) throw new Error('Username must be at least 3 characters');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) throw new Error('Username already exists');

    const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
    const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role);
    return { id: result.lastInsertRowid, username, role };
}

function updateUserRole(userId, newRole) {
    if (!['viewer', 'editor'].includes(newRole)) throw new Error('Role must be viewer or editor');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'admin') throw new Error('Cannot change admin role');

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, userId);
    return { id: userId, username: user.username, role: newRole };
}

function deleteUser(userId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'admin') throw new Error('Cannot delete admin user');

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    return { success: true };
}

// ─── JWT Helpers ────────────────────────────────────────────
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

module.exports = {
    initAuthDB,
    authenticateUser,
    getUserByUsername,
    getAllUsers,
    createUser,
    updateUserRole,
    deleteUser,
    generateToken,
    verifyToken
};
