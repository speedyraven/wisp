import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { generateKeyPair, storePrivateKey } from "../crypto";
import "../App.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCredential.user;

      const { publicKey, privateKey } = await generateKeyPair();
      storePrivateKey(user.uid, privateKey);

      await setDoc(doc(db, "users", user.uid), {
        email: normalizedEmail,
        publicKey,
        createdAt: new Date(),
      });

      navigate("/chat");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="screen auth-screen">
      <div className="brand">wisp</div>
      <div className="brand-tag">say it once.</div>
      <form onSubmit={handleSubmit}>
        <input
          className="field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field"
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {error && <p className="error-text">{error}</p>}
        <button disabled={loading} type="submit" className="btn">
          {loading ? "Creating..." : "Sign up"}
        </button>
      </form>
      <div className="helper-row">
        Already have an account? <Link to="/login" className="btn-link">Log in</Link>
      </div>
    </div>
  );
}