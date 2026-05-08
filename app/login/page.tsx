"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase, setAuthCookies } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Feil e-post eller passord. Prøv igjen.");
      setLoading(false);
      return;
    }

    if (data.session) {
      setAuthCookies(data.session.access_token, data.session.refresh_token);
      router.push("/");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen flex">

      {/* ── Venstre: innloggingsskjema ── */}
      <div className="flex flex-col justify-center w-full max-w-md px-10 py-12 bg-white">

        {/* Liten logo øverst (mobil: vises ikke siden høyre side er skjult) */}
        <div className="mb-10 lg:hidden flex justify-center">
          <Image src="/logo.png" alt="Qlumio" width={160} height={77} priority />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Logg inn</h1>
        <p className="text-sm text-gray-400 mb-8">Velkommen tilbake til Qlumio</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="din@epost.no"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50
                         focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ "--tw-ring-color": "var(--brand-purple)" } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Passord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50
                         focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ "--tw-ring-color": "var(--brand-purple)" } as React.CSSProperties}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-cyan))" }}
          >
            {loading ? "Logger inn…" : "Logg inn"}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-100 space-y-3 text-sm text-center text-gray-500">
          <p>
            Ny familie?{" "}
            <Link href="/register" className="font-semibold hover:underline" style={{ color: "var(--brand-purple)" }}>
              Opprett familiekonto
            </Link>
          </p>
          <p>
            Invitert til en familie?{" "}
            <Link href="/join" className="font-semibold hover:underline" style={{ color: "var(--brand-purple)" }}>
              Bli med med invitasjonskode
            </Link>
          </p>
        </div>
      </div>

      {/* ── Høyre: brand-hero (skjules på mobil) ── */}
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center px-16 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #7C3AED 0%, #6366F1 45%, #22D3EE 100%)" }}
      >
        {/* Subtile bakgrunnssirkler */}
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-10 bg-white -top-32 -right-32" />
        <div className="absolute w-[300px] h-[300px] rounded-full opacity-10 bg-white -bottom-20 -left-20" />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          <Image
            src="/icon-512x512.png"
            alt="Qlumio"
            width={160}
            height={160}
            priority
            className="drop-shadow-2xl"
          />
          <div className="text-center">
            <h2 className="text-5xl font-extrabold text-white tracking-tight mb-4">
              Qlumio
            </h2>
            <p className="text-2xl font-medium text-white/80 tracking-wide">
              Less chaos, more family
            </p>
          </div>

          {/* Tre kort med verdipunkter */}
          <div className="mt-6 space-y-3 w-full max-w-xs">
            {[
              { icon: "📅", text: "Familiekalenderen samlet på ett sted" },
              { icon: "✅", text: "Gjøremål og ansvar for hele familien" },
              { icon: "💰", text: "Full oversikt over familiens økonomi" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium text-white">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </main>
  );
}
