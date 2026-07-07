import { useState } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function NewChat() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  async function handleStartChat(e) {
    e.preventDefault();
    setError("");

    if (email.trim().toLowerCase() === currentUser.email.toLowerCase()) {
      setError("You can't start a chat with yourself.");
      return;
    }

    setLoading(true);
    try {
      // 1. Find the other user by email
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.trim().toLowerCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("No user found with that email.");
        setLoading(false);
        return;
      }

      const otherUserDoc = snapshot.docs[0];
      const otherUserId = otherUserDoc.id;

      // 2. Create a new chat with both participants
      const chatRef = await addDoc(collection(db, "chats"), {
        participants: [currentUser.uid, otherUserId],
        participantEmails: [currentUser.email, otherUserDoc.data().email],
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });

      navigate(`/chat/${chatRef.id}`);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h2>Start a new chat</h2>
      <form onSubmit={handleStartChat}>
        <input
          type="email"
          placeholder="Enter their email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button disabled={loading} type="submit" style={{ width: "100%", padding: 10 }}>
          {loading ? "Starting..." : "Start chat"}
        </button>
      </form>
    </div>
  );
}