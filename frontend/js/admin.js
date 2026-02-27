/* ═══════════════════════════════════════════════════════════════
   Admin Page — User Management Logic
   ═══════════════════════════════════════════════════════════════ */

let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    // Run initApp first to authenticate and set up nav/user display,
    // then run page-specific logic in the callback
    initApp({
        onReady: () => {
            // Redirect non-admin users away from admin page
            if (window.userRole && window.userRole !== 'admin') {
                window.location.href = '/index.html';
                return;
            }

            loadUsers();

            document.getElementById('addUserForm').addEventListener('submit', handleAddUser);

            // ─── Event Delegation for table actions ──────────────────
            document.getElementById('usersTableBody').addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.btn-delete-user');
                if (deleteBtn) {
                    const userId = parseInt(deleteBtn.dataset.id);
                    const username = deleteBtn.dataset.name;
                    confirmDeleteUser(userId, username);
                }
            });

            document.getElementById('usersTableBody').addEventListener('change', (e) => {
                if (e.target.classList.contains('role-select')) {
                    const userId = parseInt(e.target.dataset.id);
                    const newRole = e.target.value;
                    changeRole(userId, newRole);
                }
            });

            // ─── Confirm Modal listeners (once) ─────────────────────
            const overlay = document.getElementById('confirmOverlay');
            document.getElementById('confirmCancel').addEventListener('click', closeConfirmModal);
            document.getElementById('confirmOk').addEventListener('click', () => {
                const cb = _confirmCallback;
                closeConfirmModal();
                if (cb) cb();
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeConfirmModal();
            });
        }
    });
});

// ─── Load Users ──────────────────────────────────────────────
async function loadUsers() {
    try {
        const res = await fetch('/api/users', { credentials: 'same-origin' });
        if (res.status === 401) { window.location.href = '/login.html'; return; }
        if (res.status === 403) { window.location.href = '/index.html'; return; }

        allUsers = await res.json();
        renderUsers(allUsers);
    } catch (err) {
        console.error('Error loading users:', err);
    }
}

// ─── Render Users Table ──────────────────────────────────────
function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    const countEl = document.getElementById('userCount');
    countEl.textContent = `${users.length} user${users.length !== 1 ? 's' : ''}`;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-400);">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map((u, i) => {
        const isAdmin = u.role === 'admin';
        const createdDate = u.created_at ? new Date(u.created_at + 'Z').toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        }) : '—';

        const roleLabel = isAdmin ? '<span class="user-badge-admin">Admin</span>'
            : `<select class="role-select" data-id="${u.id}">
                <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Read Only</option>
                <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Read & Write</option>
               </select>`;

        const actions = isAdmin
            ? '<span style="color:var(--text-300); font-size:0.75rem;">Protected</span>'
            : `<button class="btn-delete-user" data-id="${u.id}" data-name="${u.username}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
                Delete
               </button>`;

        return `<tr>
            <td>${i + 1}</td>
            <td><strong>${u.username}</strong>${isAdmin ? ' <span class="user-badge-default">(default)</span>' : ''}</td>
            <td>${roleLabel}</td>
            <td>${createdDate}</td>
            <td>${actions}</td>
        </tr>`;
    }).join('');
}

// ─── Add User ────────────────────────────────────────────────
async function handleAddUser(e) {
    e.preventDefault();

    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    const errorEl = document.getElementById('addUserError');

    errorEl.style.display = 'none';

    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ username, password, role })
        });

        const data = await res.json();

        if (res.ok) {
            showToast(`User "${data.username}" created with ${data.role === 'viewer' ? 'Read Only' : 'Read & Write'} access`, 'success');
            document.getElementById('addUserForm').reset();
            loadUsers();
        } else {
            errorEl.textContent = data.error || 'Failed to create user';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.style.display = 'block';
    }
}

// ─── Change Role ─────────────────────────────────────────────
async function changeRole(userId, newRole) {
    try {
        const res = await fetch(`/api/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ role: newRole })
        });

        const data = await res.json();

        if (res.ok) {
            showToast(`Updated "${data.username}" to ${newRole === 'viewer' ? 'Read Only' : 'Read & Write'}`, 'success');
            loadUsers();
        } else {
            showToast(data.error || 'Failed to update role', 'error');
            loadUsers();
        }
    } catch (err) {
        showToast('Network error', 'error');
        loadUsers();
    }
}

// ─── Delete User (with confirm modal) ───────────────────────
function confirmDeleteUser(userId, username) {
    showConfirmModal(
        'Delete User',
        `Are you sure you want to delete "${username}"? This user will lose all access immediately.`,
        async () => {
            try {
                const res = await fetch(`/api/users/${userId}`, {
                    method: 'DELETE',
                    credentials: 'same-origin'
                });

                if (res.ok) {
                    showToast(`User "${username}" deleted`, 'success');
                    loadUsers();
                } else {
                    const data = await res.json();
                    showToast(data.error || 'Failed to delete user', 'error');
                }
            } catch (err) {
                showToast('Network error', 'error');
            }
        }
    );
}

// ─── Styled Confirm Modal ───────────────────────────────────
let _confirmCallback = null;

function showConfirmModal(title, message, onConfirm) {
    const overlay = document.getElementById('confirmOverlay');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    _confirmCallback = onConfirm;
    overlay.classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmOverlay').classList.remove('active');
    _confirmCallback = null;
}

// ─── Toast Notifications ────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
