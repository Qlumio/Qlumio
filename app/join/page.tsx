"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { supabase, setAuthCookies } from "@/lib/supabase/client";

const ROLES = [
  { value: "parent", label: "Forelder" },
  { value: "grandparent", label: "Besteforelder" },
  { value: "other", label: "Annet" },
];

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get("code") ?? "";

  const [step, setStep] = useState<"account" | "profile">("account");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [inviteCode, setInviteCode]   = useState(prefillCode);
  const [memberName, setMemberName]   = useState("");
  const [memberRole, setMemberRole]   = useState("parent");

  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccountStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Passordet må være minst 8 tegn."); return; }
    if (password !== password2) { setError("Passordene stemmer ikke overens."); return; }
    setStep("profile");
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1. Opprett Auth-bruker
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !signUpData.session) {
      setError(signUpError?.message ?? "Registrering feilet. E-posten kan allerede være i bruk.");
      setLoading(false);
      return;
    }

    setAuthCookies(signUpData.session.access_token, signUpData.session.refresh_token);

    // 2. Bli med i familien via invitasjonskode
    const { error: rpcError } = await supabase.rpc("join_family_with_code", {
      p_code:        inviteCode.trim().toUpperCase(),
      p_member_name: memberName.trim(),
      p_role:        memberRole,
    });

    if (rpcError) {
      setError("Kunne ikke bli med: " + rpcError.message);
      // Slett auth-brukeren siden familie-koblingen feilet
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Qlumio</h1>
          <p className="text-gray-500 mt-1">Bli med i familien</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1 rounded-full ${step === "account" ? "bg-blue-500" : "bg-blue-200"}`} />
            <div className={`flex-1 h-1 rounded-full ${step === "profile" ? "bg-blue-500" : "bg-gray-200"}`} />
          </div>

          {step === "account" ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Opprett konto</h2>
              <form onSubmit={handleAccountStep} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-post</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="din@epost.no" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Passord</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minst 8 tegn" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bekreft passord</label>
                  <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••" />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit"
                  className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  Neste →
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Din profil</h2>
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Invitasjonskode</label>
                  <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} required
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    placeholder="ABC12345" maxLength={8} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ditt navn</label>
                  <input type="text" value={memberName} onChange={(e) => setMemberName(e.target.value)} required
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ditt fornavn" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Din rolle</label>
                  <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setStep("account"); setError(""); }}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                    ← Tilbake
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {loading ? "Kobler til…" : "Bli med i familien"}
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="mt-6 text-sm text-center text-gray-600">
            Har du allerede konto?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">Logg inn</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
