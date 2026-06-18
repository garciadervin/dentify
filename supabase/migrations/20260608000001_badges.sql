-- Badge definitions
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL, -- emoji or icon name
    requirement_type TEXT NOT NULL, -- 'quiz_complete', 'level_up', 'streak', 'diagnosis'
    requirement_value INTEGER NOT NULL, -- e.g., 5 quizzes, level 3, 7-day streak
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read badges" ON public.badges FOR SELECT TO authenticated USING (true);

-- User earned badges
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can earn badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value) VALUES
  ('Primer Quiz', 'Completa tu primer quiz', '🎯', 'quiz_complete', 1),
  ('Estudiante Dedicated', 'Completa 5 quizzes', '📚', 'quiz_complete', 5),
  ('Sube de Nivel', 'Alcanza el nivel 2 en cualquier especialidad', '⬆️', 'level_up', 2),
  ('Racha Inicial', 'Mantén una racha de 3 días', '🔥', 'streak', 3),
  ('Diagnóstico Inicial', 'Realiza tu primer diagnóstico', '🔬', 'diagnosis', 1);
