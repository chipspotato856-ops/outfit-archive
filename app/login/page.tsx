"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-linen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display italic font-semibold text-3xl text-ink mb-1">
          archive
        </h1>
        <p className="text-[#6b6055] text-sm mb-8">
          {mode === "signup"
            ? "A private record of your fits, synced across your devices."
            : "Welcome back."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-umber mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-sm border border-taupe bg-white px-4 py-3 text-ink placeholder:text-taupe focus:border-umber transition-colors outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-umber mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-sm border border-taupe bg-white px-4 py-3 text-ink placeholder:text-taupe focus:border-umber transition-colors outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-[#b3563a] bg-[#b3563a]/10 border border-[#b3563a]/30 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-linen rounded-sm py-3 font-medium text-sm tracking-wide hover:bg-umber transition-colors disabled:opacity-40"
          >
            {loading ? "One moment…" : mode === "signup" ? "Create archive" : "Log in"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          className="mt-6 text-sm text-umber hover:text-ink transition-colors w-full text-center"
        >
          {mode === "signup"
            ? "Already have an archive? Log in"
            : "New here? Create an archive"}
        </button>
      </div>
    </main>
  );
}



 
 