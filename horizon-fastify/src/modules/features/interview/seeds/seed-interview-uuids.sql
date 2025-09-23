-- Seed interview data with proper UUIDs
-- Categories
INSERT INTO interview.categories (id, type, name, description) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'tech', 'System Design', 'Large-scale distributed systems')
ON CONFLICT DO NOTHING;

-- Topics
INSERT INTO interview.topics (id, category_id, name, description, difficulty) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Design URL Shortener', 'Design a scalable URL shortening service', 3),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Design Chat System', 'Design a real-time chat application', 4)
ON CONFLICT DO NOTHING;

-- Interviewers
INSERT INTO interview.interviewers (id, display_name, company, role, topic_ids, difficulty) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'Senior Engineer', 'Tech Corp', 'Principal Engineer', '["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]'::jsonb, 3)
ON CONFLICT DO NOTHING;