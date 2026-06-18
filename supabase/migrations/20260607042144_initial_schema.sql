-- Enable pgvector extension for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    student_id TEXT UNIQUE,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- =============================================
-- CLINICAL MANUALS (RAG)
-- =============================================
CREATE TABLE public.clinical_manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_document TEXT,
    page_number INTEGER,
    embedding VECTOR(1536)
);

ALTER TABLE public.clinical_manuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read clinical manuals"
    ON public.clinical_manuals FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert clinical manuals"
    ON public.clinical_manuals FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can update clinical manuals"
    ON public.clinical_manuals FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- HNSW index for vector similarity search
CREATE INDEX ON public.clinical_manuals USING hnsw (embedding vector_cosine_ops);

-- =============================================
-- PEDAGOGICAL PROGRESS
-- =============================================
CREATE TABLE public.pedagogical_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    specialty TEXT NOT NULL,
    level INTEGER NOT NULL,
    status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'completed')),
    score INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    UNIQUE(profile_id, specialty, level)
);

ALTER TABLE public.pedagogical_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
    ON public.pedagogical_progress FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own progress"
    ON public.pedagogical_progress FOR UPDATE
    USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own progress"
    ON public.pedagogical_progress FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Teachers can view all progress"
    ON public.pedagogical_progress FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'teacher'
    ));

-- =============================================
-- DIAGNOSIS SESSIONS
-- =============================================
CREATE TABLE public.diagnosis_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url TEXT,
    detected_objects JSONB,
    clinical_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.diagnosis_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnosis sessions"
    ON public.diagnosis_sessions FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own diagnosis sessions"
    ON public.diagnosis_sessions FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

-- =============================================
-- AI CONVERSATIONS
-- =============================================
CREATE TABLE public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    messages JSONB NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own conversations"
    ON public.ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own conversations"
    ON public.ai_conversations FOR UPDATE
    USING (auth.uid() = profile_id);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_progress_profile ON public.pedagogical_progress(profile_id);
CREATE INDEX idx_diagnosis_profile ON public.diagnosis_sessions(profile_id);
CREATE INDEX idx_conversations_profile ON public.ai_conversations(profile_id);
