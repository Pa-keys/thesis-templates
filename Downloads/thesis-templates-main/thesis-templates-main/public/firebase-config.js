// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqPdihEJKxzM6DuN1jU-Dwlml_hu7XMZE",
  authDomain: "medisense-practice.firebaseapp.com",
  databaseURL: "https://medisense-practice-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "medisense-practice",
  storageBucket: "medisense-practice.firebasestorage.app",
  messagingSenderId: "92181074715",
  appId: "1:92181074715:web:f51beb0438a9d8f6a679be",
  measurementId: "G-7815YZ8KSD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and EXPORT it so other files can use it
export const db = getFirestore(app);