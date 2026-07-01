-- Enable pgvector extension for AI code search embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. USERS PROFILE TABLE (links to auth.users managed by Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. REPOSITORIES TABLE
CREATE TABLE IF NOT EXISTS public.repositories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  repo_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Indexing', -- 'Indexing', 'Indexed', 'Failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ANALYSES TABLE (historical scans and runs)
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  analysis_type TEXT NOT NULL, -- 'dependency', 'security', 'tech_debt', 'complexity'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CHAT HISTORY TABLE (AI Code Assistant inputs & answers)
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. REPORTS TABLE (technical metrics summaries)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  complexity_score INT NOT NULL, -- 0-100 scale
  security_score INT NOT NULL,   -- 0-100 scale
  tech_debt_score INT NOT NULL,  -- 0-100 scale
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. REPO EMBEDDINGS TABLE (vector storage for RAG searching)
CREATE TABLE IF NOT EXISTS public.repo_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE NOT NULL,
  chunk_content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL, -- standard openai 1536-dimensional vector
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATIONS
-- =========================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repo_embeddings ENABLE ROW LEVEL SECURITY;

-- Users Profile policies
CREATE POLICY "Allow public read access to active profiles" 
  ON public.users FOR SELECT USING (true);

CREATE POLICY "Allow users to modify their own profile data" 
  ON public.users FOR UPDATE USING (auth.uid() = id);

-- Repositories policies (Users only access their own)
CREATE POLICY "Allow users to view their own repositories" 
  ON public.repositories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own repositories" 
  ON public.repositories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own repositories" 
  ON public.repositories FOR DELETE USING (auth.uid() = user_id);

-- Analyses policies (Based on repository ownership)
CREATE POLICY "Allow users to view analyses of their repositories" 
  ON public.analyses FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repositories r 
      WHERE r.id = repo_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to run analyses of their repositories" 
  ON public.analyses FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repositories r 
      WHERE r.id = repo_id AND r.user_id = auth.uid()
    )
  );

-- Chat History policies (Users access their own)
CREATE POLICY "Allow users to view their own chat history" 
  ON public.chat_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to record chat events" 
  ON public.chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reports policies (Based on repository ownership)
CREATE POLICY "Allow users to read reports for their repositories" 
  ON public.reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repositories r 
      WHERE r.id = repo_id AND r.user_id = auth.uid()
    )
  );

-- Embeddings policies (Based on repository ownership)
CREATE POLICY "Allow users to query embeddings for their repositories" 
  ON public.repo_embeddings FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repositories r 
      WHERE r.id = repo_id AND r.user_id = auth.uid()
    )
  );

-- =========================================================================
-- AUTOMATED USER CREATION TRIGGER
-- Copy metadata from Supabase auth.users to public.users on signup
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
