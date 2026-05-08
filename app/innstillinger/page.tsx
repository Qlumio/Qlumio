export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import MemberSettings from "@/components/MemberSettings";
import InviteCodeManager from "@/components/InviteCodeManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Innstillinger – Qlumio",
};

export default async function InnstillingerPage() {
  const supabase = await createServerClient();

  const [{ data: members }, { data: inviteCodes }] = await Promise.all([
    supabase.from("family_members").select("*").order("created_at"),
    supabase
      .from("invite_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="text-gray-500 hover:text-gray-900 transition-colors text-sm flex items-center gap-1"
        >
          ← Tilbake
        </Link>
        <h1 className="text-2xl font-bold">Innstillinger</h1>
      </div>

      <div className="max-w-2xl space-y-8">
        <MemberSettings members={members ?? []} />
        <InviteCodeManager initialCodes={inviteCodes ?? []} />

        {/* Økonomi-oppsett */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Familieøkonomi</h2>
          <p className="text-sm text-gray-500 mb-4">
            Sett opp eller oppdater inntekter, faste utgifter og sparekontoer.
          </p>
          <Link
            href="/setup"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Start økonomi-wizard
          </Link>
        </div>
      </div>
    </main>
  );
}
