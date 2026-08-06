INSERT INTO departments (code, display_name) VALUES
  ('frontend', 'Frontend Studio'),
  ('backend', 'Backend Engine Room'),
  ('devops', 'DevOps Control Room'),
  ('qa', 'QA Testing Lab')
ON CONFLICT (code) DO NOTHING;
