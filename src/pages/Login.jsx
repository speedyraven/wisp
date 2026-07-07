import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";

export default function Login() {
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
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error-text">{error}</p>}
        <button disabled={loading} type="submit" className="btn">
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <div className="helper-row">
        No account? <Link to="/signup" className="btn-link">Sign up</Link>
      </div>
    </div>
  );
}