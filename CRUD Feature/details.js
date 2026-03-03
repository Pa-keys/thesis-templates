const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');
let records = JSON.parse(localStorage.getItem('patientRecords')) || [];
const patient = records[patientId];

const detailsDiv = document.getElementById('fullDetails');
const form = document.getElementById('editForm');

if (patient) {
    renderView();
    prefillForm();
} else {
    detailsDiv.innerHTML = "<h2>Error: Patient not found.</h2>";
}

// 1. DISPLAY FULL INFORMATION (View Mode)
function renderView() {
    document.getElementById('fullNameTitle').innerText = `${patient.firstName} ${patient.lastName}`;
    
    detailsDiv.innerHTML = `
        <div class="profile-section">
            <h3>Personal Information</h3>
            <p><strong>Full Name:</strong> ${patient.firstName} ${patient.middleName || ''} ${patient.lastName}</p>
            <p><strong>Age:</strong> ${patient.age}</p>
            <p><strong>Sex:</strong> ${patient.sex}</p>
            <p><strong>Birthday:</strong> ${patient.birthday || 'N/A'}</p>
            <p><strong>Birthplace:</strong> ${patient.birthPlace || 'N/A'}</p>
            <p><strong>Blood Type:</strong> ${patient.bloodType || 'N/A'}</p>
            <p><strong>Address:</strong> ${patient.address}</p>
            <p><strong>Contact Number:</strong> ${patient.contactNumber || 'N/A'}</p>
            <p><strong>Nationality:</strong> ${patient.nationality || 'N/A'}</p>
            <p><strong>Religion:</strong> ${patient.religion || 'N/A'}</p>
            <p><strong>Education:</strong> ${patient.educationalAttain || 'N/A'}</p>
            <p><strong>Employment Status:</strong> ${patient.employmentStatus || 'N/A'}</p>
            <hr>
            <h3>Emergency Contact</h3>
            <p><strong>Relative Name:</strong> ${patient.relativeName || 'N/A'}</p>
            <p><strong>Relationship:</strong> ${patient.relativeRelation || 'N/A'}</p>
        </div>
    `;
}

// 2. PRE-FILL EDIT FORM (Crucial for showing existing data)
function prefillForm() {
    document.getElementById('editFN').value = patient.firstName || "";
    document.getElementById('editMN').value = patient.middleName || "";
    document.getElementById('editLN').value = patient.lastName || "";
    document.getElementById('editAge').value = patient.age || "";
    document.getElementById('editAddress').value = patient.address || "";
    // THIS LINE FIXES THE CONTACT NUMBER ISSUE
    document.getElementById('editContact').value = patient.contactNumber || "";
}

function toggleEdit() {
    const isViewing = form.style.display === "none";
    form.style.display = isViewing ? "block" : "none";
    detailsDiv.style.display = isViewing ? "none" : "block";
    document.getElementById('editBtn').innerText = isViewing ? "Cancel Editing" : "Edit Record";
}

// 3. SAVE UPDATED DATA
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Update the record with new values
    records[patientId].firstName = document.getElementById('editFN').value;
    records[patientId].middleName = document.getElementById('editMN').value;
    records[patientId].lastName = document.getElementById('editLN').value;
    records[patientId].age = document.getElementById('editAge').value;
    records[patientId].address = document.getElementById('editAddress').value;
    records[patientId].contactNumber = document.getElementById('editContact').value;

    localStorage.setItem('patientRecords', JSON.stringify(records));
    alert("Record Updated Successfully!");
    location.reload(); 
});

// 4. DELETE LOGIC
document.getElementById('deleteBtn').onclick = () => {
    if (confirm("Permanently delete this record?")) {
        records.splice(patientId, 1);
        localStorage.setItem('patientRecords', JSON.stringify(records));
        window.location.href = 'templates.html';
    }
};