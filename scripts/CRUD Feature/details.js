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

function prefillForm() {
    document.getElementById('editFN').value = patient.firstName || "";
    document.getElementById('editMN').value = patient.middleName || "";
    document.getElementById('editLN').value = patient.lastName || "";
    document.getElementById('editAge').value = patient.age || "";
    document.getElementById('editAddress').value = patient.address || "";
    document.getElementById('editContact').value = patient.contactNumber || "";

    document.getElementById('editBlood').value = patient.bloodType || "O+";

    if (patient.sex === "Male") document.getElementById('male').checked = true;
    if (patient.sex === "Female") document.getElementById('female').checked = true;

    document.getElementById('editReligion').value = patient.religion || "";
    document.getElementById('editBirthday').value = patient.birthday || "";
    document.getElementById('editBirthPlace').value = patient.birthPlace || "";
    document.getElementById('editEducationalAttain').value = patient.educationalAttain || "";
    document.getElementById('editEmploymentStatus').value = patient.employmentStatus || "";
    document.getElementById('editRelativeName').value = patient.relativeName || "";
    document.getElementById('editRelativeRelation').value = patient.relativeRelation || "";
    document.getElementById('editRelativeAddress').value = patient.relativeAddress || "";
}

function toggleEdit() {
    const isViewing = form.style.display === "none";
    form.style.display = isViewing ? "block" : "none";
    detailsDiv.style.display = isViewing ? "none" : "block";
    document.getElementById('editBtn').innerText = isViewing ? "Cancel Editing" : "Edit Record";
}

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedSex = document.querySelector('input[name="sex"]:checked').value;

    records[patientId] = {
        ...records[patientId],
        firstName: document.getElementById('editFN').value,
        middleName: document.getElementById('editMN').value,
        lastName: document.getElementById('editLN').value,
        age: document.getElementById('editAge').value,
        address: document.getElementById('editAddress').value,
        contactNumber: document.getElementById('editContact').value,
        sex: selectedSex,
        bloodType: document.getElementById('editBlood').value,
        religion: document.getElementById('editReligion').value,
        birthday: document.getElementById('editBirthday').value,
        birthPlace: document.getElementById('editBirthPlace').value,
        educationalAttain: document.getElementById('editEducationalAttain').value,
        employmentStatus: document.getElementById('editEmploymentStatus').value,
        relativeName: document.getElementById('editRelativeName').value,
        relativeRelation: document.getElementById('editRelativeRelation').value,
        relativeAddress: document.getElementById('editRelativeAddress').value
    };

    localStorage.setItem('patientRecords', JSON.stringify(records));
    alert("Record Updated Successfully!");
    location.reload();
});

document.getElementById('deleteBtn').onclick = () => {
    if (confirm("Permanently delete this record?")) {
        records.splice(patientId, 1);
        localStorage.setItem('patientRecords', JSON.stringify(records));
        window.location.href = 'templates.html';
    }
};