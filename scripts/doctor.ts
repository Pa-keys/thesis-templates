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
    initialconsultation_id: number;
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

interface FollowUpItem {
    consultation_id: string;
    patient_id: string;
    visit_date: string;
    visit_time: string | null;
    medication_treatment: string | null;
    follow_up_status: string | null;
    patients: {
        firstName: string;
        lastName: string;
        sex: string;
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
    await loadFollowUps();
}

// ─── Load Patient Queue from initial_consultation ─────────────────────────────
async function loadConsultationQueue(): Promise<void> {
    // ✅ Correct column name in `consultation` table is `initial_consultation_id`
    const { data: existingConsults, error: consultError } = await supabase
        .from('consultation')
        .select('initial_consultation_id')
        .not('initial_consultation_id', 'is', null);

    if (consultError) {
        console.error('Failed to fetch existing consultations:', consultError);
    }

    // Filter out nulls and extract the IDs
    const consultedIds: number[] = (existingConsults || [])
        .map(c => c.initial_consultation_id)
        .filter(Boolean);

    // ✅ Correct column name in `initial_consultation` table is `initialconsultation_id`
    const query = supabase
        .from('initial_consultation')
        .select(`
            initialconsultation_id,
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

    // ✅ Exclude initial_consultations that already have a saved consultation record
    if (consultedIds.length > 0) {
        query.not('initialconsultation_id', 'in', `(${consultedIds.join(',')})`);
    }

    const { data, error } = await query;

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
            '<div class="loading-msg">No patients in queue.</div>';
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

        return `
            <div class="queue-item" onclick="window.location.href='consultation.html?id=${r.patient_id}&icid=${r.initialconsultation_id}'" style="cursor:pointer;">
                <div class="queue-av">${avatar}</div>
                <div class="queue-info">
                    <div class="queue-name">${firstName} ${lastName}</div>
                    <div class="queue-meta">${sex} · ${blood}</div>
                </div>
                <span class="queue-time">${timeLabel}</span>
            </div>
        `;
    }).join('');
}

// ─── Load Follow-Ups from follow_up table ────────────────────────────────────
async function loadFollowUps(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('follow_up')
        .select(`
            consultation_id,
            patient_id,
            visit_date,
            visit_time,
            medication_treatment,
            follow_up_status,
            patients (
                firstName,
                lastName,
                sex
            )
        `)
        .not('visit_date', 'is', null)
        .gte('visit_date', today)
        .neq('follow_up_status', 'done')
        .order('visit_date', { ascending: true })
        .order('visit_time', { ascending: true })
        .limit(5);

    if (error) {
        console.error('Failed to load follow-ups:', error);
        document.getElementById('followUpList')!.innerHTML =
            '<div class="loading-msg">Failed to load follow-ups.</div>';
        return;
    }

    const records = (data as unknown as FollowUpItem[]) || [];

    const todayCount = records.filter(r => r.visit_date?.split('T')[0] === today).length;
    document.getElementById('followUpToday')!.textContent = String(todayCount);
    document.getElementById('followUpCount')!.textContent = String(records.length);

    if (todayCount > 0) {
        document.getElementById('followUpHint')!.textContent = `${todayCount} due today`;
        document.getElementById('followUpHint')!.className = 'stat-hint down';
    }

    if (records.length === 0) {
        document.getElementById('followUpList')!.innerHTML =
            '<div class="loading-msg">No upcoming follow-ups.</div>';
        return;
    }

    document.getElementById('followUpList')!.innerHTML = records.map(r => {
        const p = r.patients;
        const firstName = p?.firstName || '?';
        const lastName  = p?.lastName  || '';
        const sex       = p?.sex       || '—';
        const avatar    = firstName[0].toUpperCase();

        const rawDate = r.visit_date?.split('T')[0] ?? '';
        const isToday = rawDate === today;
        const followDate = rawDate ? new Date(rawDate + 'T00:00:00') : null;
        const dateLabel = isToday
            ? 'Today'
            : followDate && !isNaN(followDate.getTime())
                ? followDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
                : '—';

        let timeLabel = '';
        if (r.visit_time) {
            const [h, m] = r.visit_time.split(':');
            const hour = parseInt(h);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            timeLabel = ` · ${hour % 12 || 12}:${m} ${ampm}`;
        }

        const badgeStyle = isToday
            ? 'background:#fef3c7;color:#d97706;border:1px solid #fde68a;'
            : 'background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;';

        const treatment = r.medication_treatment
            ? r.medication_treatment.length > 22
                ? r.medication_treatment.slice(0, 22) + '…'
                : r.medication_treatment
            : null;

        return `
            <div class="queue-item" onclick="window.location.href='consultation.html?id=${r.patient_id}'" style="cursor:pointer;">
                <div class="queue-av" style="background:#7c3aed;">${avatar}</div>
                <div class="queue-info">
                    <div class="queue-name">${firstName} ${lastName}</div>
                    <div class="queue-meta">${sex}${treatment ? ' · ' + treatment : ''}</div>
                </div>
                <span style="font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;${badgeStyle}">${dateLabel}${timeLabel}</span>
            </div>
        `;
    }).join('');
}

// ─── Render Patient Table ─────────────────────────────────────────────────────
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

// ─── Search ───────────────────────────────────────────────────────────────────
document.getElementById('searchInput')!.addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase();
    renderTable(allPatients.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
    ));
});

// ─── Init ─────────────────────────────────────────────────────────────────────
loadPatients();