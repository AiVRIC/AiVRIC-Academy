-- ══════════════════════════════════════════════════════════════════════
-- AiVRIC Academy — Supabase Database Setup
-- Run this in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. User Profiles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id            UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name  TEXT,
  company       TEXT,
  job_role      TEXT,
  preferred_path TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
  ON public.user_profiles FOR ALL
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. Course Progress ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_progress (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id     TEXT        NOT NULL,
  module_id     TEXT        NOT NULL,
  completed     BOOLEAN     DEFAULT FALSE,
  quiz_correct  BOOLEAN,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, course_id, module_id)
);

CREATE INDEX IF NOT EXISTS course_progress_user_id_idx ON public.course_progress (user_id);
CREATE INDEX IF NOT EXISTS course_progress_course_id_idx ON public.course_progress (course_id);

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress"
  ON public.course_progress FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Certifications ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.certifications (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id      TEXT        NOT NULL,
  course_title   TEXT        NOT NULL,
  issued_at      TIMESTAMPTZ DEFAULT NOW(),
  credential_id  TEXT        UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS certifications_user_id_idx ON public.certifications (user_id);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own certifications"
  ON public.certifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own certifications"
  ON public.certifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Passkey Credentials (for WebAuthn / passkey support) ───────────
-- Required if using the passkey Edge Function.
-- Each user may have multiple registered passkeys.
CREATE TABLE IF NOT EXISTS public.passkey_credentials (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_id      TEXT        NOT NULL UNIQUE,
  public_key         BYTEA       NOT NULL,
  sign_count         BIGINT      DEFAULT 0,
  transports         TEXT[],
  device_type        TEXT,       -- 'singleDevice' | 'multiDevice'
  backed_up          BOOLEAN     DEFAULT FALSE,
  aaguid             TEXT,
  friendly_name      TEXT,       -- e.g. "MacBook Touch ID"
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  last_used_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS passkey_credentials_user_id_idx ON public.passkey_credentials (user_id);

ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own passkeys"
  ON public.passkey_credentials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 5. Helpful views ───────────────────────────────────────────────────
-- Aggregate progress per user per course (used by dashboard)
CREATE OR REPLACE VIEW public.user_course_summary AS
SELECT
  cp.user_id,
  cp.course_id,
  COUNT(*) FILTER (WHERE cp.completed)            AS modules_completed,
  COUNT(*)                                        AS modules_total,
  ROUND(
    COUNT(*) FILTER (WHERE cp.completed)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100
  )                                               AS pct_complete,
  MAX(cp.completed_at)                            AS last_activity
FROM public.course_progress cp
GROUP BY cp.user_id, cp.course_id;

-- Users can read their own summary
CREATE OR REPLACE FUNCTION public.get_my_course_summary()
RETURNS SETOF public.user_course_summary
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM public.user_course_summary WHERE user_id = auth.uid();
$$;

-- ── 6. Auth settings reminder ──────────────────────────────────────────
-- In Supabase Dashboard → Authentication → Settings, configure:
--
--   Site URL:                https://academy.aivric.com
--   Redirect URLs (add):    https://academy.aivric.com/auth.html
--                           https://academy.aivric.com/dashboard.html
--
--   Email magic link:       ✅ Enable OTP (magic link)
--   Google OAuth:           ✅ Enable, set Client ID + Secret
--   Microsoft/Azure OAuth:  ✅ Enable, set Client ID + Secret + Tenant
--
--   Email templates:        Customise with AiVRIC Academy branding
