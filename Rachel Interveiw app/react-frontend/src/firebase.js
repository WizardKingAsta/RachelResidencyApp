import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "rachel-residency-db.firebaseapp.com",
  projectId: "136838108276",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);