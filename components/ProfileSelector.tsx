"use client";

import { useState } from "react";
import Link from "next/link";
import type { FamilyMember } from "@/lib/types";
import { useUser } from "@/lib/userContext";

type Props = {
  members: FamilyMember[];
};

export default function ProfileSelector({ members }: Props) {
  const { setCurrentUser } = useUser();
  const [pinMember, setPinMember] = useState<FamilyMember | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const selectMember = (member: FamilyMember) => {
    if (member.permission_level === "admin" && member.pin) {
      setPinMember(member);
      setPin("");
      setPinError(false);
    } else {
      setCurrentUser(member);
    }
  };

  const submitPin = () => {
    if (!pinMember) return;
    if (pin === pinMember.pin) {
      setCurrentUser(pinMember);
      setPinMember(null);
    } else {
      setPinError(true);
      setPin("");
    }
  };

  if (pinMember) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center z-50 p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div
              className={`w-16 h-16 rounded-full ${pinMember.color} mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold`}
            >
              {pinMember.name[0].toUpperCase()}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{pinMember.name}</h2>
            <p className="text-gray-600 text-sm mt-1">Skriv inn PIN for å fortsette</p>
          </div>

          <input
            type="password"
            inputMode="numeric"
            placeholder="••••"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setPinError(false); }}
            onKeyDown={(e) => e.key === "Enter" && submitPin()}
            autoFocus
            className={`w-full text-center text-3xl tracking-widest p-3 rounded-xl bg-white border-2 outline-none mb-3 transition-colors ${
              pinError ? "border-red-400 text-red-500" : "border-gray-200 focus:border-blue-400"
            }`}
          />
          {pinError && (
            <p className="text-red-500 text-sm text-center mb-3">Feil PIN – prøv igjen</p>
          )}

          <button
            onClick={submitPin}
            disabled={!pin}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl font-medium transition-colors mb-3"
          >
            Logg inn
          </button>
          <button
            onClick={() => setPinMember(null)}
            className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            ← Tilbake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center z-50 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Qlumio</h1>
          <p className="text-gray-500 mt-2">Hvem bruker appen nå?</p>
        </div>

        {members.length === 0 ? (
          <p className="text-center text-gray-400 text-sm">
            Ingen familiemedlemmer lagt til ennå.{" "}
            <Link href="/innstillinger" className="text-blue-500 underline">
              Gå til innstillinger
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => selectMember(member)}
                className="w-full flex items-center gap-4 p-4 bg-white hover:bg-gray-100 rounded-xl transition-colors text-left group shadow-sm text-gray-900"
              >
                <div
                  className={`w-11 h-11 rounded-full ${member.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}
                >
                  {member.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{member.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {member.permission_level === "admin" ? "🔐 Super Bruker" : "👤 Familiemedlem"}
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-gray-300 group-hover:text-gray-400 flex-shrink-0 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
