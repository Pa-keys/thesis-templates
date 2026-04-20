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

// ─── Visit Trend Chart (dynamic from initial_consultation) ────────────────────
async function loadVisitTrendChart(): Promise<void> {
    // Build last 7 days array (oldest → newest)
    const days: { date: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0]; // e.g. "2026-04-14"
        const label = d.toLocaleDateString('en-PH', { weekday: 'short' }); // e.g. "Mon"
        days.push({ date: dateStr, label });
    }

    const from = days[0].date;
    const to   = days[days.length - 1].date;

    const { data, error } = await supabase
        .from('initial_consultation')
        .select('consultation_date')
        .gte('consultation_date', from)
        .lte('consultation_date', to);

    if (error) {
        console.error('Failed to load visit trend data:', error);
        return;
    }

    // Count visits per day
    const countMap: Record<string, number> = {};
    days.forEach(d => { countMap[d.date] = 0; });
    (data || []).forEach(row => {
        const dateKey = row.consultation_date?.split('T')[0];
        if (dateKey && countMap[dateKey] !== undefined) {
            countMap[dateKey]++;
        }
    });

    const labels  = days.map(d => d.label);
    const counts  = days.map(d => countMap[d.date]);

    const ctx = (document.getElementById('visitChart') as HTMLCanvasElement).getContext('2d')!;
    new (window as any).Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: counts,
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
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 }, color: '#94A3B8' }
                },
                y: {
                    grid: { color: '#F1F5F9' },
                    ticks: { font: { size: 11 }, color: '#94A3B8', stepSize: 1, precision: 0 },
                    beginAtZero: true
                }
            }
        }
    });
}

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
    const { data: existingConsults, error: consultError } = await supabase
        .from('consultation')
        .select('initial_consultation_id')
        .not('initial_consultation_id', 'is', null);

    if (consultError) {
        console.error('Failed to fetch existing consultations:', consultError);
    }

    const consultedIds: number[] = (existingConsults || [])
        .map(c => c.initial_consultation_id)
        .filter(Boolean);

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

// ─── Morbidity Rate Chart (dynamic from initial_consultation diagnosis) ────────
async function loadMorbidityChart(): Promise<void> {
    const KNOWN_ILLNESSES = [
        'Common Cold',
        'Pneumonia',
        'High Blood Pressure',
        'Diabetes',
        'Asthma',
        'Dengue',
        'Fever',
        'Diarrhea',
        'UTI',
        'Tuberculosis',
        'High Cholesterol',
        'Heart Disease',
        'Stroke',
        'Acid Reflux',
        'Arthritis',
    ];

    const { data, error } = await supabase
        .from('initial_consultation')
        .select('diagnosis')
        .not('diagnosis', 'is', null);

    if (error) {
        console.error('Failed to load morbidity data:', error);
        return;
    }

    // Count each diagnosis — match known illnesses case-insensitively, rest → Others
    const countMap: Record<string, number> = {};
    KNOWN_ILLNESSES.forEach(ill => { countMap[ill] = 0; });
    countMap['Others'] = 0;

    (data || []).forEach(row => {
        const raw = (row.diagnosis || '').trim();
        const match = KNOWN_ILLNESSES.find(
            ill => ill.toLowerCase() === raw.toLowerCase()
        );
        if (match) {
            countMap[match]++;
        } else if (raw) {
            countMap['Others']++;
        }
    });

    // Only show illnesses that have at least 1 case, sorted descending
    const allLabels = [...KNOWN_ILLNESSES, 'Others'];
    const filtered = allLabels
        .map(label => ({ label, count: countMap[label] }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

    if (filtered.length === 0) {
        const canvas = document.getElementById('morbidityChart') as HTMLCanvasElement | null;
        if (canvas) {
            const parent = canvas.parentElement;
            if (parent) parent.innerHTML = '<div style="text-align:center;color:#94A3B8;font-size:0.85rem;padding:2rem 0;">No diagnosis data yet.</div>';
        }
        return;
    }

    const labels = filtered.map(i => i.label);
    const counts = filtered.map(i => i.count);
    const total  = counts.reduce((a, b) => a + b, 0);

    // Color palette — cycles if more items than colors
    const COLORS = [
        '#0066FF', '#7C3AED', '#059669', '#DC2626', '#D97706',
        '#0891B2', '#DB2777', '#65A30D', '#EA580C', '#4F46E5',
        '#0D9488', '#B45309', '#9333EA', '#16A34A', '#E11D48',
        '#6366F1',
    ];
    const bgColors = labels.map((_, i) => COLORS[i % COLORS.length] + '33'); // 20% opacity
    const bdColors = labels.map((_, i) => COLORS[i % COLORS.length]);

    const ctx = (document.getElementById('morbidityChart') as HTMLCanvasElement).getContext('2d')!;
    new (window as any).Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: counts,
                backgroundColor: bgColors,
                borderColor: bdColors,
                borderWidth: 2,
                borderRadius: 6,
            }]
        },
        options: {
            indexAxis: 'y',   // horizontal bar — easier to read disease names
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx: any) => {
                            const val = ctx.parsed.x;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                            return ` ${val} case${val !== 1 ? 's' : ''} (${pct}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#F1F5F9' },
                    ticks: {
                        font: { size: 11 },
                        color: '#94A3B8',
                        stepSize: 1,
                        precision: 0,
                    },
                    beginAtZero: true,
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11 }, color: '#374151' },
                }
            }
        }
    });

    // Update morbidity stat badges if they exist in the DOM
    const topDisease = filtered[0];
    const topEl = document.getElementById('topDisease');
    const topCountEl = document.getElementById('topDiseaseCount');
    const totalCasesEl = document.getElementById('totalMorbidityCases');
    if (topEl) topEl.textContent = topDisease.label;
    if (topCountEl) topCountEl.textContent = String(topDisease.count);
    if (totalCasesEl) totalCasesEl.textContent = String(total);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
loadVisitTrendChart();
loadMorbidityChart();
loadPatients();