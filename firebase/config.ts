import { initializeApp } from "firebase/app"
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB6DhgXfszs_p-pIUboKZWhRB0pBvoZbOc",
  authDomain: "media-extractor-2fcce.firebaseapp.com",
  projectId: "media-extractor-2fcce",
  storageBucket: "media-extractor-2fcce.firebasestorage.app",
  messagingSenderId: "1085331879034",
  appId: "1:1085331879034:web:60890f045cdaf4e66277c3"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(app)

// Configure persistence for extension environment
if (chrome.runtime?.id) {
  setPersistence(firebaseAuth, browserLocalPersistence).catch((error) => {
    console.error("Auth persistence error:", error)
  })
}
