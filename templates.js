const patientForm = document.getElementById('patientForm');
const tableBody = document.getElementById('tableBody');

// 1. SAVE NEW RECORD
patientForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newPatient = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        age: document.getElementById('age').value,
        sex: document.querySelector('input[name="sex"]:checked').value,
        address: document.getElementById('address').value,
        // Add all your other fields here (bloodType, etc.)
    };

    let records = JSON.parse(localStorage.getItem('patientRecords')) || [];
    records.push(newPatient);
    localStorage.setItem('patientRecords', JSON.stringify(records));

    patientForm.reset();
    displayRecords(); // Refresh the table
});

// 2. DISPLAY THE TABLE
function displayRecords() {
    const records = JSON.parse(localStorage.getItem('patientRecords')) || [];
    tableBody.innerHTML = '';

    records.forEach((record, index) => {
        const row = document.createElement('tr');
        row.style.cursor = "pointer"; // Make it look clickable
        row.innerHTML = `
            <td>${record.lastName}</td>
            <td>${record.firstName}</td>
            <td>${record.age}</td>
            <td>${record.sex}</td>
        `;
        // This is the link to the details page
        row.onclick = () => window.location.href = `details.html?id=${index}`;
        tableBody.appendChild(row);
    });
}

// Load table on start
displayRecords();