import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA5G05TfZNL1fhgnlmECP3MV3uynwcTPXk",
  authDomain: "wisp-e006c.firebaseapp.com",
  projectId: "wisp-e006c",
  storageBucket: "wisp-e006c.firebasestorage.app",
  messagingSenderId: "836476851427",
  appId: "1:836476851427:web:f2b5d39b518622fc0ae1d6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
