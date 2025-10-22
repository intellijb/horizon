-- Create learning schema if not exists
CREATE SCHEMA IF NOT EXISTS learning;

-- Create difficulty enum in learning schema
DO $$ BEGIN
    CREATE TYPE learning.difficulty AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create categories table (tree structure)
CREATE TABLE IF NOT EXISTS learning.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES learning.categories(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 0,
    path TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON learning.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON learning.categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_path ON learning.categories(path);

-- Create problems table
CREATE TABLE IF NOT EXISTS learning.problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES learning.categories(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    solution TEXT NOT NULL,
    explanation TEXT,
    difficulty learning.difficulty NOT NULL,
    tags TEXT[] DEFAULT '{}',
    llm_model VARCHAR(100),
    llm_prompt TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for problems
CREATE INDEX IF NOT EXISTS idx_problems_category_id ON learning.problems(category_id);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON learning.problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_tags ON learning.problems USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_problems_is_active ON learning.problems(is_active);

-- Create submissions table
CREATE TABLE IF NOT EXISTS learning.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    problem_id UUID NOT NULL REFERENCES learning.problems(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    answer TEXT NOT NULL,
    is_correct BOOLEAN,
    time_spent INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, problem_id, attempt_number)
);

-- Create indexes for submissions
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON learning.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON learning.submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON learning.submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_user_problem ON learning.submissions(user_id, problem_id);

-- Create ai_evaluations table
CREATE TABLE IF NOT EXISTS learning.ai_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL UNIQUE REFERENCES learning.submissions(id) ON DELETE CASCADE,
    accuracy DECIMAL(5,2) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
    feedback TEXT NOT NULL,
    suggestions TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    weaknesses TEXT[] DEFAULT '{}',
    llm_model VARCHAR(100) NOT NULL,
    llm_response JSONB DEFAULT '{}'::jsonb,
    evaluated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for ai_evaluations
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_submission_id ON learning.ai_evaluations(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_accuracy ON learning.ai_evaluations(accuracy);

-- Create spaced_repetition_schedules table
CREATE TABLE IF NOT EXISTS learning.spaced_repetition_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    problem_id UUID NOT NULL REFERENCES learning.problems(id) ON DELETE CASCADE,
    ease_factor DECIMAL(3,2) DEFAULT 2.50 CHECK (ease_factor >= 1.3 AND ease_factor <= 2.5),
    interval INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    next_review_at TIMESTAMP NOT NULL,
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    average_accuracy DECIMAL(5,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, problem_id)
);

-- Create indexes for spaced_repetition_schedules
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON learning.spaced_repetition_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_next_review_at ON learning.spaced_repetition_schedules(next_review_at);
CREATE INDEX IF NOT EXISTS idx_schedules_user_next_review ON learning.spaced_repetition_schedules(user_id, next_review_at);

-- Grant permissions to the horizon user
GRANT ALL ON SCHEMA learning TO horizon;
GRANT ALL ON ALL TABLES IN SCHEMA learning TO horizon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA learning TO horizon;

-- Add comment on schema
COMMENT ON SCHEMA learning IS 'Spaced-repetition learning platform with SM-2 algorithm support';