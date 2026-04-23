import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';

interface Patient { id: string; firstName: string; lastName: string; age: number | null; sex: string; bloodType: string; contactNumber: string; }

export async function initDashboard(roleStr: Parameters<typeof requireRole>[0], stat4Id: string, stat4Fn: (patients: Patient[]) => string, clickable: boolean) {
    const profile = await requireRole(roleStr);
    const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    
    // Safely update DOM elements if they exist (prevents crashes on React-migrated pages)
    const sidebarNameEl = document.getElementById('sidebarName');
    if (sidebarNameEl) sidebarNameEl.textContent = profile.fullName;
    
    const topbarNameEl = document.getElementById('topbarName');
    if (topbarNameEl) topbarNameEl.textContent = profile.fullName;
    
    const sidebarAvEl = document.getElementById('sidebarAv');
    if (sidebarAvEl) sidebarAvEl.textContent = initials;
    
    const topbarAvEl = document.getElementById('topbarAv');
    if (topbarAvEl) topbarAvEl.textContent = initials;
    
    const logoutBtnEl = document.getElementById('logoutBtn');
    if (logoutBtnEl) logoutBtnEl.addEventListener('click', logout);

    const { data, error } = await supabase
        .from('patients')
        .select('id, firstName, lastName, age, sex, bloodType, contactNumber')
        .order('lastName', { ascending: true });

    if (error) { 
        console.error(error); 
        return { profile, initials }; 
    }
    
    const patients = (data as Patient[]) || [];

    // Safe stats update
    const totalPatientsEl = document.getElementById('totalPatients');
    if (totalPatientsEl) totalPatientsEl.textContent = String(patients.length);
    
    const totalMaleEl = document.getElementById('totalMale');
    if (totalMaleEl) totalMaleEl.textContent = String(patients.filter(p => p.sex === 'Male').length);
    
    const totalFemaleEl = document.getElementById('totalFemale');
    if (totalFemaleEl) totalFemaleEl.textContent = String(patients.filter(p => p.sex === 'Female').length);
    
    const stat4El = document.getElementById(stat4Id);
    if (stat4El) stat4El.textContent = stat4Fn(patients);

    const recent = patients.slice(0, 5);
    const queueCountEl = document.getElementById('queueCount');
    if (queueCountEl) queueCountEl.textContent = String(recent.length);
    
    const patientQueueEl = document.getElementById('patientQueue');
    if (patientQueueEl) {
        patientQueueEl.innerHTML = recent.length === 0
            ? '<div class="loading-msg">No patients.</div>'
            : recent.map(p => `
                <div class="q-item" ${clickable ? `onclick="window.location.href='details.html?id=${p.id}'"` : ''}>
                    <div class="q-av">${(p.firstName?.[0] || '?').toUpperCase()}</div>
                    <div class="q-info">
                        <div class="q-name">${p.firstName} ${p.lastName}</div>
                        <div class="q-sub">${p.sex || '—'} · ${p.bloodType || '—'}</div>
                    </div>
                </div>
            `).join('');
    }

    let all = patients;

    function renderTable(list: Patient[]) {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        
        tbody.innerHTML = list.length === 0 ? '<tr><td colspan="6" class="loading-msg">No patients found.</td></tr>'
            : list.map(p => `
                <tr ${clickable ? `class="clickable" onclick="window.location.href='details.html?id=${p.id}'"` : ''}>
                    <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="width:34px;height:34px;border-radius:50%;background:var(--blue);color:white;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">
                                ${(p.firstName?.[0] || '?').toUpperCase()}
                            </div>
                            <span style="font-weight:600;">${p.lastName}, ${p.firstName}</span>
                        </div>
                    </td>
                    <td>${p.age ?? '—'}</td>
                    <td><span class="badge badge-${p.sex === 'Male' ? 'male' : 'female'}">${p.sex || '—'}</span></td>
                    <td>${p.bloodType || '—'}</td>
                    <td>${p.contactNumber || '—'}</td>
                    <td><span style="color:var(--blue);font-size:1.1rem;">${clickable ? '→' : '—'}</span></td>
                </tr>
            `).join('');
    }

    renderTable(all);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = (e.target as HTMLInputElement).value.toLowerCase();
            renderTable(all.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)));
        });
    }

    // Return profile data so React components can use it
    return { profile, initials };
}