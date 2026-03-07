import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─── Supabase Init ────────────────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase    = createClient(supabaseUrl, supabaseKey);

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const detailsDiv    = document.getElementById('fullDetails');
const editForm      = document.getElementById('editForm');
const editBtn       = document.getElementById('editBtn');
const deleteBtn     = document.getElementById('deleteBtn');
const fullNameTitle = document.getElementById('fullNameTitle');

// ─── Get patient ID from URL ──────────────────────────────────────────────────
const patientId = new URLSearchParams(window.location.search).get('id');

// ─── Bootstrap ────────────────────────────────────────────────────────────────
if (!patientId) {
    showError('No patient ID provided in URL.');
} else {
    loadPatient();
}

// ─── 1. LOAD PATIENT FROM SUPABASE ───────────────────────────────────────────
async function loadPatient() {
    const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

    if (error || !patient) {
        showError('Patient not found. They may have been deleted.');
        return;
    }

    renderView(patient);
    prefillForm(patient);
    bindFormSubmit(patient);
    bindDelete();
}

// ─── 2. RENDER READ-ONLY VIEW ─────────────────────────────────────────────────
function renderView(p) {
    fullNameTitle.innerText = `${p.firstName} ${p.lastName}`;

    detailsDiv.innerHTML = `
        <div class="profile-section">
            <h3>Personal Information</h3>
            <p><strong>Full Name:</strong> ${p.firstName} ${p.middleName || ''} ${p.lastName}</p>
            <p><strong>Age:</strong> ${p.age ?? 'N/A'}</p>
            <p><strong>Sex:</strong> ${p.sex || 'N/A'}</p>
            <p><strong>Birthday:</strong> ${p.birthday || 'N/A'}</p>
            <p><strong>Birthplace:</strong> ${p.birthPlace || 'N/A'}</p>
            <p><strong>Blood Type:</strong> ${p.bloodType || 'N/A'}</p>
            <p><strong>Nationality:</strong> ${p.nationality || 'N/A'}</p>
            <p><strong>Religion:</strong> ${p.religion || 'N/A'}</p>
            <p><strong>Address:</strong> ${p.address || 'N/A'}</p>
            <p><strong>Contact Number:</strong> ${p.contactNumber || 'N/A'}</p>
            <p><strong>Education:</strong> ${p.educationalAttain || 'N/A'}</p>
            <p><strong>Employment Status:</strong> ${p.employmentStatus || 'N/A'}</p>
            <hr>
            <h3>Emergency Contact</h3>
            <p><strong>Relative Name:</strong> ${p.relativeName || 'N/A'}</p>
            <p><strong>Relationship:</strong> ${p.relativeRelation || 'N/A'}</p>
            <p><strong>Relative Address:</strong> ${p.relativeAddress || 'N/A'}</p>
        </div>
    `;
}

// ─── 3. PRE-FILL EDIT FORM ────────────────────────────────────────────────────
function prefillForm(p) {
    document.getElementById('editFN').value      = p.firstName     || '';
    document.getElementById('editMN').value      = p.middleName    || '';
    document.getElementById('editLN').value      = p.lastName      || '';
    document.getElementById('editAge').value     = p.age           ?? '';
    document.getElementById('editAddress').value = p.address       || '';
    document.getElementById('editContact').value = p.contactNumber || '';
    document.getElementById('editBlood').value   = p.bloodType     || 'O+';
}

// ─── 4. TOGGLE EDIT / VIEW MODE ──────────────────────────────────────────────
window.toggleEdit = function () {
    const isViewing = editForm.style.display === 'none';
    editForm.style.display   = isViewing ? 'block' : 'none';
    detailsDiv.style.display = isViewing ? 'none'  : 'block';
    editBtn.innerText        = isViewing ? 'Cancel Editing' : 'Edit Record';
};

// ─── 5. SAVE UPDATED RECORD TO SUPABASE ──────────────────────────────────────
function bindFormSubmit(originalPatient) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const updates = {
            firstName:     document.getElementById('editFN').value,
            middleName:    document.getElementById('editMN').value,
            lastName:      document.getElementById('editLN').value,
            age:           parseInt(document.getElementById('editAge').value),
            address:       document.getElementById('editAddress').value,
            contactNumber: document.getElementById('editContact').value,
            bloodType:     document.getElementById('editBlood').value,
        };

        const { error } = await supabase
            .from('patients')
            .update(updates)
            .eq('id', patientId);

        if (error) {
            alert('Error updating record: ' + error.message);
            console.error('Update error:', error);
            return;
        }

        alert('Record updated successfully!');
        const updatedPatient = { ...originalPatient, ...updates };
        renderView(updatedPatient);
        prefillForm(updatedPatient);
        toggleEdit();
    });
}

// ─── 6. DELETE RECORD FROM SUPABASE ──────────────────────────────────────────
function bindDelete() {
    deleteBtn.addEventListener('click', async () => {
        if (!confirm('Permanently delete this patient record? This cannot be undone.')) return;

        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', patientId);

        if (error) {
            alert('Error deleting record: ' + error.message);
            console.error('Delete error:', error);
            return;
        }

        alert('Record deleted.');
        window.location.href = 'templates.html';
    });
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function showError(msg) {
    fullNameTitle.innerText = 'Error';
    detailsDiv.innerHTML    = `<p style="color:#e53e3e; font-weight:600;">${msg}</p>`;
    editBtn.disabled        = true;
    deleteBtn.disabled      = true;
}