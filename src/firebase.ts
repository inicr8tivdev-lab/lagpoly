import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your provisioned Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkX-_7YVh9VY-XYgMRTQCY-2fm3vZ-jZk",
  authDomain: "psyched-zone-x5wls.firebaseapp.com",
  projectId: "psyched-zone-x5wls",
  storageBucket: "psyched-zone-x5wls.firebasestorage.app",
  messagingSenderId: "896699826807",
  appId: "1:896699826807:web:81c5b1002d36f7f353bc72",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-ekomonopolylagos-fd7ea7ac-21f7-488a-bb17-d34b74bf5463");
export const googleProvider = new GoogleAuthProvider();

export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
