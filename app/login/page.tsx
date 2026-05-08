"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, setAuthCookies } from "@/lib/supabase/client";
import { QlumioWordmark } from "@/components/QlumioBrand";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-2">
          <QlumioWordmark width={200} />
          <p className="text-sm text-gray-400 font-medium">Less chaos, more family</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Logg inn</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-post
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="din@epost.no"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Passord
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-xl text-sm font-medium
                         hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Logger inn…" : "Logg inn"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 space-y-3 text-sm text-center text-gray-600">
            <p>
              Ny familie?{" "}
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                Opprett familiekonto
              </Link>
            </p>
            <p>
              Invitert til en familie?{" "}
              <Link href="/join" className="text-blue-600 hover:underline font-medium">
                Bli med med invitasjonskode
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
