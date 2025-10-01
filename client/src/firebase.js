import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCv3YaxHhB-aZnNg5gr-kXtkvz7j6GNyXo",
  authDomain: "inspex001.firebaseapp.com",
  projectId: "inspex001",
  storageBucket: "inspex001.firebasestorage.app",
  messagingSenderId: "645714761263",
  appId: "1:645714761263:web:f3edf55cd460766b6c18da"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;