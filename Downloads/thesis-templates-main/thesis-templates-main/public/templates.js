import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const patientForm = document.getElementById('patientForm');
const tableBody = document.getElementById('tableBody');

// --- 1. SAVE DATA TO FIRESTORE ---
patientForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const sexElement = document.querySelector('input[name="sex"]:checked');
    
    const patientData = {
        firstName: document.getElementById('firstName').value,
        middleName: document.getElementById('middleName').value,
        lastName: document.getElementById('lastName').value,
        age: parseInt(document.getElementById('age').value),
        sex: sexElement ? sexElement.value : "N/A",
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
        relativeAddress: document.getElementById('relativeAddress').value,
        timestamp: new Date() 
    };

    try {
        await addDoc(collection(db, "patients"), patientData);
        alert("Patient record saved to Cloud!");
        patientForm.reset();
    } catch (error) {
        console.error("Error saving record:", error);
    }
});

// --- 2. READ DATA & CREATE CLICKABLE LINKS ---
const q = query(collection(db, "patients"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    tableBody.innerHTML = ""; 
    snapshot.forEach((doc) => {
        const data = doc.data();
        const patientId = doc.id; // This is the unique Firestore ID

        // We wrap the row in an onclick or use a link to details.html?id=...
        const row = `
            <tr onclick="window.location.href='details.html?id=${patientId}'" style="cursor: pointer;">
                <td>${data.lastName}</td>
                <td>${data.firstName}</td>
                <td>${data.age}</td>
                <td>${data.sex}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
});