-- Enable pgvector extension for AI code search embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================================
-- TRIGGER FUNCTION FOR AUTOMATING updated_at TIMESTAMPS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 1. USERS PROFILE TABLE (extends auth.users)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 2. ORGANIZATIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 3. ORGANIZATION MEMBERS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (organization_id, user_id)
);

-- =========================================================================
-- 4. TEAMS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 5. TEAM MEMBERS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (team_id, user_id)
);

-- =========================================================================
-- 6. INVITATIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 7. PROJECTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 8. REPOSITORIES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.repositories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  repo_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 9. REPOSITORY INDEXES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.repository_indexes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  branch TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'indexing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 10. REPOSITORY FILES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.repository_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content TEXT NOT NULL,
  language TEXT,
  hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (repo_id, file_path)
);

-- =========================================================================
-- 11. EMBEDDINGS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 12. CONVERSATIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 13. MESSAGES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 14. DOCUMENTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 15. DOCUMENT VERSIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 16. PULL REQUESTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.pull_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  github_pr_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'merged')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 17. CODE REVIEWS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.code_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pr_id UUID REFERENCES public.pull_requests(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'approved', 'rejected')),
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 18. REVIEW COMMENTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.review_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES public.code_reviews(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 19. ANALYSIS JOBS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.analysis_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  step_status JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 20. SECURITY REPORTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.security_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  findings JSONB NOT NULL,
  severity_counts JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 21. TECH DEBT REPORTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tech_debt_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  issues JSONB NOT NULL,
  estimated_days NUMERIC NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 22. SUBSCRIPTIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 23. INVOICES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  status TEXT NOT NULL,
  invoice_pdf TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 24. USAGE RECORDS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.usage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('tokens', 'repositories', 'members')),
  quantity INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 25. API KEYS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  hashed_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- =========================================================================
-- 26. GIT CONNECTIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.git_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  github_app_installation_id TEXT,
  encrypted_oauth_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 27. AI PROVIDER CONFIGS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'groq', 'openrouter', 'ollama')),
  encrypted_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (organization_id, provider)
);

-- =========================================================================
-- 28. NOTIFICATIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 29. NOTIFICATION PREFERENCES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_job_completion BOOLEAN DEFAULT TRUE NOT NULL,
  email_billing BOOLEAN DEFAULT TRUE NOT NULL,
  email_invites BOOLEAN DEFAULT TRUE NOT NULL,
  in_app_job_completion BOOLEAN DEFAULT TRUE NOT NULL,
  in_app_billing BOOLEAN DEFAULT TRUE NOT NULL,
  in_app_invites BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 30. SUPPORT TICKETS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 31. TICKET MESSAGES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'agent')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 32. AUDIT LOGS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 33. FEATURE FLAGS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 34. SETTINGS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  general_settings JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- AUTOMATED TIMESTAMPS BINDINGS
-- =========================================================================
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_organizations_timestamp BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_organization_members_timestamp BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_teams_timestamp BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_invitations_timestamp BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_projects_timestamp BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_repositories_timestamp BEFORE UPDATE ON public.repositories FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_repository_indexes_timestamp BEFORE UPDATE ON public.repository_indexes FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_repository_files_timestamp BEFORE UPDATE ON public.repository_files FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_conversations_timestamp BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_documents_timestamp BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_pull_requests_timestamp BEFORE UPDATE ON public.pull_requests FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_code_reviews_timestamp BEFORE UPDATE ON public.code_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_analysis_jobs_timestamp BEFORE UPDATE ON public.analysis_jobs FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_subscriptions_timestamp BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_git_connections_timestamp BEFORE UPDATE ON public.git_connections FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_ai_provider_configs_timestamp BEFORE UPDATE ON public.ai_provider_configs FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_support_tickets_timestamp BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_settings_timestamp BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

-- =========================================================================
-- DATABASE HELPER FUNCTIONS FOR SECURITY & AUDIT
-- =========================================================================

