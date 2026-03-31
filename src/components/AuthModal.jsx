import React, { useEffect, useMemo, useState } from "react";
import { loginUser, registerUser } from "/src/services/api";

export default function AuthModal({ show, onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!show) return;

    setError("");
    setLoading(false);
    setShowPassword(false);
    // keep email for convenience; reset password always
    setPassword("");
  }, [show]);

  const validateForm = () => {
    const e = email.trim();

    if (!e || !e.includes("@") || !e.includes(".")) return "Enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";

    if (!isLogin && name.trim().length < 2) return "Name is too short.";
    return null;
  };

  const title = useMemo(() => (isLogin ? "Login" : "Register"), [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = isLogin
        ? await loginUser(email.trim(), password)
        : await registerUser(name.trim(), email.trim(), password);

      // Normalize user object from possible backend shapes
      const id = data?.id ?? data?.user_id ?? data?.user?.id;
      const userName = data?.name ?? data?.user_name ?? data?.user?.name;

      if (!id) {
        setError("Invalid credentials.");
        return;
      }

      onLoginSuccess?.({
        id,
        name: userName || name.trim() || "User",
        email: email.trim(),
      });

      onClose?.();
    } catch (err) {
      console.error(err);
      // You can improve this by reading err.response/json if your api wrapper provides it
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Authentication">
      <div className="auth-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="close-btn" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          {!isLogin && (
            <input
              placeholder="Name"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            autoComplete={isLogin ? "email" : "email"}
          />

          <div className="input-group">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            <button
              type="button"
              className="toggle-pass"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <img src="https://cdn-icons-png.flaticon.com/128/2767/2767146.png" width="18" alt="Hide password" />
              ) : (
                <img src="https://cdn-icons-png.flaticon.com/128/709/709612.png" width="18" alt="Show password" />
              )}
            </button>
          </div>

          {error && <p className="error">{error}</p>}

          <button disabled={loading} type="submit">
            {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
          </button>
        </form>

        <p
          className="switch-auth"
          onClick={() => {
            setIsLogin((v) => !v);
            setError("");
            setPassword("");
          }}
          role="button"
          tabIndex={0}
        >
          {isLogin ? "No account? Register" : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}