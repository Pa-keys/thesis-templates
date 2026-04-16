import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';

interface Patient {
    id: string; // or number, depending on your patients table
    firstName: string;
    middleName: string;
    lastName: string;
    age: number | null;
    sex: string;
}

interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: string;
}

interface Prescription {
    prescription_id: number;
    consultation_id: number | null;
    patient_id: number;
    prescription_date: string;
    rx_content: string;
    doctor_name: string | null;
    license_no: number | null;
    ptr_no: string | null;
    status: string;
    dispensed_at: string | null;
    signature_url: string | null;
    patients: Patient; 
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const profile = await requireRole('pharmacist');
const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
document.getElementById('sidebarName')!.textContent = profile.fullName;
document.getElementById('topbarName')!.textContent  = profile.fullName;
document.getElementById('sidebarAv')!.textContent   = initials;
document.getElementById('topbarAv')!.textContent    = initials;
document.getElementById('logoutBtn')!.addEventListener('click', logout);

// ─── State ────────────────────────────────────────────────────────────────────
let pendingPrescriptions: Prescription[] = [];
let currentRxId: number | null = null;

// ─── Load Prescriptions ───────────────────────────────────────────────────────
async function loadPrescriptions(): Promise<void> {
    // 1. Fetch PENDING prescriptions with patient details attached via foreign key
    const { data, error } = await supabase
        .from('prescription')
        .select(`
            *,
            patients (
                id, firstName, middleName, lastName, age, sex
            )
        `)
        .eq('status', 'Pending')
        .order('prescription_id', { ascending: false }); // Sort by newest ID

    if (error) {
        console.error('Prescription fetch error:', error);
        document.getElementById('rxList')!.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <p>Could not load prescriptions.<br><small style="color:#DC2626;">${error.message}</small></p>
            </div>`;
        return;
    }

    pendingPrescriptions = (data as unknown) as Prescription[];

    // 2. Get dispensed today count for stats
    const today = new Date().toISOString().split('T')[0];
    const { count: dispensedCount } = await supabase
        .from('prescription')
        .select('prescription_id', { count: 'exact', head: true })
        .eq('status', 'Dispensed')
        .like('dispensed_at', `${today}%`); // Matches timestamps from today

    renderStats(dispensedCount || 0);
    renderRxList(pendingPrescriptions);
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function renderStats(dispensedToday: number): void {
    document.getElementById('pendingCount')!.textContent = String(pendingPrescriptions.length);
    document.getElementById('dispensedToday')!.textContent = String(dispensedToday);
}

// ─── Render Queue Cards ───────────────────────────────────────────────────────
function renderRxList(rxList: Prescription[]): void {
    const el = document.getElementById('rxList')!;

    if (rxList.length === 0) {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">☕</div>
                <p>No pending prescriptions in the queue.<br>Great job keeping up!</p>
            </div>`;
        return;
    }

    el.innerHTML = rxList.map(rx => {
        const pt = rx.patients;
        if (!pt) return ''; 

        const isMale = pt.sex === 'Male';
        const initial = (pt.firstName?.[0] || '?').toUpperCase();
        const ptFullName = `${pt.lastName || ''}, ${pt.firstName || ''} ${pt.middleName || ''}`.trim();
        
        // Parse date from prescription_date
        const dateObj = new Date(rx.prescription_date);
        const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : rx.prescription_date;

        // Parse JSON briefly just to count meds
        let medCount = 0;
        try {
            const parsed = JSON.parse(rx.rx_content);
            medCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch (e) {}

        return `
            <div class="pt-card" onclick="openRxModal(${rx.prescription_id})">
                <div class="pt-av" style="background: ${isMale ? 'var(--blue)' : '#EC4899'}">${initial}</div>
                <div class="pt-info">
                    <div class="pt-name">${ptFullName}</div>
                    <div class="pt-meta">
                        <span>👤 ${pt.sex || '—'}</span>
                        <span>🎂 ${pt.age ?? '—'} yrs</span>
                        <span style="color: #059669; font-weight: 700;">💊 ${medCount} Medication(s)</span>
                        ${rx.doctor_name ? `<span>👨‍⚕️ ${rx.doctor_name}</span>` : ''}
                    </div>
                </div>
                <div class="pt-right">
                    <span class="pt-date">${dateStr}</span>
                    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                        <span class="pending-badge">⏳ Pending Dispense</span>
                        <button class="view-btn" onclick="event.stopPropagation(); openRxModal(${rx.prescription_id})">👁️ Review</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ─── Search ───────────────────────────────────────────────────────────────────
document.getElementById('searchInput')!.addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase();
    renderRxList(pendingPrescriptions.filter(rx => {
        const pt = rx.patients;
        return pt && `${pt.firstName} ${pt.middleName} ${pt.lastName}`.toLowerCase().includes(q);
    }));
});

// ─── Modal: Open ─────────────────────────────────────────────────────────────
(window as any).openRxModal = function(rxId: number): void {
    const rx = pendingPrescriptions.find(x => x.prescription_id === rxId);
    if (!rx || !rx.patients) return;

    currentRxId = rxId;
    const pt = rx.patients;
    
    document.getElementById('modalTitle')!.textContent = `Prescription for ${pt.firstName} ${pt.lastName}`;
    
    const dateObj = new Date(rx.prescription_date);
    const displayDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-PH') : rx.prescription_date;
    document.getElementById('modalSub')!.textContent = `Issued on ${displayDate}`;
    
    document.getElementById('docLicense')!.textContent = rx.license_no ? `License No: ${rx.license_no}` : 'License No: N/A';
    
    const sigImg = document.getElementById('docSignature') as HTMLImageElement;
    if (rx.signature_url) {
        sigImg.src = rx.signature_url;
        sigImg.style.display = 'block';
    } else {
        sigImg.style.display = 'none';
    }

    // Parse and render medications table
    const tbody = document.getElementById('medTableBody')!;
    try {
        const meds: Medication[] = JSON.parse(rx.rx_content);
        if (Array.isArray(meds) && meds.length > 0) {
            tbody.innerHTML = meds.map(m => `
                <tr>
                    <td class="med-name">${m.name || '—'}</td>
                    <td>${m.dosage || '—'}</td>
                    <td>${m.frequency || '—'}</td>
                    <td>${m.duration || '—'}</td>
                    <td style="font-weight: 800;">${m.quantity || '—'}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94A3B8;">No medications found.</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#DC2626;">Failed to parse medication data.</td></tr>`;
    }

    document.getElementById('rxModal')!.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

// ─── Modal: Close ─────────────────────────────────────────────────────────────
(window as any).closeModal = function(): void {
    document.getElementById('rxModal')!.style.display = 'none';
    document.body.style.overflow = '';
    currentRxId = null;
};

document.getElementById('rxModal')!.addEventListener('click', (e) => {
    if (e.target === document.getElementById('rxModal')) (window as any).closeModal();
});

// ─── Modal: Dispense Save ────────────────────────────────────────────────────
(window as any).markDispensed = async function(e: Event): Promise<void> {
    e.preventDefault();
    if (!currentRxId) return;

    const btn = document.getElementById('dispenseBtn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = '⏳ Dispensing...';

    const { error } = await supabase
        .from('prescription')
        .update({ 
            status: 'Dispensed',
            dispensed_at: new Date().toISOString() // Saves the exact moment it was dispensed
        })
        .eq('prescription_id', currentRxId);

    btn.disabled = false;
    btn.textContent = '✅ Mark as Dispensed';

    if (error) { 
        alert('Error dispensing: ' + error.message); 
        return; 
    }

    // Refresh queue locally
    pendingPrescriptions = pendingPrescriptions.filter(p => p.prescription_id !== currentRxId);
    renderRxList(pendingPrescriptions);
    
    // Update stats manually
    const todayEl = document.getElementById('dispensedToday');
    if (todayEl) todayEl.textContent = String(parseInt(todayEl.textContent || '0') + 1);
    const pendingEl = document.getElementById('pendingCount');
    if (pendingEl) pendingEl.textContent = String(pendingPrescriptions.length);

    (window as any).closeModal();
};

// ─── Real-time ────────────────────────────────────────────────────────────────
supabase
    .channel('pharmacist-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prescription' }, () => loadPrescriptions())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'prescription' }, () => loadPrescriptions())
    .subscribe();

loadPrescriptions();