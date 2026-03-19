"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFieldErrors(data.fieldErrors || {});
        setError(data.error || "Unable to register");
      } else {
        router.replace("/dashboard");
      }
    } catch {
      setError("Server error during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-800 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/90 border border-slate-700 p-6">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-slate-300 mt-1">Register to start analyzing resumes.</p>

        <form onSubmit={handleRegister} className="mt-5 space-y-4">
          <div>
            <label className="text-slate-200 text-sm">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
              type="email"
              required
              placeholder="name@company.com"
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-rose-300">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="text-slate-200 text-sm">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-rose-300">{fieldErrors.password}</p>}
          </div>
          {error && <div className="rounded-md bg-rose-500/20 border border-rose-400 p-2 text-sm text-rose-100">{error}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60">
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-slate-300 text-sm">
          Already have an account? <Link href="/login" className="text-cyan-300 hover:text-cyan-200">Login</Link>
        </p>
      </div>
    </div>
  );
}
