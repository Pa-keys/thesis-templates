import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';

interface Patient {
    id: string;
    firstName: string; middleName: string; lastName: string;
    age: number | null; sex: string; bloodType: string;
    address: string; philhealthStatus: string;
    category: string; categoryOthers: string;
    suffix: string; philhealthNo: string;
    createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const profile = await requireRole('midwives');
const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
document.getElementById('sidebarName')!.textContent = profile.fullName;
document.getElementById('topbarName')!.textContent  = profile.fullName;
document.getElementById('sidebarAv')!.textContent   = initials;
document.getElementById('topbarAv')!.textContent    = initials;
document.getElementById('logoutBtn')!.addEventListener('click', logout);

// ─── State ────────────────────────────────────────────────────────────────────
let allPatients: Patient[] = [];
let currentPatientId: string | null = null;

// ─── Load Patients WITHOUT consent ───────────────────────────────────────────
async function loadPatients(): Promise<void> {
    // 1. Get all patient IDs that already have a consent signature
    const { data: consents, error: consentError } = await supabase
        .from('patients')
        .select('id')
        .not('consent_signature', 'is', null)
        .neq('consent_signature', '');

    if (consentError) { console.error('Consent fetch error:', consentError); return; }

    const signedIds = new Set((consents || []).map((c: any) => c.id));

    // 2. Get total patient count for stats
    const { count: totalCount } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true });

    // 3. Fetch ALL patients
    const { data, error } = await supabase
        .from('patients')
        .select('id, firstName, middleName, lastName, age, sex, bloodType, address, philhealthNo, philhealthStatus, category, categoryOthers, suffix, createdAt:created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Patient fetch error:', error);
        document.getElementById('patientList')!.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <p>Could not load patients.<br><small style="color:#DC2626;">${error.message}</small></p>
            </div>`;
        return;
    }

    // 4. Keep only patients who have NOT signed
    allPatients = ((data as Patient[]) || []).filter(p => !signedIds.has(p.id));

    renderStats(totalCount || 0);
    renderPatients(allPatients);
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function renderStats(totalAll: number): void {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = allPatients.filter(p => p.createdAt && new Date(p.createdAt) >= weekAgo).length;

    document.getElementById('totalPatients')!.textContent  = String(totalAll);
    document.getElementById('pendingConsent')!.textContent = String(allPatients.length);
    document.getElementById('totalFemale')!.textContent    = String(allPatients.filter(p => p.sex === 'Female').length);
    document.getElementById('newThisWeek')!.textContent    = String(newThisWeek);

    // Only update if element exists in HTML
    const maleEl = document.getElementById('totalMale');
    if (maleEl) maleEl.textContent = String(allPatients.filter(p => p.sex === 'Male').length);
}

// ─── Render patient cards ─────────────────────────────────────────────────────
function renderPatients(patients: Patient[]): void {
    const el = document.getElementById('patientList')!;
    document.getElementById('patientCount')!.textContent = `${patients.length} awaiting consent`;

    if (patients.length === 0) {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <p>All patients have signed their consent.<br>They will now appear on the Nurse's dashboard.</p>
            </div>`;
        return;
    }

    el.innerHTML = patients.map(p => {
        const isMale = p.sex === 'Male';
        const date = p.createdAt
            ? new Date(p.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—';
        const philStatus = p.philhealthStatus || '—';
        const category   = p.category === 'Other/s'
            ? `Others (${p.categoryOthers || 'unspecified'})`
            : (p.category || '—');

        return `
            <div class="pt-card" onclick="goToDetails('${p.id}')">
                <div class="pt-av${isMale ? ' male' : ''}">${(p.firstName?.[0] || '?').toUpperCase()}</div>
                <div class="pt-info">
                    <div class="pt-name">${p.lastName || '—'}, ${p.firstName || '—'} ${p.middleName || ''} ${p.suffix || ''}</div>
                    <div class="pt-meta">
                        <span>👤 ${p.sex || '—'}</span>
                        <span>🎂 ${p.age ?? '—'} yrs</span>
                        <span>🩸 ${p.bloodType || '—'}</span>
                        <span>🏥 ${philStatus}</span>
                        <span>📋 ${category}</span>
                    </div>
                    <div class="pt-meta" style="margin-top:2px;">
                        <span>📍 ${p.address || 'No address'}</span>
                    </div>
                </div>
                <div class="pt-right">
                    <span class="pt-date">Registered<br>${date}</span>
                    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                        <span class="no-consent-badge">⚠️ No Consent</span>
                        <button class="edit-btn" onclick="event.stopPropagation(); openModal('${p.id}')">✏️ Edit</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ─── Navigation ───────────────────────────────────────────────────────────────
(window as any).goToDetails = function(patientId: string): void {
    window.location.href = `details.html?id=${patientId}`;
};

// ─── Search ───────────────────────────────────────────────────────────────────
document.getElementById('searchInput')!.addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase();
    renderPatients(allPatients.filter(p =>
        `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase().includes(q)
    ));
});