-- Helper to check if a user belongs to an organization
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to retrieve a user's role in an organization
CREATE OR REPLACE FUNCTION public.get_org_role(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = org_id AND user_id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit Logging insertion utility function
CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_org_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_metadata JSONB,
  p_ip_address TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address
  ) VALUES (
    p_org_id,
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_ip_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- AUTOMATED USER CREATION TRIGGER
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Engineering Member')
  );
  -- Initialize notification preferences
  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) ACTIVATION
-- =========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_debt_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.git_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- RLS SECURITY POLICIES
-- =========================================================================

-- 1. Users policies
CREATE POLICY "Allow read access to profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow update to own profile" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Organizations policies
CREATE POLICY "Allow select for members" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY "Allow insert for authenticated users" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for owners and admins" ON public.organizations FOR UPDATE TO authenticated USING (public.get_org_role(id) IN ('owner', 'admin')) WITH CHECK (public.get_org_role(id) IN ('owner', 'admin'));
CREATE POLICY "Allow delete for owners" ON public.organizations FOR DELETE TO authenticated USING (public.get_org_role(id) = 'owner');

-- 3. Organization Members policies
CREATE POLICY "Allow select members for org members" ON public.organization_members FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Allow manage members for owners/admins" ON public.organization_members FOR ALL TO authenticated USING (public.get_org_role(organization_id) IN ('owner', 'admin')) WITH CHECK (public.get_org_role(organization_id) IN ('owner', 'admin'));
CREATE POLICY "Allow members to leave organization" ON public.organization_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4. Teams policies
CREATE POLICY "Allow select teams for org members" ON public.teams FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Allow manage teams for owners/admins" ON public.teams FOR ALL TO authenticated USING (public.get_org_role(organization_id) IN ('owner', 'admin')) WITH CHECK (public.get_org_role(organization_id) IN ('owner', 'admin'));

-- 5. Team Members policies
CREATE POLICY "Allow select team members for org members" ON public.team_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND public.is_org_member(t.organization_id)));
CREATE POLICY "Allow manage team members for owners/admins" ON public.team_members FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND public.get_org_role(t.organization_id) IN ('owner', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND public.get_org_role(t.organization_id) IN ('owner', 'admin')));

-- 6. Invitations policies
CREATE POLICY "Allow select invitations for org members" ON public.invitations FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Allow manage invitations for owners/admins" ON public.invitations FOR ALL TO authenticated USING (public.get_org_role(organization_id) IN ('owner', 'admin')) WITH CHECK (public.get_org_role(organization_id) IN ('owner', 'admin'));

-- 7. Projects policies
CREATE POLICY "Allow select projects for org members" ON public.projects FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Allow manage projects for owners/admins" ON public.projects FOR ALL TO authenticated USING (public.get_org_role(organization_id) IN ('owner', 'admin')) WITH CHECK (public.get_org_role(organization_id) IN ('owner', 'admin'));

-- 8. Repositories policies
CREATE POLICY "Allow select repos for org members" ON public.repositories FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_org_member(p.organization_id)));
CREATE POLICY "Allow manage repos for owners/admins" ON public.repositories FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.get_org_role(p.organization_id) IN ('owner', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.get_org_role(p.organization_id) IN ('owner', 'admin')));

-- 9. Repository Indexes policies
CREATE POLICY "Allow select indexes for org members" ON public.repository_indexes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.is_org_member(p.organization_id)));
CREATE POLICY "Allow manage indexes for owners/admins" ON public.repository_indexes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.get_org_role(p.organization_id) IN ('owner', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.get_org_role(p.organization_id) IN ('owner', 'admin')));

-- 10. Repository Files policies
CREATE POLICY "Allow select files for org members" ON public.repository_files FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.is_org_member(p.organization_id)));
CREATE POLICY "Allow manage files for owners/admins" ON public.repository_files FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.get_org_role(p.organization_id) IN ('owner', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.get_org_role(p.organization_id) IN ('owner', 'admin')));

-- 11. Embeddings policies
CREATE POLICY "Allow select embeddings for org members" ON public.embeddings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.is_org_member(p.organization_id)));
CREATE POLICY "Allow manage embeddings for owners/admins" ON public.embeddings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.get_org_role(p.organization_id) IN ('owner', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.get_org_role(p.organization_id) IN ('owner', 'admin')));

