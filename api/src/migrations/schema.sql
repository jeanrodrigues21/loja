/*
  # Database Schema for Servicos Gerenciamento API

  1. Tables
    - users: User accounts with authentication
    - services: Service records
    - expenses: Expense records
    - appointments: Appointment scheduling
    - withdrawals: Withdrawal records
    - closed_periods: Historical period data
    - system_settings: System configuration
    - images: Image storage metadata

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure data access by user_id
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_user_id ON services(user_id);
CREATE INDEX idx_services_status ON services(status);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own services"
  ON services FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::bigint);

CREATE POLICY "Users can create own services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::bigint);

CREATE POLICY "Users can update own services"
  ON services FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::bigint)
  WITH CHECK (user_id = auth.uid()::bigint);

CREATE POLICY "Users can delete own services"
  ON services FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::bigint);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::bigint);

CREATE POLICY "Users can create own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::bigint);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::bigint)
  WITH CHECK (user_id = auth.uid()::bigint);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::bigint);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time TIME NOT NULL,
  client TEXT NOT NULL,
  service TEXT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_date ON appointments(date);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::bigint);

CREATE POLICY "Users can create own appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::bigint);

CREATE POLICY "Users can delete own appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::bigint);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  part_type TEXT NOT NULL CHECK (part_type IN ('part1', 'part2')),
  description TEXT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::bigint);

CREATE POLICY "Users can create own withdrawals"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::bigint);

CREATE POLICY "Users can delete own withdrawals"
  ON withdrawals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::bigint);

-- Closed periods table
CREATE TABLE IF NOT EXISTS closed_periods (
  id BIGSERIAL PRIMARY KEY,
  total_services INTEGER DEFAULT 0,
  total_value DECIMAL(10, 2) DEFAULT 0,
  total_expenses DECIMAL(10, 2) DEFAULT 0,
  net_total DECIMAL(10, 2) DEFAULT 0,
  period_start DATE,
  period_end DATE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_closed_periods_user_id ON closed_periods(user_id);

ALTER TABLE closed_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own closed periods"
  ON closed_periods FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::bigint);

CREATE POLICY "Users can create own closed periods"
  ON closed_periods FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::bigint);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::bigint AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::bigint AND role = 'admin'
    )
  );

-- Images table
CREATE TABLE IF NOT EXISTS images (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_images_user_id ON images(user_id);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own images"
  ON images FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::bigint);

CREATE POLICY "Users can create own images"
  ON images FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::bigint);

CREATE POLICY "Users can delete own images"
  ON images FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::bigint);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('part1_name', 'Instalador'),
  ('part2_name', 'Oficina')
ON CONFLICT (setting_key) DO NOTHING;