// ─── Modal: Open ─────────────────────────────────────────────────────────────
(window as any).openModal = function(patientId: string): void {
    const p = allPatients.find(x => x.id === patientId);
    if (!p) return;

    currentPatientId = patientId;
    document.getElementById('modalTitle')!.textContent = `Edit: ${p.firstName} ${p.lastName}`;

    (document.getElementById('ef_firstName')    as HTMLInputElement).value = p.firstName     || '';
    (document.getElementById('ef_middleName')   as HTMLInputElement).value = p.middleName    || '';
    (document.getElementById('ef_lastName')     as HTMLInputElement).value = p.lastName      || '';
    (document.getElementById('ef_suffix')       as HTMLInputElement).value = p.suffix        || '';
    (document.getElementById('ef_address')      as HTMLInputElement).value = p.address       || '';
    (document.getElementById('ef_philhealthNo') as HTMLInputElement).value = p.philhealthNo  || '';

    document.querySelectorAll('#philhealthStatusGroup .radio-opt').forEach(el => el.classList.remove('sel'));
    const philRadio = document.querySelector(`input[name="ef_philhealthStatus"][value="${p.philhealthStatus}"]`) as HTMLInputElement;
    if (philRadio) { philRadio.checked = true; philRadio.closest('.radio-opt')?.classList.add('sel'); }

    document.querySelectorAll('#categoryGroup .radio-opt').forEach(el => el.classList.remove('sel'));
    const catRadio = document.querySelector(`input[name="ef_category"][value="${p.category}"]`) as HTMLInputElement;
    if (catRadio) { catRadio.checked = true; catRadio.closest('.radio-opt')?.classList.add('sel'); }

    const othersField = document.getElementById('othersField')!;
    othersField.style.display = p.category === 'Other/s' ? 'block' : 'none';
    (document.getElementById('ef_categoryOthers') as HTMLInputElement).value = p.categoryOthers || '';

    document.getElementById('editModal')!.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

// ─── Modal: Close ─────────────────────────────────────────────────────────────
(window as any).closeModal = function(): void {
    document.getElementById('editModal')!.style.display = 'none';
    document.body.style.overflow = '';
    currentPatientId = null;
};

document.getElementById('editModal')!.addEventListener('click', (e) => {
    if (e.target === document.getElementById('editModal')) (window as any).closeModal();
});

// ─── Radio highlight ──────────────────────────────────────────────────────────
document.querySelectorAll('.radio-opt input[type="radio"]').forEach(input => {
    input.addEventListener('change', (e) => {
        const radio = e.target as HTMLInputElement;
        const group = radio.closest('.radio-group');
        group?.querySelectorAll('.radio-opt').forEach(opt => opt.classList.remove('sel'));
        radio.closest('.radio-opt')?.classList.add('sel');
        if (radio.name === 'ef_category') {
            document.getElementById('othersField')!.style.display = radio.value === 'Other/s' ? 'block' : 'none';
        }
    });
});

// ─── Modal: Save ─────────────────────────────────────────────────────────────
(window as any).handleSave = async function(e: Event): Promise<void> {
    e.preventDefault();
    if (!currentPatientId) return;

    const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';

    const philhealthStatus = (document.querySelector('input[name="ef_philhealthStatus"]:checked') as HTMLInputElement)?.value || '';
    const category         = (document.querySelector('input[name="ef_category"]:checked') as HTMLInputElement)?.value || '';
    const categoryOthers   = (document.getElementById('ef_categoryOthers') as HTMLInputElement).value;

    const updates = {
        firstName:       (document.getElementById('ef_firstName')    as HTMLInputElement).value,
        middleName:      (document.getElementById('ef_middleName')   as HTMLInputElement).value,
        lastName:        (document.getElementById('ef_lastName')     as HTMLInputElement).value,
        suffix:          (document.getElementById('ef_suffix')       as HTMLInputElement).value,
        address:         (document.getElementById('ef_address')      as HTMLInputElement).value,
        philhealthNo:    (document.getElementById('ef_philhealthNo') as HTMLInputElement).value,
        philhealthStatus,
        category,
        categoryOthers: category === 'Other/s' ? categoryOthers : '',
    };

    const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', currentPatientId)
        .select();

    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save Changes';

    if (error) { alert('Error saving: ' + error.message); return; }
    if (!data || data.length === 0) { alert('Update blocked — check your Supabase RLS policies.'); return; }

    allPatients = allPatients.map(p => p.id === currentPatientId ? { ...p, ...updates } : p);
    renderPatients(allPatients);
    (window as any).closeModal();
};

// ─── Real-time ────────────────────────────────────────────────────────────────
supabase
    .channel('midwife-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, () => loadPatients())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patients' }, () => loadPatients())
    .subscribe();

loadPatients();