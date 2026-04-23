import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
    id: string;
    full_name: string;
    role: string;
    email?: string;
}

const ROLES = ['doctor', 'nurse', 'BHW', 'midwives', 'pharmacist', 'labaratory', 'admin'] as const;

// ─── Auth ─────────────────────────────────────────────────────────────────────
const profile = await requireRole('admin');
const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
document.getElementById('sidebarName')!.textContent = profile.fullName;
document.getElementById('topbarName')!.textContent  = profile.fullName;
document.getElementById('sidebarAv')!.textContent   = initials;
document.getElementById('topbarAv')!.textContent    = initials;
document.getElementById('logoutBtn')!.addEventListener('click', logout);

// ─── State ────────────────────────────────────────────────────────────────────
let allUsers: UserProfile[] = [];
let editingUserId: string | null = null;
let isEditMode = false;

// ─── Load Users ───────────────────────────────────────────────────────────────
async function loadUsers(): Promise<void> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, email')
        .order('role', { ascending: true });

    if (error) { console.error('Error loading users:', error); return; }
    allUsers = (data as UserProfile[]) || [];

    document.getElementById('totalUsers')!.textContent   = String(allUsers.length);
    document.getElementById('activeUsers')!.textContent  = String(allUsers.length);
    document.getElementById('deletedUsers')!.textContent = '0';

    applyFilters();
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function applyFilters(): void {
    const searchQ = (document.getElementById('searchInput') as HTMLInputElement).value.toLowerCase();
    const roleF   = (document.getElementById('roleFilter') as HTMLSelectElement).value;

    let filtered = allUsers.filter(u => {
        const matchSearch = `${u.full_name} ${u.email || ''}`.toLowerCase().includes(searchQ);
        const matchRole   = roleF ? u.role === roleF : true;
        return matchSearch && matchRole;
    });

    renderUsers(filtered);
}

document.getElementById('searchInput')!.addEventListener('input', applyFilters);
document.getElementById('roleFilter')!.addEventListener('change', applyFilters);

// ─── Render Users ─────────────────────────────────────────────────────────────
function getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
        doctor:     'role-doctor',
        nurse:      'role-nurse',
        BHW:        'role-bhw',
        midwives:   'role-midwives',
        pharmacist: 'role-pharmacist',
        labaratory: 'role-labaratory',
        admin:      'role-admin'
    };
    return map[role] || 'role-admin';
}

function getRoleLabel(role: string): string {
    const map: Record<string, string> = {
        doctor:     'Doctor',
        nurse:      'Nurse',
        BHW:        'BHW',
        midwives:   'Midwives',
        pharmacist: 'Pharmacist',
        labaratory: 'Laboratory',
        admin:      'Admin'
    };
    return map[role] || role;
}

function getAvatarColor(role: string): string {
    const map: Record<string, string> = {
        doctor:     '#2563EB',
        nurse:      '#16A34A',
        BHW:        '#C2410C',
        midwives:   '#9D174D',
        pharmacist: '#065F46',
        labaratory: '#4338CA',
        admin:      '#334155'
    };
    return map[role] || '#334155';
}

