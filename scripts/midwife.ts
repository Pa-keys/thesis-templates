import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';

// 1. Synced interface to match details.tsx perfectly (fixed the "lacking" fields)
interface Patient {
    id: string; 
    firstName: string; middleName: string; lastName: string;
    age: number | null; sex: string; birthday: string; birthPlace: string;
    bloodType: string; nationality: string; religion: string; civilStatus: string;
    suffix: string; address: string; contactNumber: string;
    educationalAttain: string; employmentStatus: string;
    philhealthNo: string; philhealthStatus: string;
    category: string; categoryOthers: string;
    relativeName: string; relativeRelation: string; relativeAddress: string;
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

// ─── Load Patients ────────────────────────────────────────────────────────────
async function loadPatients(): Promise<void> {
    // 2. Fixed "firstName" by aliasing database snake_case to frontend camelCase
    const { data, error } = await supabase
        .from('patients')
        .select(`
            id,
            firstName:firstName,
            middleName: middleName,
            lastName:lastName,
            age, sex, birthday,
            birthPlace:birthPlace,
            bloodType:bloodType,
            nationality, religion,
            civilStatus:civilStatus,
            suffix, address,
            contactNumber:contactNumber,
            educationalAttain:educationalAttain,
            employmentStatus:employmentStatus,
            philhealthNo:philhealthNo,
            philhealthStatus:philhealthStatus,
            category,
            categoryOthers:categoryOthers,
            relativeName:relativeName,
            relativeRelation:relativeRelation,
            relativeAddress:relativeAddress,
            createdAt:created_at
        `)
        .order('created_at', { ascending: false }); // Fixed createdAt order 

    if (error) { 
        console.error('Database Fetch Error:', error); 
        return; 
    }
    
    allPatients = (data as Patient[]) || [];
    renderStats();
    renderPatients(allPatients);
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function renderStats(): void {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = allPatients.filter(p => p.createdAt && new Date(p.createdAt) >= weekAgo).length;

    document.getElementById('totalPatients')!.textContent = String(allPatients.length);
    document.getElementById('totalFemale')!.textContent   = String(allPatients.filter(p => p.sex === 'Female').length);
    document.getElementById('totalMale')!.textContent     = String(allPatients.filter(p => p.sex === 'Male').length);
    document.getElementById('newThisWeek')!.textContent   = String(newThisWeek);
}

// ─── Render patient cards ─────────────────────────────────────────────────────
function renderPatients(patients: Patient[]): void {
    const el = document.getElementById('patientList')!;
    document.getElementById('patientCount')!.textContent = `${patients.length} patient${patients.length !== 1 ? 's' : ''}`;

    if (patients.length === 0) {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👶</div>
                <p>No patients found.<br>Patients registered by BHW will appear here.</p>
            </div>`;
        return;
    }

    el.innerHTML = patients.map(p => {
        const isMale = p.sex === 'Male';
        const date = p.createdAt
            ? new Date(p.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—';
        const philStatus = p.philhealthStatus || '—';
        const category   = p.category === 'Other/s' ? `Others (${p.categoryOthers || 'unspecified'})` : (p.category || '—');

        return `
            <div class="pt-card" onclick="goToDetails('${p.id}')">
                <div class="pt-av${isMale ? ' male' : ''}">${(p.firstName?.[0] || '?').toUpperCase()}</div>
                <div class="pt-info">
                    <div class="pt-name">${p.lastName}, ${p.firstName} ${p.middleName || ''} ${p.suffix || ''}</div>
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
                    <button class="edit-btn" onclick="event.stopPropagation(); goToDetails('${p.id}')">✏️ Edit</button>
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

    (document.getElementById('ef_firstName')  as HTMLInputElement).value = p.firstName     || '';
    (document.getElementById('ef_middleName') as HTMLInputElement).value = p.middleName    || '';
    (document.getElementById('ef_lastName')   as HTMLInputElement).value = p.lastName      || '';
    (document.getElementById('ef_suffix')     as HTMLInputElement).value = p.suffix        || '';
    (document.getElementById('ef_address')    as HTMLInputElement).value = p.address       || '';
    (document.getElementById('ef_philhealthNo') as HTMLInputElement).value = p.philhealthNo || '';

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

    // 3. Send snake_case back to the database so it actually saves
    const dbUpdates = {
        first_name:        (document.getElementById('ef_firstName')    as HTMLInputElement).value,
        middle_name:       (document.getElementById('ef_middleName')   as HTMLInputElement).value,
        last_name:         (document.getElementById('ef_lastName')     as HTMLInputElement).value,
        suffix:            (document.getElementById('ef_suffix')       as HTMLInputElement).value,
        address:           (document.getElementById('ef_address')      as HTMLInputElement).value,
        philhealth_no:     (document.getElementById('ef_philhealthNo') as HTMLInputElement).value,
        philhealth_status: philhealthStatus,
        category:          category,
        category_others:   category === 'Other/s' ? categoryOthers : '',
    };

    const { data, error } = await supabase
        .from('patients')
        .update(dbUpdates)
        .eq('id', currentPatientId)
        .select();

    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save Changes';

    if (error) { alert('Error saving: ' + error.message); return; }
    if (!data || data.length === 0) { alert('Update blocked — check your Supabase RLS policies.'); return; }

    // Map back to camelCase for UI update
    const localUpdates = {
        firstName: dbUpdates.first_name,
        middleName: dbUpdates.middle_name,
        lastName: dbUpdates.last_name,
        suffix: dbUpdates.suffix,
        address: dbUpdates.address,
        philhealthNo: dbUpdates.philhealth_no,
        philhealthStatus: dbUpdates.philhealth_status,
        category: dbUpdates.category,
        categoryOthers: dbUpdates.category_others
    };

    allPatients = allPatients.map(p => p.id === currentPatientId ? { ...p, ...localUpdates } : p);
    renderPatients(allPatients);
    (window as any).closeModal();
};

// ─── Real-time ────────────────────────────────────────────────────────────────
supabase
    .channel('midwife-patients')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, () => {
        loadPatients();
    })
    .subscribe();

loadPatients();