"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    setErrorMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("Passordet må være minst 6 tegn.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passordene er ikke like.");
      return;
    }

    setStatus("loading");
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("success");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Bytt passord</h2>
      <p className="text-sm text-gray-500 mb-4">
        Velg et nytt passord for din Qlumio-konto.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Nytt passord</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minst 6 tegn"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Bekreft passord</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Gjenta passordet"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-500">{errorMsg}</p>
        )}

        {status === "success" && (
          <p className="text-sm text-green-600 font-medium">✅ Passordet er oppdatert!</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={status === "loading"}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}
        >
          {status === "loading" ? "Lagrer..." : "Bytt passord"}
        </button>
      </div>
    </div>
  );
}
