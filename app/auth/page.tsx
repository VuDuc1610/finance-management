"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

export default function AuthPage() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  function handleLogin(event: React.FormEvent) {
    event.preventDefault();
  }

  function handleSignup(event: React.FormEvent) {
    event.preventDefault();
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
                  placeholder="you@example.com"
                  className="rounded-card border border-linen-300 bg-linen-100 px-3.5 py-2.5 font-sans text-[0.9375rem] text-ink-900 placeholder:text-linen-700 focus-visible:outline-2 focus-visible:outline-dye-indigo"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-[0.8125rem] text-linen-700">
                  Password
                </span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="••••••••"
                  className="rounded-card border border-linen-300 bg-linen-100 px-3.5 py-2.5 font-sans text-[0.9375rem] text-ink-900 placeholder:text-linen-700 focus-visible:outline-2 focus-visible:outline-dye-indigo"
                />
              </label>

              <button
                type="submit"
                className="mt-2 rounded-pill bg-dye-indigo px-4 py-2.5 font-sans text-[0.9375rem] text-linen-100 transition hover:opacity-90"
              >
                Log in
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

            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-[0.8125rem] text-linen-700">
                  Name
                </span>
                <input
                  type="text"
                  value={signupName}
                  onChange={(event) => setSignupName(event.target.value)}
                  placeholder="Jane Doe"
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
                  placeholder="you@example.com"
                  className="rounded-card border border-linen-300 bg-linen-100 px-3.5 py-2.5 font-sans text-[0.9375rem] text-ink-900 placeholder:text-linen-700 focus-visible:outline-2 focus-visible:outline-dye-indigo"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-[0.8125rem] text-linen-700">
                  Password
                </span>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                  placeholder="••••••••"
                  className="rounded-card border border-linen-300 bg-linen-100 px-3.5 py-2.5 font-sans text-[0.9375rem] text-ink-900 placeholder:text-linen-700 focus-visible:outline-2 focus-visible:outline-dye-indigo"
                />
              </label>

              <button
                type="submit"
                className="mt-2 rounded-pill border border-dye-indigo px-4 py-2.5 font-sans text-[0.9375rem] text-dye-indigo transition hover:bg-dye-indigo hover:text-linen-100"
              >
                Create account
              </button>
            </form>
          </section>
        </div>
      </Card>
    </main>
  );
}
