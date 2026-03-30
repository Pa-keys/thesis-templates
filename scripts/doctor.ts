import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    age: number | null;
    sex: string;
    bloodType: string;
    contactNumber: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const profile = await requireRole('doctor');
const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
document.getElementById('sidebarName')!.textContent = profile.fullName;
document.getElementById('topbarName')!.textContent  = profile.fullName;
document.getElementById('sidebarAv')!.textContent   = initials;
document.getElementById('topbarAv')!.textContent    = initials;
document.getElementById('logoutBtn')!.addEventListener('click', logout);

// ─── Visit Trend Chart ────────────────────────────────────────────────────────
const ctx = (document.getElementById('visitChart') as HTMLCanvasElement).getContext('2d')!;
new (window as any).Chart(ctx, {
    type: 'line',
    data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [{
            data: [14, 18, 16, 22, 28, 20, 7],
            borderColor: '#0066FF',
            backgroundColor: 'rgba(0,102,255,0.08)',
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#0066FF',
            fill: true,
            tension: 0.4,
        }]
    },
    options: {
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
            y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 }, color: '#94A3B8' }, beginAtZero: true }
        }
    }
});

// ─── Load Patients ────────────────────────────────────────────────────────────
let allPatients: Patient[] = [];

async function loadPatients(): Promise<void> {
    const { data, error } = await supabase
        .from('patients')
        .select('id, firstName, lastName, age, sex, bloodType, contactNumber')
        .order('lastName', { ascending: true });

    if (error) { console.error(error); return; }
    allPatients = (data as Patient[]) || [];

    // Stats
    document.getElementById('totalPatients')!.textContent = String(allPatients.length);
    document.getElementById('visitsToday')!.textContent   = String(Math.min(allPatients.length, 24));
    document.getElementById('pendingReports')!.textContent = '7';

    // Queue (first 5)
    const recent = allPatients.slice(0, 5);
    document.getElementById('queueCount')!.textContent = String(recent.length);
    const times = ['09:30 AM', '10:15 AM', '11:00 AM', '11:30 AM', '02:00 PM'];
    const late   = [false, true, false, false, false];
    document.getElementById('patientQueue')!.innerHTML = recent.length === 0
        ? '<div class="loading-msg">No patients in queue.</div>'
        : recent.map((p, i) => `
            <div class="q-item" onclick="window.location.href='details.html?id=${p.id}'">
                <div class="q-av">${(p.firstName?.[0] || '?').toUpperCase()}</div>
                <div class="q-info">
                    <div class="q-name">${p.firstName} ${p.lastName}</div>
                    <div class="q-sub">${p.sex || '—'} · ${p.bloodType || '—'}</div>
                </div>
                <span class="q-time${late[i] ? ' late' : ''}">${times[i]}</span>
            </div>
        `).join('');

    renderTable(allPatients);
}

function renderTable(patients: Patient[]): void {
    const tbody = document.getElementById('tableBody')!;
    if (patients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-msg">No patients found.</td></tr>';
        return;
    }
    tbody.innerHTML = patients.map(p => `
        <tr class="clickable" onclick="window.location.href='details.html?id=${p.id}'">
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:34px;height:34px;border-radius:50%;background:var(--blue);color:white;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;">
                        ${(p.firstName?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight:600;font-size:0.875rem;">${p.lastName}, ${p.firstName}</div>
                    </div>
                </div>
            </td>
            <td>${p.age ?? '—'}</td>
            <td><span class="badge badge-${p.sex === 'Male' ? 'male' : 'female'}">${p.sex || '—'}</span></td>
            <td>${p.bloodType || '—'}</td>
            <td>${p.contactNumber || '—'}</td>
            <td><span style="color:var(--blue);font-size:1.1rem;cursor:pointer;">→</span></td>
        </tr>
    `).join('');
}

document.getElementById('searchInput')!.addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase();
    renderTable(allPatients.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
    ));
});

loadPatients();
