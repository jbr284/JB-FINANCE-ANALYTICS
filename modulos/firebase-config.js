// === modulos/firebase-config.js ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCNHOPKa320_cY0KUY8vBVVYRmcYkmWo0Y",
    authDomain: "bd-saripan.firebaseapp.com",
    projectId: "bd-saripan",
    storageBucket: "bd-saripan.firebasestorage.app",
    messagingSenderId: "545578993360",
    appId: "1:545578993360:web:d410a5cbedd914ad3800d5"
};

const appFire = initializeApp(firebaseConfig);
export const db = getFirestore(appFire);
export const auth = getAuth(appFire);
