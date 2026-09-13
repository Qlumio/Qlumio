"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/userContext";

type InviteCode = {
  id: string;
  code: string;
  expires_at: string | null;
  max_uses: number;
  used_count: number;
  active: boolean;
  created_at: string;
};

type Props = {
  initialCodes: InviteCode[];
};

export default function InviteCodeManager({ initialCodes }: Props) {
  const { familyMember } = useAuth();
  const isAdmin = familyMember?.permission_level === "owner" || familyMember?.permission_level === "admin";

  const [codes, setCodes] = useState<InviteCode[]>(initialCodes);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Innstillinger for ny kode
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [maxUses, setMaxUses] = useState(1);

  if (!isAdmin) return null;

  const generateCode = async () => {
    setError("");
    setGenerating(true);

    try {
      const { data, error } = await supabase.rpc("generate_invite_code", {
        p_expires_in_hours: expiresInHours,
        p_max_uses: maxUses,
      });

      if (error) {
        setError("Kunne ikke generere kode: " + error.message);
      } else {
        // Hent oppdatert liste
        const { data: newCodes } = await supabase
          .from("invite_codes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);
        setCodes(newCodes ?? []);
      }
    } catch (e) {
      setError("Noe gikk galt. Sjekk internettforbindelsen og prøv igjen.");
    } finally {
      setGenerating(false);
    }
  };

  const deactivateCode = async (id: string) => {
    await supabase.from("invite_codes").update({ active: false }).eq("id", id);
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, active: false } : c)));
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const activeCodes   = codes.filter((c) => c.active);
  const inactiveCodes = codes.filter((c) => !c.active);

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Invitasjoner</h2>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">

        {/* Generer ny kode */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Generer invitasjonskode</h3>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Utløper etter</label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value={24}>24 timer</option>
                <option value={72}>3 dager</option>
                <option value={168}>7 dager</option>
                <option value={720}>30 dager</option>
                <option value={0}>Aldri</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Maks antall bruk</label>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value={1}>1 gang</option>
                <option value={3}>3 ganger</option>
                <option value={5}>5 ganger</option>
                <option value={10}>10 ganger</option>
              </select>
            </div>
          </div>

          <button
            onClick={generateCode}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl
                       hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Genererer…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ny invitasjonskode
              </>
            )}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Aktive koder */}
        {activeCodes.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Aktive koder</h3>
            <div className="space-y-2">
              {activeCodes.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold tracking-widest text-green-900">
                        {c.code}
                      </span>
                      <button
                        onClick={() => copyCode(c.code)}
                        className="text-green-700 hover:text-green-900 transition-colors"
                        title="Kopier kode"
                      >
                        {copied === c.code ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-green-700 mt-0.5">
                      Brukt {c.used_count} av {c.max_uses} ganger
                      {c.expires_at && ` · utløper ${new Date(c.expires_at).toLocaleDateString("nb-NO")}`}
                    </p>
                  </div>
                  <button
                    onClick={() => deactivateCode(c.id)}
                    className="text-xs text-red-600 hover:text-red-800 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    Deaktiver
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inaktive koder */}
        {inactiveCodes.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Tidligere koder</h3>
            <div className="space-y-1">
              {inactiveCodes.map((c) => (
                <div key={c.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-400">
                  <span className="font-mono tracking-widest line-through">{c.code}</span>
                  <span className="text-xs">
                    {c.used_count}/{c.max_uses} brukt
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {codes.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">
            Ingen invitasjonskoder ennå. Generer en for å invitere familiemedlemmer.
          </p>
        )}

        <div className="pt-3 border-t border-gray-100 text-xs text-gray-500">
          Del koden med familiemedlemmet. De går til{" "}
          <span className="font-mono">{typeof window !== "undefined" ? window.location.origin : "qlumio.com"}/join</span>{" "}
          og skriver inn koden.
        </div>
      </div>
    </section>
  );
}
