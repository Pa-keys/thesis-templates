import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';

interface Patient {
    id: string;
    firstName: string; middleName: string; lastName: string;
    age: number | null; sex: string; bloodType: string;
    address: string; philhealthStatus: string;
    category: string; categoryOthers: string;
    createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const profile = await requireRole('nurse');
const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
document.getElementById('sidebarName')!.textContent = profile.fullName;
document.getElementById('topbarName')!.textContent  = profile.fullName;
document.getElementById('sidebarAv')!.textContent   = initials;
document.getElementById('topbarAv')!.textContent    = initials;
document.getElementById('logoutBtn')!.addEventListener('click', logout);

// ─── State ────────────────────────────────────────────────────────────────────
let consentedPatients: Patient[] = [];

// ─── Load only patients WITH signed consent ───────────────────────────────────
async function loadPatients(): Promise<void> {
    const { data: consents, error: consentError } = await supabase
        .from('patients')
        .select('id')
        .not('consent_signature', 'is', null)
        .neq('consent_signature', '');

    if (consentError) { console.error('Consent fetch error:', consentError); return; }

    const signedIds = (consents || []).map((c: any) => c.id);

    const { count: totalCount } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true });

    if (signedIds.length === 0) {
        document.getElementById('totalPatients')!.textContent  = String(totalCount || 0);
        document.getElementById('consentedCount')!.textContent = '0';
        document.getElementById('totalFemale')!.textContent    = '0';
        document.getElementById('totalMale')!.textContent      = '0';
        document.getElementById('patientCount')!.textContent   = '0 patients';
        document.getElementById('patientList')!.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⏳</div>
                <p>No consented patients yet.<br>Patients will appear here once their consent is signed.</p>
            </div>`;
        return;
    }

    const { data, error } = await supabase
        .from('patients')
        .select('id, firstName, middleName, lastName, age, sex, bloodType, address, philhealthStatus, category, categoryOthers, createdAt:created_at')
        .in('id', signedIds)
        .order('created_at', { ascending: false });

    if (error) { console.error('Patient fetch error:', error); return; }

    consentedPatients = (data as Patient[]) || [];

    document.getElementById('totalPatients')!.textContent  = String(totalCount || 0);
    document.getElementById('consentedCount')!.textContent = String(consentedPatients.length);
    document.getElementById('totalFemale')!.textContent    = String(consentedPatients.filter(p => p.sex === 'Female').length);
    document.getElementById('totalMale')!.textContent      = String(consentedPatients.filter(p => p.sex === 'Male').length);

    renderPatients(consentedPatients);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderPatients(patients: Patient[]): void {
    const el = document.getElementById('patientList')!;
    document.getElementById('patientCount')!.textContent = `${patients.length} patient${patients.length !== 1 ? 's' : ''}`;

    if (patients.length === 0) {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⏳</div>
                <p>No consented patients match your search.</p>
            </div>`;
        return;
    }

    el.innerHTML = patients.map(p => {
        const isMale = p.sex === 'Male';
        const date = p.createdAt
            ? new Date(p.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—';
        const category = p.category === 'Other/s'
            ? `Others (${p.categoryOthers || 'unspecified'})`
            : (p.category || '—');

        return `
            <div class="pt-card" onclick="window.location.href='initial_consultation.html?id=${p.id}'">
                <div class="pt-av${isMale ? ' male' : ''}">${(p.firstName?.[0] || '?').toUpperCase()}</div>
                <div class="pt-info">
                    <div class="pt-name">${p.lastName}, ${p.firstName} ${p.middleName || ''}</div>
                    <div class="pt-meta">
                        <span>👤 ${p.sex || '—'}</span>
                        <span>🎂 ${p.age ?? '—'} yrs</span>
                        <span>🩸 ${p.bloodType || '—'}</span>
                        <span>🏥 ${p.philhealthStatus || '—'}</span>
                        <span>📋 ${category}</span>
                    </div>
                    <div class="pt-meta" style="margin-top:2px;">
                        <span>📍 ${p.address || 'No address'}</span>
                    </div>
                </div>
                <div class="pt-right">
                    <span class="pt-date">Registered<br>${date}</span>
                    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                        <span class="consented-badge">✅ Consent Signed</span>
                        <button class="view-btn" onclick="event.stopPropagation(); window.location.href='initial_consultation.html?id=${p.id}'">
                            📋 Consult
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ─── Search ───────────────────────────────────────────────────────────────────
document.getElementById('searchInput')!.addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase();
    renderPatients(consentedPatients.filter(p =>
        `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase().includes(q)
    ));
});

// ─── Real-time ────────────────────────────────────────────────────────────────
supabase
    .channel('nurse-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, () => loadPatients())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patients' }, () => loadPatients())
    .subscribe();

loadPatients();