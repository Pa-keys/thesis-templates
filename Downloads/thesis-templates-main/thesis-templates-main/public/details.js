// details.js
import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- INITIAL SETUP ---
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id'); // This is now the Firestore Document ID

const detailsDiv = document.getElementById('fullDetails');
const form = document.getElementById('editForm');
const fullNameTitle = document.getElementById('fullNameTitle');

// We use a global variable to store the data once fetched
let currentPatientData = null;

if (patientId) {
    loadPatientData();
} else {
    detailsDiv.innerHTML = "<h2>Error: No Patient ID provided.</h2>";
}

// --- 1. FETCH DATA FROM FIRESTORE ---
async function loadPatientData() {
    try {
        const docRef = doc(db, "patients", patientId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentPatientData = docSnap.data();
            renderView(currentPatientData);
            prefillForm(currentPatientData);
        } else {
            detailsDiv.innerHTML = "<h2>Error: Patient record not found in cloud.</h2>";
        }
    } catch (error) {
        console.error("Error fetching patient:", error);
        detailsDiv.innerHTML = "<h2>Error connecting to database.</h2>";
    }
}

// --- 2. DISPLAY INFORMATION ---
function renderView(patient) {
    fullNameTitle.innerText = `${patient.firstName} ${patient.lastName}`;
    
    detailsDiv.innerHTML = `
        <div class="profile-section">
            <h3>Personal Information</h3>
            <p><strong>Full Name:</strong> ${patient.firstName} ${patient.middleName || ''} ${patient.lastName}</p>
            <p><strong>Age:</strong> ${patient.age}</p>
            <p><strong>Sex:</strong> ${patient.sex}</p>
            <p><strong>Birthday:</strong> ${patient.birthday || 'N/A'}</p>
            <p><strong>Blood Type:</strong> ${patient.bloodType || 'N/A'}</p>
            <p><strong>Address:</strong> ${patient.address}</p>
            <p><strong>Contact Number:</strong> ${patient.contactNumber || 'N/A'}</p>
            <hr>
            <h3>Emergency Contact</h3>
            <p><strong>Relative Name:</strong> ${patient.relativeName || 'N/A'}</p>
            <p><strong>Relationship:</strong> ${patient.relativeRelation || 'N/A'}</p>
        </div>
    `;
}

// --- 3. PRE-FILL EDIT FORM ---
function prefillForm(patient) {
    document.getElementById('editFN').value = patient.firstName || "";
    document.getElementById('editMN').value = patient.middleName || "";
    document.getElementById('editLN').value = patient.lastName || "";
    document.getElementById('editAge').value = patient.age || "";
    document.getElementById('editAddress').value = patient.address || "";
    document.getElementById('editContact').value = patient.contactNumber || "";
}

// --- 4. TOGGLE EDIT MODE ---
window.toggleEdit = function() {
    const isViewing = form.style.display === "none";
    form.style.display = isViewing ? "block" : "none";
    detailsDiv.style.display = isViewing ? "none" : "block";
    document.getElementById('editBtn').innerText = isViewing ? "Cancel Editing" : "Edit Record";
};

// --- 5. SAVE UPDATED DATA TO CLOUD ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const docRef = doc(db, "patients", patientId);
    const updatedData = {
        firstName: document.getElementById('editFN').value,
        middleName: document.getElementById('editMN').value,
        lastName: document.getElementById('editLN').value,
        age: parseInt(document.getElementById('editAge').value),
        address: document.getElementById('editAddress').value,
        contactNumber: document.getElementById('editContact').value,
        lastUpdated: new Date()
    };

    try {
        await updateDoc(docRef, updatedData);
        alert("Cloud Record Updated Successfully!");
        location.reload(); 
    } catch (error) {
        console.error("Error updating document: ", error);
        alert("Failed to update record.");
    }
});

// --- 6. DELETE RECORD FROM CLOUD ---
document.getElementById('deleteBtn').onclick = async () => {
    if (confirm("Permanently delete this record from the Malvar Health Center database?")) {
        try {
            await deleteDoc(doc(db, "patients", patientId));
            alert("Record deleted.");
            window.location.href = 'templates.html';
        } catch (error) {
            console.error("Error deleting document: ", error);
        }
    }
};