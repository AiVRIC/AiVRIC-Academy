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

-- ══════════════════════════════════════════════════════════════════════
-- Migration: Badge & Certification System v2
-- Run AFTER the initial setup above (safe to re-run — uses IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════════════════

-- ── 6. Extend certifications for path-level certs ──────────────────────
ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS cert_type    TEXT        NOT NULL DEFAULT 'course'
    CHECK (cert_type IN ('course', 'path')),
  ADD COLUMN IF NOT EXISTS path_id      TEXT,
  ADD COLUMN IF NOT EXISTS learner_name TEXT,
  ADD COLUMN IF NOT EXISTS quiz_score   INTEGER,
  ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 years');

-- ── 7. Course Completion Badges ────────────────────────────────────────
-- One badge per course per user; separate from path-level certifications.
CREATE TABLE IF NOT EXISTS public.user_badges (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id      TEXT        NOT NULL,
  badge_type     TEXT        NOT NULL DEFAULT 'course_complete',
  badge_level    TEXT        NOT NULL DEFAULT 'practitioner',
  credential_id  TEXT        UNIQUE NOT NULL,
  course_title   TEXT,
  quiz_score     INTEGER,
  learner_name   TEXT,
  earned_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, course_id, badge_type)
);

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON public.user_badges (user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own badges"
  ON public.user_badges FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 8. Public Credential Verification ─────────────────────────────────
-- Called by verify.html as an anonymous Supabase RPC call.
-- SECURITY DEFINER so it can read both tables without exposing user_id.
CREATE OR REPLACE FUNCTION public.verify_credential(p_id TEXT)
RETURNS TABLE (
  credential_id  TEXT,
  title          TEXT,
  cred_level     TEXT,
  cred_type      TEXT,
  learner_name   TEXT,
  issued_at      TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  is_valid       BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Check user_badges (course badges)
  RETURN QUERY
    SELECT
      ub.credential_id::TEXT,
      ub.course_title::TEXT,
      ub.badge_level::TEXT,
      'badge'::TEXT,
      ub.learner_name::TEXT,
      ub.earned_at,
      NULL::TIMESTAMPTZ,
      TRUE
    FROM public.user_badges ub
    WHERE ub.credential_id = p_id
    LIMIT 1;

  -- If not found, check certifications (path certs)
  IF NOT FOUND THEN
    RETURN QUERY
      SELECT
        c.credential_id::TEXT,
        c.course_title::TEXT,
        'professional'::TEXT,
        c.cert_type::TEXT,
        c.learner_name::TEXT,
        c.issued_at,
        c.expires_at,
        (c.expires_at IS NULL OR c.expires_at > NOW())
      FROM public.certifications c
      WHERE c.credential_id = p_id
      LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_credential(TEXT) TO anon, authenticated;

-- ── 9. Badge leaderboard view (optional — for future use) ─────────────
CREATE OR REPLACE VIEW public.user_badge_summary AS
SELECT
  user_id,
  COUNT(*)                                             AS badges_earned,
  COUNT(*) FILTER (WHERE badge_level = 'foundations')  AS foundations_count,
  COUNT(*) FILTER (WHERE badge_level = 'practitioner') AS practitioner_count,
  MAX(earned_at)                                       AS last_earned_at
FROM public.user_badges
GROUP BY user_id;

CREATE OR REPLACE FUNCTION public.get_my_badge_summary()
RETURNS SETOF public.user_badge_summary
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM public.user_badge_summary WHERE user_id = auth.uid();
$$;

-- ── 10. Auth settings reminder ─────────────────────────────────────────
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
