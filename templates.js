// 1. Initialize Supabase using Environment Variables
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Vite picks these up from your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// 2. AUTH GUARD — redirect to login if not authenticated
const { data: { session } } = await supabase.auth.getSession();
if (!session) window.location.href = 'login.html';

// 3. Show logged-in user email + Logout
document.getElementById('userEmail').textContent = `Logged in as: ${session.user.email}`;
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
});

const patientForm = document.getElementById('patientForm');
const tableBody = document.getElementById('tableBody');

// 4. SAVE NEW RECORD TO SUPABASE
patientForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const sexElement = document.querySelector('input[name="sex"]:checked');

    const newPatient = {
        firstName: document.getElementById('firstName').value,
        middleName: document.getElementById('middleName').value,
        lastName: document.getElementById('lastName').value,
        age: parseInt(document.getElementById('age').value), 
        sex: sexElement ? sexElement.value : 'N/A',
        nationality: document.getElementById('nationality').value,
        bloodType: document.getElementById('bloodType').value,
        address: document.getElementById('address').value,
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

    const { data, error } = await supabase
        .from('patients')
        .insert([newPatient]);

    if (error) {
        console.error("Error saving:", error.message);
        alert("Error saving record: " + error.message);
    } else {
        alert("Record saved to database!");
        patientForm.reset();
        fetchAndDisplayRecords(); 
    }
});

// 5. FETCH AND DISPLAY FROM SUPABASE
async function fetchAndDisplayRecords(filterText = "") {
    const { data: records, error } = await supabase
        .from('patients')
        .select('*')
        .order('lastName', { ascending: true });

    if (error) {
        console.error("Error fetching:", error.message);
        return;
    }

    tableBody.innerHTML = '';
    const searchLower = filterText.toLowerCase();

    records.forEach((record) => {
        const fName = record.firstName || "";
        const mName = record.middleName || "";
        const lName = record.lastName || "";
        const fullName = `${fName} ${mName} ${lName}`.toLowerCase();

        if (fullName.includes(searchLower)) {
            const row = document.createElement('tr');
            row.style.cursor = "pointer";
            row.innerHTML = `
                <td>${lName}</td>
                <td>${fName}</td>
                <td>${record.age || "N/A"}</td>
                <td>${record.sex || "N/A"}</td>
            `;
            
            row.classList.add('clickable-row');
            row.onclick = () => window.location.href = `details.html?id=${record.id}`;
            tableBody.appendChild(row);
        }
    });
}

// 6. Dynamic Search Listener
document.getElementById('searchInput').addEventListener('input', (e) => {
    fetchAndDisplayRecords(e.target.value);
});

fetchAndDisplayRecords();