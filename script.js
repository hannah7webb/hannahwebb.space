import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDKHRcyCqoEZsqYYlPn27eyNtiNaU5xh-4",
  authDomain: "tutti-nu-lite.firebaseapp.com",
  projectId: "tutti-nu-lite",
  storageBucket: "tutti-nu-lite.appspot.com",
  messagingSenderId: "941649168233",
  appId: "1:941649168233:web:79617ad29fb63f35a39ff8",
  measurementId: "G-CFW9LH4SCM",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Sign-in button handler
document.querySelector(".signin-button").addEventListener("click", () => {
  signInWithRedirect(auth, provider);
});

// Sign-out button handler
document.querySelector(".signout-button").addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      alert("Signed out successfully!");
    })
    .catch((error) => {
      console.error("Sign out error:", error);
    });
});

// Handle redirect result and check user after redirect
window.addEventListener("load", () => {
  getRedirectResult(auth)
    .then((result) => {
      if (result && result.user) {
        const email = result.user.email;
        if (
          email.endsWith("@northwestern.edu") ||
          email.endsWith("@u.northwestern.edu")
        ) {
          window.location.href = "tutti-nu-lite-dashboard.html"; // redirect to dashboard
        } else {
          alert("Please sign in with your Northwestern email.");
          signOut(auth);
        }
      } else {
        // If no redirect result, check if user is already signed in
        onAuthStateChanged(auth, (user) => {
          if (user) {
            const email = user.email;
            if (
              email.endsWith("@northwestern.edu") ||
              email.endsWith("@u.northwestern.edu")
            ) {
              window.location.href = "tutti-nu-lite-dashboard.html";
            } else {
              alert("Please sign in with your Northwestern email.");
              signOut(auth);
            }
          }
        });
      }
    })
    .catch((error) => {
      console.error("Redirect error:", error);
    });
});