-- 12. Conversations policies
CREATE POLICY "Allow select/manage own conversations" ON public.conversations FOR ALL TO authenticated USING (public.is_org_member(organization_id) AND user_id = auth.uid()) WITH CHECK (public.is_org_member(organization_id) AND user_id = auth.uid());

-- 13. Messages policies
CREATE POLICY "Allow select/insert own conversation messages" ON public.messages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND public.is_org_member(c.organization_id) AND c.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND public.is_org_member(c.organization_id) AND c.user_id = auth.uid()));

-- 14. Documents policies
CREATE POLICY "Allow select docs for org members" ON public.documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_org_member(p.organization_id)));
CREATE POLICY "Allow manage docs for owners/admins" ON public.documents FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.get_org_role(p.organization_id) IN ('owner', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.get_org_role(p.organization_id) IN ('owner', 'admin')));

-- 15. Document Versions policies
CREATE POLICY "Allow select doc versions for org members" ON public.document_versions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.documents d JOIN public.projects p ON d.project_id = p.id WHERE d.id = document_id AND public.is_org_member(p.organization_id)));
CREATE POLICY "Allow manage doc versions for org members" ON public.document_versions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.documents d JOIN public.projects p ON d.project_id = p.id WHERE d.id = document_id AND public.is_org_member(p.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.documents d JOIN public.projects p ON d.project_id = p.id WHERE d.id = document_id AND public.is_org_member(p.organization_id)));

-- 16. Pull Requests policies
CREATE POLICY "Allow select PRs for org members" ON public.pull_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.is_org_member(p.organization_id)));
CREATE POLICY "Allow manage PRs for org members" ON public.pull_requests FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.is_org_member(p.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.is_org_member(p.organization_id)));

-- 17. Code Reviews policies
CREATE POLICY "Allow select reviews for org members" ON public.code_reviews FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pull_requests pr JOIN public.repositories r ON pr.repo_id = r.id JOIN public.projects p ON r.project_id = p.id WHERE pr.id = pr_id AND public.is_org_member(p.organization_id)));
CREATE POLICY "Allow manage reviews for org members" ON public.code_reviews FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.pull_requests pr JOIN public.repositories r ON pr.repo_id = r.id JOIN public.projects p ON r.project_id = p.id WHERE pr.id = pr_id AND public.is_org_member(p.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.pull_requests pr JOIN public.repositories r ON pr.repo_id = r.id JOIN public.projects p ON r.project_id = p.id WHERE pr.id = pr_id AND public.is_org_member(p.organization_id)));

-- 18. Review Comments policies
CREATE POLICY "Allow select review comments for org members" ON public.review_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.code_reviews cr JOIN public.pull_requests pr ON cr.pr_id = pr.id JOIN public.repositories r ON pr.repo_id = r.id JOIN public.projects p ON r.project_id = p.id WHERE cr.id = review_id AND public.is_org_member(p.organization_id)));
CREATE POLICY "Allow manage review comments for org members" ON public.review_comments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.code_reviews cr JOIN public.pull_requests pr ON cr.pr_id = pr.id JOIN public.repositories r ON pr.repo_id = r.id JOIN public.projects p ON r.project_id = p.id WHERE cr.id = review_id AND public.is_org_member(p.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.code_reviews cr JOIN public.pull_requests pr ON cr.pr_id = pr.id JOIN public.repositories r ON pr.repo_id = r.id JOIN public.projects p ON r.project_id = p.id WHERE cr.id = review_id AND public.is_org_member(p.organization_id)));

-- 19. Analysis Jobs policies
CREATE POLICY "Allow select jobs for org members" ON public.analysis_jobs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.is_org_member(p.organization_id)));

-- 20. Security Reports policies
CREATE POLICY "Allow select security reports for org members" ON public.security_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.is_org_member(p.organization_id)));

