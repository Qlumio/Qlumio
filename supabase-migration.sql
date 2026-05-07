-- ============================================================
-- Qlumio – Auth & familieseparasjon
-- Kjør dette i Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. Families ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── 2. Oppdater family_members ────────────────────────────
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id)   ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS family_members_user_id_key
  ON family_members (user_id)
  WHERE user_id IS NOT NULL;

-- ─── 3. Invite codes ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS invite_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  code        text UNIQUE NOT NULL,
  created_by  uuid REFERENCES auth.users(id),
  expires_at  timestamptz,
  max_uses    int  NOT NULL DEFAULT 1,
  used_count  int  NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ─── 4. Legg til family_id på alle datatabeller ─────────────
ALTER TABLE events             ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE tasks              ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE planned_expenses   ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE assets             ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE shopping_items     ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE savings_accounts   ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE budget_categories  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE loans              ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE insurances         ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE pensions           ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);

-- budget_overrides: enten eget family_id eller filter via category
ALTER TABLE budget_overrides ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);

-- ─── 5. Helper-funksjon for RLS ────────────────────────────
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS uuid AS $$
  SELECT family_id FROM family_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── 6. Trigger: auto-sett family_id ved INSERT ────────────
-- Alle inserts fra klientkode trenger ikke sende family_id manuelt
CREATE OR REPLACE FUNCTION auto_set_family_id()
RETURNS TRIGGER AS $$
DECLARE
  v_family_id uuid;
BEGIN
  IF NEW.family_id IS NULL THEN
    SELECT family_id INTO v_family_id
    FROM family_members
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_family_id IS NULL THEN
      RAISE EXCEPTION 'Bruker er ikke koblet til en familie';
    END IF;

    NEW.family_id := v_family_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hjelpemakro: opprett trigger hvis den ikke finnes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_events') THEN
    CREATE TRIGGER trg_auto_family_id_events
      BEFORE INSERT ON events
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_tasks') THEN
    CREATE TRIGGER trg_auto_family_id_tasks
      BEFORE INSERT ON tasks
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_planned_expenses') THEN
    CREATE TRIGGER trg_auto_family_id_planned_expenses
      BEFORE INSERT ON planned_expenses
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_assets') THEN
    CREATE TRIGGER trg_auto_family_id_assets
      BEFORE INSERT ON assets
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_shopping_items') THEN
    CREATE TRIGGER trg_auto_family_id_shopping_items
      BEFORE INSERT ON shopping_items
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_savings_accounts') THEN
    CREATE TRIGGER trg_auto_family_id_savings_accounts
      BEFORE INSERT ON savings_accounts
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_budget_categories') THEN
    CREATE TRIGGER trg_auto_family_id_budget_categories
      BEFORE INSERT ON budget_categories
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_loans') THEN
    CREATE TRIGGER trg_auto_family_id_loans
      BEFORE INSERT ON loans
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_insurances') THEN
    CREATE TRIGGER trg_auto_family_id_insurances
      BEFORE INSERT ON insurances
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_pensions') THEN
    CREATE TRIGGER trg_auto_family_id_pensions
      BEFORE INSERT ON pensions
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_family_id_budget_overrides') THEN
    CREATE TRIGGER trg_auto_family_id_budget_overrides
      BEFORE INSERT ON budget_overrides
      FOR EACH ROW EXECUTE FUNCTION auto_set_family_id();
  END IF;
END;
$$;

-- ─── 7. RLS: aktiver på alle tabeller ──────────────────────
ALTER TABLE families          ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_exceptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_expenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_overrides  ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pensions          ENABLE ROW LEVEL SECURITY;

-- ─── 8. RLS-policies ───────────────────────────────────────

-- families
DROP POLICY IF EXISTS "family_select" ON families;
CREATE POLICY "family_select" ON families FOR SELECT
  USING (id = get_my_family_id());

-- family_members
DROP POLICY IF EXISTS "members_all" ON family_members;
CREATE POLICY "members_all" ON family_members FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- invite_codes
DROP POLICY IF EXISTS "invite_codes_all" ON invite_codes;
CREATE POLICY "invite_codes_all" ON invite_codes FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- events
DROP POLICY IF EXISTS "events_all" ON events;
CREATE POLICY "events_all" ON events FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- event_participants (arver sikkerhet via events)
DROP POLICY IF EXISTS "event_participants_all" ON event_participants;
CREATE POLICY "event_participants_all" ON event_participants FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE family_id = get_my_family_id()));

-- event_exceptions
DROP POLICY IF EXISTS "event_exceptions_all" ON event_exceptions;
CREATE POLICY "event_exceptions_all" ON event_exceptions FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE family_id = get_my_family_id()));

-- tasks
DROP POLICY IF EXISTS "tasks_all" ON tasks;
CREATE POLICY "tasks_all" ON tasks FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- planned_expenses
DROP POLICY IF EXISTS "planned_expenses_all" ON planned_expenses;
CREATE POLICY "planned_expenses_all" ON planned_expenses FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- assets
DROP POLICY IF EXISTS "assets_all" ON assets;
CREATE POLICY "assets_all" ON assets FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- asset_tasks (arver via assets)
DROP POLICY IF EXISTS "asset_tasks_all" ON asset_tasks;
CREATE POLICY "asset_tasks_all" ON asset_tasks FOR ALL
  USING (asset_id IN (SELECT id FROM assets WHERE family_id = get_my_family_id()));