function renderUsers(users: UserProfile[]): void {
    const el = document.getElementById('userList')!;

    if (users.length === 0) {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <p>No users found matching your filters.</p>
            </div>`;
        return;
    }

    el.innerHTML = users.map(u => {
        const av    = (u.full_name?.[0] || '?').toUpperCase();
        const color = getAvatarColor(u.role);

        return `
            <div class="user-row">
                <div class="user-av" style="background:${color};">${av}</div>
                <div>
                    <div class="user-name">${u.full_name || '—'}</div>
                    <div class="user-email">${u.email || '—'}</div>
                </div>
                <div>
                    <span class="role-badge ${getRoleBadgeClass(u.role)}">${getRoleLabel(u.role)}</span>
                </div>
                <div>
                    <span style="font-size:0.78rem;font-weight:600;color:#16A34A;">🟢 Active</span>
                </div>
                <div class="action-btns">
                    <button class="act-btn act-edit" onclick="openEditModal('${u.id}')">✏️ Edit</button>
                    <button class="act-btn act-delete" onclick="confirmDelete('${u.id}', '${u.full_name?.replace(/'/g, "\\'")}')">🗑 Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
(window as any).openAddModal = function(): void {
    isEditMode = false;
    editingUserId = null;

    document.getElementById('modalTitle')!.textContent   = 'Add New User';
    document.getElementById('modalSub')!.textContent     = 'Create a new system account and assign a role';
    document.getElementById('modalSaveBtn')!.textContent = '➕ Create User';

    document.getElementById('emailField')!.style.display    = 'block';
    document.getElementById('passwordField')!.style.display = 'block';

    (document.getElementById('f_fullName') as HTMLInputElement).value  = '';
    (document.getElementById('f_email')    as HTMLInputElement).value  = '';
    (document.getElementById('f_password') as HTMLInputElement).value  = '';
    (document.getElementById('f_role')     as HTMLSelectElement).value = '';

    document.getElementById('userModal')!.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
(window as any).openEditModal = function(userId: string): void {
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;

    isEditMode = true;
    editingUserId = userId;

    document.getElementById('modalTitle')!.textContent   = `Edit: ${u.full_name}`;
    document.getElementById('modalSub')!.textContent     = 'Update name or role assignment';
    document.getElementById('modalSaveBtn')!.textContent = '💾 Save Changes';

    document.getElementById('emailField')!.style.display    = 'none';
    document.getElementById('passwordField')!.style.display = 'none';

    (document.getElementById('f_fullName') as HTMLInputElement).value  = u.full_name || '';
    (document.getElementById('f_role')     as HTMLSelectElement).value = u.role || '';

    document.getElementById('userModal')!.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

// ─── Close Modal ──────────────────────────────────────────────────────────────
(window as any).closeModal = function(): void {
    document.getElementById('userModal')!.style.display = 'none';
    document.body.style.overflow = '';
    editingUserId = null;
};

// ─── Save (Add or Edit) ───────────────────────────────────────────────────────
(window as any).handleSave = async function(): Promise<void> {
    const saveBtn  = document.getElementById('modalSaveBtn') as HTMLButtonElement;
    const fullName = (document.getElementById('f_fullName') as HTMLInputElement).value.trim();
    const role     = (document.getElementById('f_role') as HTMLSelectElement).value;

    if (!fullName) { alert('Please enter a full name.'); return; }
    if (!role)     { alert('Please select a role.'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';

    if (isEditMode && editingUserId) {
        // ── UPDATE existing user ──
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: fullName, role })
            .eq('id', editingUserId);

        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Changes';

        if (error) { alert('Error updating user: ' + error.message); return; }
        alert(`✅ ${fullName}'s profile updated successfully.`);

    } else {
        // ── CREATE new user ──
        const email    = (document.getElementById('f_email')    as HTMLInputElement).value.trim();
        const password = (document.getElementById('f_password') as HTMLInputElement).value;

        if (!email)              { saveBtn.disabled = false; saveBtn.textContent = '➕ Create User'; alert('Please enter an email.'); return; }
        if (password.length < 6) { saveBtn.disabled = false; saveBtn.textContent = '➕ Create User'; alert('Password must be at least 6 characters.'); return; }

        // Save admin session before signUp replaces it
        const { data: { session: adminSession } } = await supabase.auth.getSession();
        const adminEmail    = adminSession?.user?.email || '';
        const adminPassword = prompt('Re-enter your admin password to confirm user creation:') || '';

        if (!adminPassword) {
            saveBtn.disabled = false;
            saveBtn.textContent = '➕ Create User';
            return;
        }

        const { error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, role } }
        });

        if (authError) {
            saveBtn.disabled = false;
            saveBtn.textContent = '➕ Create User';
            alert('Error creating account: ' + authError.message);
            return;
        }

        // Re-sign in as admin immediately to restore session
        const { error: reLoginError } = await supabase.auth.signInWithPassword({
            email: adminEmail,
            password: adminPassword,
        });

        saveBtn.disabled = false;
        saveBtn.textContent = '➕ Create User';

        if (reLoginError) {
            alert('User created but could not restore admin session. Please log in again.');
            window.location.href = '/login.html';
            return;
        }

        alert(`✅ User ${fullName} created successfully.`);
    }

    (window as any).closeModal();
    loadUsers();
};

// ─── Confirm Delete ───────────────────────────────────────────────────────────
(window as any).confirmDelete = function(userId: string, name: string): void {
    document.getElementById('confirmIcon')!.textContent  = '🗑';
    document.getElementById('confirmTitle')!.textContent = 'Delete User';
    document.getElementById('confirmMsg')!.innerHTML = `
        Are you sure you want to permanently delete <span class="confirm-name">${name}</span>?<br>
        This cannot be undone.`;

    const btn = document.getElementById('confirmActionBtn')!;
    btn.textContent = '🗑 Delete User';
    btn.onclick = () => deleteUser(userId, name);

    document.getElementById('confirmModal')!.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

(window as any).closeConfirm = function(): void {
    document.getElementById('confirmModal')!.style.display = 'none';
    document.body.style.overflow = '';
};

// ─── Hard Delete ──────────────────────────────────────────────────────────────
async function deleteUser(userId: string, name: string): Promise<void> {
    (window as any).closeConfirm();

    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (error) { alert('Error deleting user: ' + error.message); return; }
    alert(`🗑 ${name} has been permanently deleted.`);
    loadUsers();
}

// ─── Close modals on overlay click ────────────────────────────────────────────
document.getElementById('userModal')!.addEventListener('click', (e) => {
    if (e.target === document.getElementById('userModal')) (window as any).closeModal();
});
document.getElementById('confirmModal')!.addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirmModal')) (window as any).closeConfirm();
});

loadUsers();