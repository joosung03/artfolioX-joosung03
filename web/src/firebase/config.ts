import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Replace these values with your own Firebase project settings
const firebaseConfig = {
    apiKey: "AIzaSyCmc_mIpBk-nXEYO291IrmSNHjLjlRTTUk",
    authDomain: "artfoliox.firebaseapp.com",
    projectId: "artfoliox",
    storageBucket: "artfoliox.firebasestorage.app",
    messagingSenderId: "8009921066",
    appId: "1:8009921066:web:3ce1d095a1a7c9e3868953"
  };

  const app = initializeApp(firebaseConfig);
  
  export const auth = getAuth(app);
  export const db = getFirestore(app);
  export const storage = getStorage(app);
  