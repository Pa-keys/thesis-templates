const patientForm = document.getElementById('patientForm');
const tableBody = document.getElementById('tableBody');

// 1. SAVE NEW RECORD
patientForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newPatient = {
        firstName: document.getElementById('firstName').value,
        middleName: document.getElementById('middleName').value, // Added this
        lastName: document.getElementById('lastName').value,
        age: document.getElementById('age').value,
        sex: document.querySelector('input[name="sex"]:checked').value,
        nationality: document.getElementById('nationality').value, // Added this
        bloodType: document.getElementById('bloodType').value, // Added this
        address: document.getElementById('address').value,
        // Match these IDs exactly to your HTML input IDs
        contactNumber: document.getElementById('contactNumber').value,
        religion: document.getElementById('religion').value,
        birthday: document.getElementById('birthday').value,
        birthPlace: document.getElementById('birthPlace').value,
        educationalAttain: document.getElementById('educationalAttain').value,
        employmentStatus: document.getElementById('employmentStatus').value,
        relativeName: document.getElementById('relativeName').value,
        relativeRelation: document.getElementById('relativeRelation').value,
        relativeAddress: document.getElementById('relativeAddress').value
    };

    let records = JSON.parse(localStorage.getItem('patientRecords')) || [];
    records.push(newPatient);
    localStorage.setItem('patientRecords', JSON.stringify(records));

    patientForm.reset();
    displayRecords(); 
});

// 2. Modified Display Function
function displayRecords(filterText = "") {
    const records = JSON.parse(localStorage.getItem('patientRecords')) || [];
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    const searchLower = filterText.toLowerCase();

    records.forEach((record, index) => {
        // Fix: Use "|| ''" to handle missing names so the search doesn't break
        const fName = record.firstName || "";
        const mName = record.middleName || "";
        const lName = record.lastName || "";
        
        // Combine them into one string for the dynamic search
        const fullName = `${fName} ${mName} ${lName}`.toLowerCase();

        // Only show if it matches the search (or if search is empty)
        if (fullName.includes(searchLower)) {
            const row = document.createElement('tr');
            row.style.cursor = "pointer";
            row.innerHTML = `
                <td>${lName}</td>
                <td>${fName}</td>
                <td>${record.age || "N/A"}</td>
                <td>${record.sex || "N/A"}</td>
            `;
            // Critical for bottom-up scaling: ensures every record is reachable
            row.onclick = () => window.location.href = `details.html?id=${index}`;
            tableBody.appendChild(row);
        }
    });
}

// 3. Dynamic Search Listener
document.getElementById('searchInput').addEventListener('input', (e) => {
    const text = e.target.value;
    displayRecords(text); // Re-run display with the search text
});

// Load table on start
displayRecords();

