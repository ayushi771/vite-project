import React, { useEffect, useMemo, useState } from "react";
import {
  loginUser,
  registerUser,
  verifyEmailCode,
  forgotPassword,
  resetPassword,
} from "/src/services/api";
import toast from "react-hot-toast";



const safeCall = (fn, ...args) => {
  if (typeof fn === "function") return fn(...args);
  return undefined;
};

const getFriendlyError = (err, mode) => {
  const status = err?.response?.status;

  const raw =
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Server error. Please try again.";

  const msg = String(raw).toLowerCase();

  // Login failures
  if (status === 401) return "Incorrect email or password.";
  if (msg.includes("invalid credentials")) return "Incorrect email or password.";
  if (msg.includes("incorrect password")) return "Incorrect email or password.";
  if (msg.includes("wrong password")) return "Incorrect email or password.";

  // Register conflicts
  if (status === 409 && mode === "register") {
    return "An account with this email already exists. Please login instead.";
  }
  if (msg.includes("already") && msg.includes("exist")) {
    return "An account with this email already exists. Please login instead.";
  }

  // Verify / reset code problems
  if (mode === "verify" && (status === 400 || status === 422)) {
    return "Invalid verification code. Please check and try again.";
  }
  if (mode === "forgot" && (status === 400 || status === 422)) {
    return "Invalid or expired reset code. Please request a new reset code.";
  }
  if (msg.includes("verification") && msg.includes("code")) {
    return "Invalid verification code. Please check and try again.";
  }
  if (msg.includes("reset") && msg.includes("code")) {
    return "Invalid or expired reset code. Please request a new reset code.";
  }

  // Network-ish
  if (msg.includes("network") || msg.includes("timeout")) {
    return "Network error. Please try again.";
  }

  return String(raw);
};

export default function AuthModal({ show, onClose, onLoginSuccess }) {
  // modes: "login" | "register" | "verify" | "forgot"
  const [mode, setMode] = useState("login");

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isVerify = mode === "verify";
  const isForgot = mode === "forgot";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
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
    setCode("");
    setResetToken("");

    // keep email/name (better UX)
  }, [show]);

  const title = useMemo(() => {
    if (isLogin) return "Login";
    if (isRegister) return "Register";
    if (isVerify) return "Verify Email";
    return "Reset Password";
  }, [isLogin, isRegister, isVerify]);

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

    if (isVerify) {
      const c = code.trim();
      if (!c || c.length < 4) return "Enter the verification code from your email.";
    }

    if (isForgot) {
      if (!resetToken.trim()) return "Enter reset code.";
      if (password.length < 6) return "Password must be at least 6 characters.";
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
          setError("Incorrect email or password.");
          toast.error("Incorrect email or password.");
          return;
        }

        toast.success("Login successful");

        // ✅ SAFE calls (prevents "" is not a function)
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

        toast.success("Account created");
        toast.info("Check your email for the verification code.", { autoClose: 5000 });

        setMode("verify");
        setPassword("");
        setCode("");
        return;
      }

      if (isVerify) {
        await verifyEmailCode(email.trim(), code.trim());

        toast.success("Email verified. You can login now.");
        setMode("login");
        setCode("");
        setPassword("");
        return;
      }

      if (isForgot) {
        await resetPassword(resetToken.trim(), password);

        toast.success("Password reset successful.");
        setMode("login");
        setPassword("");
        setResetToken("");
        return;
      }
    } catch (err) {
      console.error(err);
      const friendly = getFriendlyError(err, mode);
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
      toast.success(res?.message || "Reset code sent to your email.");
      setMode("forgot");
      setResetToken("");
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

          {/* ✅ SAFE close handler */}
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
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* LOGIN/REGISTER password */}
          {!isVerify && !isForgot && (
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="toggle-pass"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z"
                      stroke="#374151"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                      stroke="#374151"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
                      stroke="#374151"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 3l18 18"
                      stroke="#374151"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
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
              />

              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="toggle-pass"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z"
                        stroke="#374151"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                        stroke="#374151"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
                        stroke="#374151"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 3l18 18"
                        stroke="#374151"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}

          {/* VERIFY */}
          {isVerify && (
            <input
              placeholder="Verification code (e.g. 123456)"
              value={code}
              required
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
            />
          )}

          {error && <p className="error">{error}</p>}

          <button className="auth-btn" disabled={loading} type="submit">
            {loading
              ? "Please wait..."
              : isLogin
              ? "Login"
              : isRegister
              ? "Register"
              : isVerify
              ? "Verify"
              : "Reset Password"}
          </button>
        </form>

        {/* Switcher */}
        {!isVerify && !isForgot ? (
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
              setCode("");
              setResetToken("");
              setPassword("");
            }}
          >
            Back to login
          </p>
        )}

        {/* Extra links only on login */}
        {mode === "login" && (
          <>
            <p
              className="switch-auth"
              onClick={() => {
                setMode("verify");
                setError("");
                setCode("");
              }}
            >
              Already registered? Verify your email
            </p>

            <p className="switch-auth" onClick={handleForgotPassword}>
              Forgot Password?
            </p>
          </>
        )}
      </div>
    </div>
  );
}