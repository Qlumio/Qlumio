// ─── Auth & Familie ──────────────────────────────────────────────────────────

export type Family = {
  id: string;
  name: string;
  created_at: string;
};

export type InviteCode = {
  id: string;
  family_id: string;
  code: string;
  created_by: string | null;
  expires_at: string | null;
  max_uses: number;
  used_count: number;
  active: boolean;
  created_at: string;
};

// ─── Data-typer ───────────────────────────────────────────────────────────────

export type Asset = {
  id: string;
  name: string;
  type: string;
  purchase_year: number | null;
  estimated_value: number | null;
  description: string | null;
  created_at: string;
};

export type AssetTask = {
  id: string;
  asset_id: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  estimated_cost: number | null;
  responsible_member_id: string | null;
  recurring: boolean;
  recurring_months: number | null;
  notes: string | null;
  event_id: string | null;
  created_at: string;
};

export type FamilyMember = {
  id: string;
  user_id: string | null;      // Supabase Auth user UUID
  family_id: string | null;    // UUID til familien
  name: string;
  role: string;
  color: string;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  permission_level: string;    // "owner" | "admin" | "member"
  pin: string | null;
  created_at: string;
};

export type EventException = {
  event_id: string;
  date: string; // YYYY-MM-DD
};

export type ShoppingItem = {
  id: string;
  name: string;
  added_by: string | null;
  checked: boolean;
  checked_at: string | null;
  created_at: string;
  quantity: string | null;
  category: string | null;
  meal_plan_id: string | null;
  source: string | null;
  family_id: string | null;
};
export type Meal = {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  created_at: string;
  meal_ingredients?: MealIngredient[];
};

export type MealIngredient = {
  id: string;
  meal_id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  created_at: string;
};

export type MealPlan = {
  id: string;
  family_id: string;
  date: string;
  meal_id: string | null;
  custom_title: string | null;
  created_at: string;
  meals?: { title: string } | null;
};


export type Event = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (startdato, brukes også for ukedag ved gjentagelse)
  end_date: string | null; // YYYY-MM-DD (sluttdato for flerdagsaktiviteter)
  start_time: string | null;
  end_time: string | null;
  recurring: boolean;
  responsible_member_id: string | null; // foresatt ansvarlig når barn deltar
  category: string | null; // årshjul-kategori
  created_at: string;
  participant_ids: string[]; // fra event_participants
};

// Alle kategorier – vises ved registrering av aktivitet
export const EVENT_CATEGORIES = [
  { value: "trening", label: "Trening", icon: "🏋️" },
  { value: "sport", label: "Sport", icon: "⚽" },
  { value: "skole", label: "Skole", icon: "🏫" },
  { value: "sosialt", label: "Sosialt", icon: "🎉" },
  { value: "ferie", label: "Ferie/Reise", icon: "✈️" },
  { value: "helse", label: "Helse", icon: "🏥" },
  { value: "kjøretøy", label: "Kjøretøy", icon: "🚗" },
  { value: "økonomi", label: "Økonomi", icon: "💰" },
  { value: "eiendom", label: "Eiendom", icon: "🏠" },
  { value: "familie", label: "Familie", icon: "👨‍👩‍👧" },
  { value: "annet", label: "Annet", icon: "📦" },
] as const;

// Kategorier som vises i årshjulet (ikke dagligdagse ting som trening/skole)
export const ARSHJUL_CATEGORIES = EVENT_CATEGORIES.filter((c) =>
  ["helse", "kjøretøy", "økonomi", "eiendom", "familie", "ferie"].includes(c.value)
);

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null; // YYYY-MM-DD
  assigned_to: string | null; // family_member_id
  created_by: string | null; // family_member_id
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type PlannedExpense = {
  id: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string; // skole | sport | ferie | annet
  notes: string | null;
  created_at: string;
};
