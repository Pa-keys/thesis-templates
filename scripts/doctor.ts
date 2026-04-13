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

interface ConsultationQueueItem {
    patient_id: string;
    consultation_date: string;
    consultation_time: string | null;
    patients: {
        firstName: string;
        lastName: string;
        sex: string;
        bloodType: string;
    };
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

    document.getElementById('totalPatients')!.textContent = String(allPatients.length);
    document.getElementById('visitsToday')!.textContent   = String(Math.min(allPatients.length, 24));
    document.getElementById('pendingReports')!.textContent = '7';

    renderTable(allPatients);
    await loadConsultationQueue();
}

// ─── Load Patient Queue from initial_consultation ─────────────────────────────
async function loadConsultationQueue(): Promise<void> {
    const { data, error } = await supabase
        .from('initial_consultation')
        .select(`
            patient_id,
            consultation_date,
            consultation_time,
            patients (
                firstName,
                lastName,
                sex,
                bloodType
            )
        `)
        .order('consultation_date', { ascending: false })
        .order('consultation_time', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Failed to load consultation queue:', error);
        document.getElementById('patientQueue')!.innerHTML =
            '<div class="loading-msg">Failed to load queue.</div>';
        return;
    }

    const records = (data as unknown as ConsultationQueueItem[]) || [];
    document.getElementById('queueCount')!.textContent = String(records.length);

    if (records.length === 0) {
        document.getElementById('patientQueue')!.innerHTML =
            '<div class="loading-msg">No recent consultations.</div>';
        return;
    }

    document.getElementById('patientQueue')!.innerHTML = records.map(r => {
        const p = r.patients;
        const firstName = p?.firstName || '?';
        const lastName  = p?.lastName  || '';
        const sex       = p?.sex       || '—';
        const blood     = p?.bloodType || '—';
        const avatar    = firstName[0].toUpperCase();

        let timeLabel = '—';
        if (r.consultation_time) {
            const [h, m] = r.consultation_time.split(':');
            const hour = parseInt(h);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            timeLabel = `${hour12}:${m} ${ampm}`;
        } else if (r.consultation_date) {
            timeLabel = new Date(r.consultation_date).toLocaleDateString([], {
                month: 'short', day: 'numeric'
            });
        }

        // Navigate to consultation.html with the patient's ID in the URL
        return `
            <div class="q-item" onclick="window.location.href='consultation.html?id=${r.patient_id}'" style="cursor:pointer;">
                <div class="q-av">${avatar}</div>
                <div class="q-info">
                    <div class="q-name">${firstName} ${lastName}</div>
                    <div class="q-sub">${sex} · ${blood}</div>
                </div>
                <span class="q-time">${timeLabel}</span>
            </div>
        `;
    }).join('');
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