-- shopping_items
DROP POLICY IF EXISTS "shopping_items_all" ON shopping_items;
CREATE POLICY "shopping_items_all" ON shopping_items FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- savings_accounts
DROP POLICY IF EXISTS "savings_accounts_all" ON savings_accounts;
CREATE POLICY "savings_accounts_all" ON savings_accounts FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- budget_categories
DROP POLICY IF EXISTS "budget_categories_all" ON budget_categories;
CREATE POLICY "budget_categories_all" ON budget_categories FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- budget_items (arver via budget_categories)
DROP POLICY IF EXISTS "budget_items_all" ON budget_items;
CREATE POLICY "budget_items_all" ON budget_items FOR ALL
  USING (category_id IN (SELECT id FROM budget_categories WHERE family_id = get_my_family_id()));

-- budget_overrides
DROP POLICY IF EXISTS "budget_overrides_all" ON budget_overrides;
CREATE POLICY "budget_overrides_all" ON budget_overrides FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- loans
DROP POLICY IF EXISTS "loans_all" ON loans;
CREATE POLICY "loans_all" ON loans FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- insurances
DROP POLICY IF EXISTS "insurances_all" ON insurances;
CREATE POLICY "insurances_all" ON insurances FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- pensions
DROP POLICY IF EXISTS "pensions_all" ON pensions;
CREATE POLICY "pensions_all" ON pensions FOR ALL
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- ─── 9. Bootstrap-funksjoner (security definer) ────────────
-- Kalles ved registrering og join – omgår RLS siden brukeren
-- ikke har en family_id ennå

CREATE OR REPLACE FUNCTION create_family_and_member(
  p_family_name text,
  p_member_name text,
  p_role        text DEFAULT 'parent'
)
RETURNS jsonb AS $$
DECLARE
  v_family_id uuid;
  v_member_id uuid;
BEGIN
  -- Sjekk at bruker ikke allerede har en familie
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Bruker er allerede koblet til en familie';
  END IF;

  INSERT INTO families (name) VALUES (p_family_name) RETURNING id INTO v_family_id;

  INSERT INTO family_members (user_id, family_id, name, role, color, permission_level)
  VALUES (auth.uid(), v_family_id, p_member_name, p_role, 'bg-blue-500', 'owner')
  RETURNING id INTO v_member_id;

  RETURN jsonb_build_object('family_id', v_family_id, 'member_id', v_member_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION join_family_with_code(
  p_code        text,
  p_member_name text,
  p_role        text DEFAULT 'parent'
)
RETURNS jsonb AS $$
DECLARE
  v_invite    invite_codes%ROWTYPE;
  v_member_id uuid;
BEGIN
  -- Sjekk at bruker ikke allerede har en familie
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Bruker er allerede koblet til en familie';
  END IF;

  -- Finn og valider invitasjonskode
  SELECT * INTO v_invite
  FROM invite_codes
  WHERE code = upper(p_code)
    AND active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND used_count < max_uses;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ugyldig eller utløpt invitasjonskode';
  END IF;

  -- Inkrementer brukteller
  UPDATE invite_codes SET used_count = used_count + 1 WHERE id = v_invite.id;

  -- Deaktiver kode hvis maks antall bruk er nådd
  UPDATE invite_codes SET active = false
  WHERE id = v_invite.id AND used_count >= max_uses;

  -- Opprett familiemedlem
  INSERT INTO family_members (user_id, family_id, name, role, color, permission_level)
  VALUES (auth.uid(), v_invite.family_id, p_member_name, p_role, 'bg-green-500', 'member')
  RETURNING id INTO v_member_id;

  RETURN jsonb_build_object('family_id', v_invite.family_id, 'member_id', v_member_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_invite_code(
  p_expires_in_hours int DEFAULT 72,
  p_max_uses         int DEFAULT 1
)
RETURNS text AS $$
DECLARE
  v_code      text;
  v_family_id uuid;
BEGIN
  SELECT family_id INTO v_family_id
  FROM family_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Bruker er ikke koblet til en familie';
  END IF;

  -- Sjekk admin-rettigheter
  IF NOT EXISTS (
    SELECT 1 FROM family_members
    WHERE user_id = auth.uid()
      AND family_id = v_family_id
      AND permission_level IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Kun eier/admin kan generere invitasjonskoder';
  END IF;

  -- Generer unik kode (8 tegn, store bokstaver)
  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM invite_codes WHERE code = v_code);
  END LOOP;

  INSERT INTO invite_codes (family_id, code, created_by, expires_at, max_uses)
  VALUES (
    v_family_id,
    v_code,
    auth.uid(),
    CASE WHEN p_expires_in_hours > 0
         THEN now() + (p_expires_in_hours || ' hours')::interval
         ELSE NULL END,
    p_max_uses
  );

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 10. Koble eksisterende data til din familie ───────────
-- Kjør dette ETTER at du har registrert deg og fått en family_id.
-- Erstatt 'DIN-FAMILY-ID-HER' med riktig UUID.
-- (Du finner family_id i tabellen families etter registrering)
--
-- UPDATE events           SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE tasks            SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE planned_expenses SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE assets           SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE shopping_items   SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE savings_accounts SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE budget_categories SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE budget_overrides SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE loans            SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE insurances       SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE pensions         SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
-- UPDATE family_members   SET family_id = 'DIN-FAMILY-ID-HER' WHERE family_id IS NULL;
