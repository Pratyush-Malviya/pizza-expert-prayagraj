-- Phase 3: Security Audit Log Table
-- Provides an immutable, system-level ledger of all sensitive Server Action operations.

CREATE TABLE IF NOT EXISTS public.admin_action_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_name text NOT NULL,
  payload jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Nobody can read these logs except via admin panel (Super Admins)
CREATE POLICY "Super Admins can view audit logs" 
  ON public.admin_action_log 
  FOR SELECT 
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin')
  );

-- 2. Nobody can UPDATE or DELETE (Immutable ledger)
-- No policies for UPDATE or DELETE intentionally.

-- Note: Inserts will be done via the Service Role Key (Admin Client) 
-- in Server Actions, bypassing RLS.

-- Index for querying by user or action
CREATE INDEX IF NOT EXISTS idx_admin_action_log_user_id ON public.admin_action_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_log_action_name ON public.admin_action_log(action_name);
CREATE INDEX IF NOT EXISTS idx_admin_action_log_created_at ON public.admin_action_log(created_at DESC);
