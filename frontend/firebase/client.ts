// Import the functions you need from the SDKs you need

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-fi8NUENz0HuALvVsad0GVrP0lmClyBU",
  authDomain: "prepwise-991e9.firebaseapp.com",
  projectId: "prepwise-991e9",
  storageBucket: "prepwise-991e9.firebasestorage.app",
  messagingSenderId: "564468630812",
  appId: "1:564468630812:web:de57176e02ce70f17e66d9",
  measurementId: "G-W4D0VCGN6S"
};

// Initialize Firebase

const app = !getApps.length ? initializeApp(firebaseConfig) : getApp()


export const auth = getAuth(app);
export const db = getFirestore(app);


