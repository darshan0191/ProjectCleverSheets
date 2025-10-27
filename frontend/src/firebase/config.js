// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
    apiKey: "AIzaSyCB1SRlKlrApLTJtQLnc2-dzley_OSRh20",
    authDomain: "project1-c1bcc.firebaseapp.com",
    projectId: "project1-c1bcc",
    storageBucket: "project1-c1bcc.firebasestorage.app",
    messagingSenderId: "386192051173",
    appId: "1:386192051173:web:4c0330060e9d434adffd0c",
    measurementId: "G-T8Z8695KEC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);  // ✅ Make sure db is exported

