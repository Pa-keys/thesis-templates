const patientForm = document.getElementById('patientForm');
const tableBody = document.getElementById('tableBody');

function displayRecords() {
    const records = JSON.parse(localStorage.getItem('patientRecords')) || [];
    tableBody.innerHTML = '';

    records.forEach((record, index) => {
        const row = document.createElement('tr');
        // Add a class for styling and a custom attribute for the ID
        row.classList.add('clickable-row');
        row.innerHTML = `
            <td>${record.lastName}</td>
            <td>${record.firstName}</td>
            <td>${record.age}</td>
            <td>${record.sex}</td>
        `;
        // When clicked, redirect to details page with the index as ID
        row.onclick = () => window.location.href = `details.html?id=${index}`;
        tableBody.appendChild(row);
    });
}

patientForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const newPatient = {
        firstName: document.getElementById('firstName').value,
        middleName: document.getElementById('middleName').value,
        lastName: document.getElementById('lastName').value,
        age: document.getElementById('age').value,
        sex: document.querySelector('input[name="sex"]:checked').value,
        nationality: document.getElementById('nationality').value,
        bloodType: document.getElementById('bloodType').value,
        religion: document.getElementById('religion').value,
        birthday: document.getElementById('birthday').value,
        birthPlace: document.getElementById('birthPlace').value,
        address: document.getElementById('address').value,
        contactNumber: document.getElementById('contactNumber').value,
        educationalAttain: document.getElementById('educationalAttain').value,
        employmentStatus: document.getElementById('employmentStatus').value,
        relativeName: document.getElementById('relativeName').value,
        relativeRelation: document.getElementById('relativeRelation').value,
        relativeAddress: document.getElementById('relativeAddress').value
    };

    const records = JSON.parse(localStorage.getItem('patientRecords')) || [];
    records.push(newPatient);
    localStorage.setItem('patientRecords', JSON.stringify(records));

    patientForm.reset();
    displayRecords();
});

displayRecords();