-- =========================================================================
-- Dynamic platform migration: vector search RPC, agent tasks, platform
-- admin flag, and provider-agnostic billing columns (Razorpay support).
-- =========================================================================

-- 1. Vector similarity search over repository embeddings.
--    SECURITY INVOKER so RLS on public.embeddings still applies.
CREATE OR REPLACE FUNCTION public.match_embeddings(
  p_repo_id UUID,
  p_query_embedding VECTOR(1536),
  p_match_count INT DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  file_path TEXT,
  chunk_index INT,
  chunk_content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.id,
    e.file_path,
    e.chunk_index,
    e.chunk_content,
    1 - (e.embedding <=> p_query_embedding) AS similarity
  FROM public.embeddings e
  WHERE e.repo_id = p_repo_id
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT LEAST(GREATEST(p_match_count, 1), 20);
$$;

-- 2. Platform admin flag (admin panel gating: real, not email-heuristics).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Agent tasks table (AI engineering agent console).
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  branch_name TEXT,
  status TEXT NOT NULL DEFAULT 'Ingestion'
    CHECK (status IN ('Ingestion', 'PromptAnalysis', 'CodeIntelligence', 'CodeGeneration', 'PendingApproval', 'Approved', 'Rejected', 'Failed')),
  task_list JSONB,
  affected_files JSONB,
  code_diff TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_repo_id ON public.agent_tasks (repo_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_id ON public.agent_tasks (user_id);

CREATE TRIGGER update_agent_tasks_timestamp
  BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_tasks_select_own" ON public.agent_tasks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "agent_tasks_insert_own" ON public.agent_tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_tasks_update_own" ON public.agent_tasks
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "agent_tasks_delete_own" ON public.agent_tasks
  FOR DELETE USING (user_id = auth.uid());

-- 4. Provider-agnostic billing columns (platform currently uses Razorpay).
ALTER TABLE public.subscriptions RENAME COLUMN stripe_subscription_id TO provider_subscription_id;
ALTER TABLE public.subscriptions RENAME COLUMN stripe_customer_id TO provider_customer_id;
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'razorpay'
  CHECK (provider IN ('razorpay', 'stripe'));

ALTER TABLE public.invoices RENAME COLUMN stripe_invoice_id TO provider_invoice_id;
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'razorpay'
  CHECK (provider IN ('razorpay', 'stripe'));
