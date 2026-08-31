"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordVisible, setSignupPasswordVisible] = useState(false);
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupConfirmPasswordVisible, setSignupConfirmPasswordVisible] =
    useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupConfirmationSent, setSignupConfirmationSent] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    setLoginLoading(false);

    if (error) {
      setLoginError(error.message);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setSignupError(null);

    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    setSignupLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { data: { full_name: signupName } },
    });

    setSignupLoading(false);

    if (error) {
      setSignupError(error.message);
      return;
    }

    if (data.session) {
      router.push("/home");
      router.refresh();
      return;
    }

    setSignupConfirmationSent(true);
  }

  return (
    <main className="flex w-full flex-1 items-center justify-center px-6 py-10 md:px-10 lg:px-16">
      <Card className="w-full max-w-4xl p-6 sm:p-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[1fr_auto_1fr] sm:gap-10">
          <section className="flex flex-col justify-center gap-6">
            <div>
              <h1 className="font-display text-[1.4rem] text-ink-900">
                Log in
              </h1>
              <p className="mt-1 font-sans text-[0.875rem] text-linen-700">
                Welcome back — pick up where you left off.
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-[0.8125rem] text-linen-700">
                  Email
                </span>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="chloe@example.com"
                  className="rounded-card border border-linen-300 bg-linen-100 px-3.5 py-2.5 font-sans text-[0.9375rem] text-ink-900 placeholder:text-linen-700 focus-visible:outline-2 focus-visible:outline-dye-indigo"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-[0.8125rem] text-linen-700">
                  Password
                </span>
                <div className="relative">
                  <input
                    type={loginPasswordVisible ? "text" : "password"}
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    className="w-full rounded-card border border-linen-300 bg-linen-100 px-3.5 py-2.5 pr-11 font-sans text-[0.9375rem] text-ink-900 focus-visible:outline-2 focus-visible:outline-dye-indigo"
                  />
                  <button
                    type="button"
                    onClick={() => setLoginPasswordVisible((visible) => !visible)}
                    aria-label={
                      loginPasswordVisible ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-linen-700 hover:text-ink-900"
                  >
                    <EyeIcon open={loginPasswordVisible} />
                  </button>
                </div>
              </label>

              {loginError && (
                <p className="font-sans text-[0.8125rem] text-dye-madder">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="mt-2 rounded-pill bg-dye-indigo px-4 py-2.5 font-sans text-[0.9375rem] text-linen-100 transition hover:opacity-90 disabled:opacity-60"
              >
                {loginLoading ? "Logging in…" : "Log in"}
              </button>
            </form>
          </section>

          <div className="hidden sm:flex sm:flex-col sm:items-center">
            <div className="w-px flex-1 bg-linen-300" />
            <span className="my-3 rounded-pill border border-linen-300 bg-linen-100 px-2.5 py-1 font-sans text-[0.6875rem] uppercase tracking-wide text-linen-700">
              or
            </span>
            <div className="w-px flex-1 bg-linen-300" />
          </div>

          <div className="flex items-center sm:hidden">
            <div className="h-px flex-1 bg-linen-300" />
            <span className="mx-3 rounded-pill border border-linen-300 bg-linen-100 px-2.5 py-1 font-sans text-[0.6875rem] uppercase tracking-wide text-linen-700">
              or
            </span>
            <div className="h-px flex-1 bg-linen-300" />
          </div>

          <section className="flex flex-col justify-center gap-6">
            <div>
              <h1 className="font-display text-[1.4rem] text-ink-900">
                Sign up
              </h1>
              <p className="mt-1 font-sans text-[0.875rem] text-linen-700">
                New here? Create an account to get started.
              </p>
            </div>

            {signupConfirmationSent ? (
              <p className="font-sans text-[0.9375rem] text-linen-700">
                Check your email to confirm your account, then log in.
              </p>
            ) : (
              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="font-sans text-[0.8125rem] text-linen-700">
                    Name
                  </span>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                    placeholder="Chloe P"
                    className="rounded-card border border-linen-300 bg-linen-100 px-3.5 py-2.5 font-sans text-[0.9375rem] text-ink-900 placeholder:text-linen-700 focus-visible:outline-2 focus-visible:outline-dye-indigo"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-sans text-[0.8125rem] text-linen-700">
                    Email
                  </span>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    placeholder="chloe@example.com"
                    className="rounded-card border border-linen-300 bg-linen-100 px-3.5 py-2.5 font-sans text-[0.9375rem] text-ink-900 placeholder:text-linen-700 focus-visible:outline-2 focus-visible:outline-dye-indigo"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-sans text-[0.8125rem] text-linen-700">
                    Password
                  </span>
                  <div className="relative">
                    <input
                      type={signupPasswordVisible ? "text" : "password"}
                      value={signupPassword}
                      onChange={(event) =>
                        setSignupPassword(event.target.value)
                      }
                      className="w-full rounded-card border border-linen-300 bg-linen-100 px-3.5 py-2.5 pr-11 font-sans text-[0.9375rem] text-ink-900 focus-visible:outline-2 focus-visible:outline-dye-indigo"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSignupPasswordVisible((visible) => !visible)
                      }
                      aria-label={
                        signupPasswordVisible
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-linen-700 hover:text-ink-900"
                    >
                      <EyeIcon open={signupPasswordVisible} />
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-sans text-[0.8125rem] text-linen-700">
                    Confirm password
                  </span>
                  <div className="relative">
                    <input
                      type={signupConfirmPasswordVisible ? "text" : "password"}
                      value={signupConfirmPassword}
                      onChange={(event) =>
                        setSignupConfirmPassword(event.target.value)
                      }
                      className="w-full rounded-card border border-linen-300 bg-linen-100 px-3.5 py-2.5 pr-11 font-sans text-[0.9375rem] text-ink-900 focus-visible:outline-2 focus-visible:outline-dye-indigo"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSignupConfirmPasswordVisible((visible) => !visible)
                      }
                      aria-label={
                        signupConfirmPasswordVisible
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-linen-700 hover:text-ink-900"
                    >
                      <EyeIcon open={signupConfirmPasswordVisible} />
                    </button>
                  </div>
                </label>

                {signupError && (
                  <p className="font-sans text-[0.8125rem] text-dye-madder">
                    {signupError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="mt-2 rounded-pill border border-dye-indigo px-4 py-2.5 font-sans text-[0.9375rem] text-dye-indigo transition hover:bg-dye-indigo hover:text-linen-100 disabled:opacity-60"
                >
                  {signupLoading ? "Creating account…" : "Create account"}
                </button>
              </form>
            )}
          </section>
        </div>
      </Card>
    </main>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
