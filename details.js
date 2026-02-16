const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');
let records = JSON.parse(localStorage.getItem('patientRecords')) || [];
const patient = records[patientId];

const detailsDiv = document.getElementById('fullDetails');
const form = document.getElementById('editForm');

// Initial Setup
if (patient) {
    renderView();
    prefillForm();
} else {
    detailsDiv.innerHTML = "<h2>Error: Patient not found.</h2>";
}

function renderView() {
    document.getElementById('fullNameTitle').innerText = `${patient.firstName} ${patient.lastName}`;
    detailsDiv.innerHTML = `
        <p><strong>Full Name:</strong> ${patient.firstName} ${patient.lastName}</p>
        <p><strong>Age:</strong> ${patient.age}</p>
        <p><strong>Address:</strong> ${patient.address}</p>
    `;
}

function prefillForm() {
    document.getElementById('editFN').value = patient.firstName;
    document.getElementById('editLN').value = patient.lastName;
    document.getElementById('editAge').value = patient.age;
    document.getElementById('editAddress').value = patient.address;
}

function toggleEdit() {
    const isViewing = form.style.display === "none";
    form.style.display = isViewing ? "block" : "none";
    detailsDiv.style.display = isViewing ? "none" : "block";
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    records[patientId].firstName = document.getElementById('editFN').value;
    records[patientId].lastName = document.getElementById('editLN').value;
    records[patientId].age = document.getElementById('editAge').value;
    records[patientId].address = document.getElementById('editAddress').value;

    localStorage.setItem('patientRecords', JSON.stringify(records));
    alert("Record Updated!");
    location.reload(); 
});

document.getElementById('deleteBtn').onclick = () => {
    if (confirm("Permanently delete this record?")) {
        records.splice(patientId, 1);
        localStorage.setItem('patientRecords', JSON.stringify(records));
        window.location.href = 'templates.html';
    }
};