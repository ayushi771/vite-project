import React, { useEffect, useMemo, useState } from "react";
import { loginUser, registerUser, forgotPassword, resetPassword } from "/src/services/api";
import toast from "react-hot-toast";

const safeCall = (fn, ...args) => {
  if (typeof fn === "function") return fn(...args);
  return undefined;
};

// For FETCH-based api.js (throws Error with err.status / err.data)
const getFriendlyError = (err, mode) => {
  const status = err?.status;
  const raw =
    err?.data?.detail ||
    err?.data?.message ||
    err?.data?.error ||
    err?.message ||
    "Server error. Please try again.";

  const msg = String(raw).toLowerCase();

  if (status === 401) return "Incorrect email or password.";
  if (msg.includes("invalid credentials")) return "Incorrect email or password.";

  if (msg.includes("already") && msg.includes("exist")) {
    return "An account with this email already exists. Please login instead.";
  }

  if (mode === "forgot" && (status === 400 || status === 422)) {
    return "Enter a valid email address.";
  }

  if (mode === "reset" && (status === 400 || status === 422)) {
    return "Invalid or expired reset code. Please request a new reset code.";
  }
  if (msg.includes("reset token expired")) {
    return "Reset code expired. Please request a new reset code.";
  }
  if (msg.includes("invalid reset token")) {
    return "Invalid reset code. Please check and try again.";
  }

  if (msg.includes("network") || msg.includes("timeout")) {
    return "Network error. Please try again.";
  }

  return String(raw);
};

export default function AuthModal({ show, onClose, onLoginSuccess }) {
  // modes: "login" | "register" | "forgot"
  const [mode, setMode] = useState("login");

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Reset flow inputs
  const [resetToken, setResetToken] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show) return;

    setError("");
    setLoading(false);
    setShowPassword(false);

    // clear sensitive inputs each open
    setPassword("");
    setResetToken("");
  }, [show]);

  const title = useMemo(() => {
    if (isLogin) return "Login";
    if (isRegister) return "Register";
    return "Reset Password";
  }, [isLogin, isRegister]);

  const validateForm = () => {
    const e = email.trim();

    if (!e || !e.includes("@") || !e.includes(".")) {
      return "Enter a valid email address.";
    }

    if (isRegister) {
      if (name.trim().length < 2) return "Name is too short.";
      if (password.length < 6) return "Password must be at least 6 characters.";
    }

    if (isLogin) {
      if (!password) return "Password is required.";
    }

    if (isForgot) {
      if (!resetToken.trim()) return "Enter reset code.";
      if (password.length < 6) return "New password must be at least 6 characters.";
    }

    return null;
  };

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
      if (isLogin) {
        const data = await loginUser(email.trim(), password);

        const id = data?.user_id ?? data?.id;
        const userName = data?.name;

        if (!id) {
          const msg = "Incorrect email or password.";
          setError(msg);
          toast.error(msg);
          return;
        }

        toast.success("Login successful");

        safeCall(onLoginSuccess, {
          id,
          name: userName || "User",
          email: email.trim(),
        });
        safeCall(onClose);
        return;
      }

      if (isRegister) {
        await registerUser(name.trim(), email.trim(), password);
        toast.success("Account created. You can login now.");

        setMode("login");
        setPassword("");
        return;
      }

      if (isForgot) {
        // reset password using token + new password
        await resetPassword(resetToken.trim(), password);

        toast.success("Password reset successful. You can login now.");
        setMode("login");
        setPassword("");
        setResetToken("");
        return;
      }
    } catch (err) {
      console.error(err);
      const friendly = getFriendlyError(err, isForgot ? "reset" : mode);
      toast.error(friendly);
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await forgotPassword(email.trim());

      // Your backend returns { reset_token } (DEV MODE)
      if (res?.reset_token) {
        setResetToken(String(res.reset_token));
        toast.success("Reset code generated (auto-filled).");
      } else {
        toast.success(res?.message || "Reset code generated.");
      }

      setMode("forgot");
      setPassword("");
    } catch (err) {
      console.error(err);
      const friendly = getFriendlyError(err, "forgot");
      toast.error(friendly);
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="auth-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h2>{title}</h2>

          <button
            className="close-btn"
            onClick={() => safeCall(onClose)}
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
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
            autoComplete="email"
          />

          {/* LOGIN/REGISTER password */}
          {!isForgot && (
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="toggle-pass"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          )}

          {/* FORGOT (reset password) */}
          {isForgot && (
            <>
              <input
                placeholder="Reset code"
                value={resetToken}
                required
                onChange={(e) => setResetToken(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
              />

              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="toggle-pass"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </>
          )}

          {error && <p className="error">{error}</p>}

          <button className="auth-btn" disabled={loading} type="submit">
            {loading
              ? "Please wait..."
              : isLogin
              ? "Login"
              : isRegister
              ? "Register"
              : "Reset Password"}
          </button>
        </form>

        {/* Switcher */}
        {!isForgot ? (
          <p
            className="switch-auth"
            onClick={() => {
              setMode((m) => (m === "login" ? "register" : "login"));
              setError("");
              setPassword("");
            }}
          >
            {isLogin ? "No account? Register" : "Already have an account? Login"}
          </p>
        ) : (
          <p
            className="switch-auth"
            onClick={() => {
              setMode("login");
              setError("");
              setResetToken("");
              setPassword("");
            }}
          >
            Back to login
          </p>
        )}

        {/* Extra link only on login */}
        {mode === "login" && (
          <p className="switch-auth" onClick={handleForgotPassword}>
            Forgot Password?
          </p>
        )}
      </div>
    </div>
  );
}