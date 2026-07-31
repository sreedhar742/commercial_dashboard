import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { AlertIcon } from "./Icons.jsx";

// Browser Web Login (POST /api/web-token/). On success the backend sets the
// HTTP-only access_token / refresh_token cookies; we just flip auth state.
export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      // Navigation happens automatically via the auth-aware route in App.jsx.
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="login-wrap">
        <form className="login-card" onSubmit={handleSubmit}>
          <h1 className="login-title">Correction Console</h1>
          <p className="login-subtitle">
            SmartLearners exam correction audit
          </p>

          {error && (
            <div className="alert alert-error">
              <AlertIcon size={18} />
              <span>{error}</span>
            </div>
          )}

          <label className="field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
          </label>

          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
