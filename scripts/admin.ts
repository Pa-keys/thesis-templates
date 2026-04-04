import { supabase } from '../shared/supabase';
import { initDashboard } from '../scripts/dashboard-helper';

// Load users for admin panel
async function loadUsers(): Promise<void> {
    const usersBody = document.getElementById('usersBody');
    if (!usersBody) return;

    const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role')
        .order('role', { ascending: true });

    if (error) { console.error(error); return; }
    const users = data || [];
    document.getElementById('totalUsers')!.textContent = String(users.length);

    usersBody.innerHTML = users.length === 0
        ? '<div class="loading-msg" style="padding:12px;">No users found.</div>'
        : users.map((u: any) => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--slate);color:white;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;">
                    ${(u.full_name?.[0] || '?').toUpperCase()}
                </div>
                <div style="flex:1;">
                    <div style="font-size:0.85rem;font-weight:600;">${u.full_name || '—'}</div>
                    <div style="font-size:0.72rem;color:var(--text-3);text-transform:capitalize;">${u.role || '—'}</div>
                </div>
                <span class="badge badge-role" style="text-transform:capitalize;">${u.role || '—'}</span>
            </div>
        `).join('');
}

await initDashboard('admin', 'totalUsers', () => '...', true);
loadUsers();
