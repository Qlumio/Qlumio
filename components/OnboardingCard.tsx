"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type Step = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

type Props = {
  memberCount: number;
  eventCount: number;
  expenseCount: number;
};

const DISMISSED_KEY = "qlumio_onboarding_dismissed";
const SAVINGS_KEY   = "qlumio_savings_visited";

export default function OnboardingCard({ memberCount, eventCount, expenseCount }: Props) {
  const [mounted, setMounted]               = useState(false);
  const [dismissed, setDismissed]           = useState(false);
  const [savingsVisited, setSavingsVisited] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
    setSavingsVisited(localStorage.getItem(SAVINGS_KEY) === "true");
    setMounted(true);
  }, []);

  const steps: Step[] = [
    {
      id: "profile",
      label: "Inviter familien din",
      description: "Alle ser samme kalender og kan legge til ting",
      href: "/innstillinger",
      done: memberCount >= 2,
    },
    {
      id: "calendar",
      label: "Legg inn første aktivitet",
      description: "Familiekalenderen begynner å leve",
      href: "/aktiviteter",
      done: eventCount > 0,
    },
    {
      id: "expenses",
      label: "Sett opp faste utgifter",
      description: "Du ser umiddelbart hva familien bruker penger på",
      href: "/okonomi",
      done: expenseCount > 0,
    },
    {
      id: "savings",
      label: "Finn første sparemulighet",
      description: "De fleste familier sparer 1–2 000 kr/mnd her",
      href: "/okonomi",
      done: savingsVisited,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const totalCount     = steps.length;
  const remaining      = totalCount - completedCount;

  if (!mounted || dismissed || completedCount === totalCount) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const handleSavingsClick = () => {
    localStorage.setItem(SAVINGS_KEY, "true");
    setSavingsVisited(true);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 mb-0.5">Gjør familien klar</div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {remaining === 1
              ? "Bare ett steg igjen – dere er nesten i mål 🎉"
              : `${remaining} steg igjen for full oversikt`}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-300 hover:text-gray-500 transition-colors ml-3 mt-0.5 flex-shrink-0"
          aria-label="Skjul"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Fremdriftslinje */}
      <div className="h-1 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-blue-400 rounded-full transition-all duration-700"
          style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
        />
      </div>

      {/* Steg */}
      <div className="space-y-1">
        {steps.map((step) =>
          step.done ? (
            <div key={step.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-300 line-through">{step.label}</span>
            </div>
          ) : (
            <Link
              key={step.id}
              href={step.href}
              onClick={step.id === "savings" ? handleSavingsClick : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group"
            >
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 group-hover:border-blue-400 flex-shrink-0 transition-colors" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">{step.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{step.description}</div>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
        )}
      </div>

    </div>
  );
}
