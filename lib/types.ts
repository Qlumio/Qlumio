export type Asset = {
  id: string;
  name: string;
  type: string;
  purchase_year: number | null;
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
  name: string;
  role: string;
  color: string;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  permission_level: string; // "admin" | "member"
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
};

export type Event = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (startdato, brukes også for ukedag ved gjentagelse)
  end_date: string | null; // YYYY-MM-DD (sluttdato for flerdagsaktiviteter)
  start_time: string | null;
  end_time: string | null;
  recurring: boolean;
  created_at: string;
  participant_ids: string[]; // fra event_participants
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