-- 21. Tech Debt Reports policies
CREATE POLICY "Allow select tech debt reports for org members" ON public.tech_debt_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.repositories r JOIN public.projects p ON r.project_id = p.id WHERE r.id = repo_id AND public.is_org_member(p.organization_id)));

-- 22. Subscriptions policies
CREATE POLICY "Allow select subscription for org members" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

-- 23. Invoices policies
CREATE POLICY "Allow select invoices for org members" ON public.invoices FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

-- 24. Usage Records policies
CREATE POLICY "Allow select usage records for org members" ON public.usage_records FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

-- 25. API Keys policies
CREATE POLICY "Allow select api keys for org members" ON public.api_keys FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Allow manage api keys for owners/admins" ON public.api_keys FOR ALL TO authenticated USING (public.get_org_role(organization_id) IN ('owner', 'admin')) WITH CHECK (public.get_org_role(organization_id) IN ('owner', 'admin'));

-- 26. Git Connections policies
CREATE POLICY "Allow select git connections for org members" ON public.git_connections FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Allow manage git connections for owners/admins" ON public.git_connections FOR ALL TO authenticated USING (public.get_org_role(organization_id) IN ('owner', 'admin')) WITH CHECK (public.get_org_role(organization_id) IN ('owner', 'admin'));

-- 27. AI Provider Configs policies
CREATE POLICY "Allow select configs for org members" ON public.ai_provider_configs FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Allow manage configs for owners/admins" ON public.ai_provider_configs FOR ALL TO authenticated USING (public.get_org_role(organization_id) IN ('owner', 'admin')) WITH CHECK (public.get_org_role(organization_id) IN ('owner', 'admin'));

-- 28. Notifications policies
CREATE POLICY "Allow select/update own notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 29. Notification Preferences policies
CREATE POLICY "Allow select/update own preferences" ON public.notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 30. Support Tickets policies
CREATE POLICY "Allow select/update support tickets for org members" ON public.support_tickets FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- 31. Ticket Messages policies
CREATE POLICY "Allow select/insert ticket messages for org members" ON public.ticket_messages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND public.is_org_member(st.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND public.is_org_member(st.organization_id)));

-- 32. Audit Logs policies
CREATE POLICY "Allow select audit logs for owners/admins" ON public.audit_logs FOR SELECT TO authenticated USING (public.get_org_role(organization_id) IN ('owner', 'admin'));

-- 33. Feature Flags policies
CREATE POLICY "Allow read feature flags to everyone" ON public.feature_flags FOR SELECT USING (true);

-- 34. Settings policies
CREATE POLICY "Allow select settings for org members" ON public.settings FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Allow update settings for owners/admins" ON public.settings FOR UPDATE TO authenticated USING (public.get_org_role(organization_id) IN ('owner', 'admin')) WITH CHECK (public.get_org_role(organization_id) IN ('owner', 'admin'));

-- =========================================================================
-- INDEXES FOR ALL FOREIGN KEYS & COMMONLY QUERIED COLUMNS
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_org ON public.teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_repositories_project ON public.repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_repository_indexes_repo ON public.repository_indexes(repo_id);
CREATE INDEX IF NOT EXISTS idx_repository_files_repo ON public.repository_files(repo_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_repo ON public.embeddings(repo_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_repo ON public.conversations(repo_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo ON public.pull_requests(repo_id);
CREATE INDEX IF NOT EXISTS idx_code_reviews_pr ON public.code_reviews(pr_id);
CREATE INDEX IF NOT EXISTS idx_code_reviews_reviewer ON public.code_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_review ON public.review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_repo ON public.analysis_jobs(repo_id);
CREATE INDEX IF NOT EXISTS idx_security_reports_repo ON public.security_reports(repo_id);
CREATE INDEX IF NOT EXISTS idx_tech_debt_reports_repo ON public.tech_debt_reports(repo_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_org ON public.usage_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(hashed_key);
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_org ON public.ai_provider_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_support_tickets_org ON public.support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);

-- GIN index for full-text search capability
CREATE INDEX IF NOT EXISTS idx_repository_files_content_fts ON public.repository_files USING GIN (to_tsvector('english', content));
