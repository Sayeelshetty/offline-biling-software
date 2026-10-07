import { useState } from "react";
import type { FormEvent } from "react";
import type { AuthenticatedUser } from "../../../shared/auth";
import { login } from "../services/auth.service";
import "./LoginPage.css";

type LoginPageProps = {
  onLoginSuccess: (user: AuthenticatedUser) => void;
};

export default function LoginPage({
  onLoginSuccess,
}: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({
        email: trimmedEmail,
        password,
      });

      if (!response.success || !response.user) {
        setError(
          response.error ||
            "Invalid email or password."
        );
        return;
      }

      onLoginSuccess(response.user);
    } catch (loginError) {
      console.error(
        "Login page error:",
        loginError
      );

      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to login. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-brand-panel">
          <div className="login-brand-mark">
            <span>OB</span>
          </div>

          <div className="login-brand-content">
            <p className="login-eyebrow">
              OFFLINE-FIRST POS
            </p>

            <h1>
              Offline Billing
            </h1>

            <p>
              Fast and reliable billing for
              your business, even without an
              internet connection.
            </p>
          </div>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <span className="login-feature-icon">
                ✓
              </span>
              <span>
                Works offline with local data
              </span>
            </div>

            <div className="login-feature-item">
              <span className="login-feature-icon">
                ✓
              </span>
              <span>
                Fast product and billing workflow
              </span>
            </div>

            <div className="login-feature-item">
              <span className="login-feature-icon">
                ✓
              </span>
              <span>
                Inventory and payment management
              </span>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-container">
            <div className="login-mobile-brand">
              <div className="login-mobile-mark">
                OB
              </div>
              <span>
                Offline Billing
              </span>
            </div>

            <div className="login-heading">
              <p className="login-form-eyebrow">
                Welcome back
              </p>

              <h2>
                Sign in to your account
              </h2>

              <p>
                Enter your account details to
                continue to the dashboard.
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={handleSubmit}
            >
              <div className="login-field">
                <label htmlFor="login-email">
                  Email
                </label>

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="admin@offlinebilling.local"
                  autoComplete="username"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="login-field">
                <label htmlFor="login-password">
                  Password
                </label>

                <div className="login-password-wrapper">
                  <input
                    id="login-password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    disabled={isLoading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="login-error"
                  role="alert"
                >
                  <span className="login-error-icon">
                    !
                  </span>

                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="login-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="login-spinner" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="login-footer">
              <span>
                Offline Billing Software
              </span>

              <span className="login-footer-dot">
                •
              </span>

              <span>
                Local authentication
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}