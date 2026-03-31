/*
  # Create user profiles and membership system

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `phone` (text)
      - `avatar_url` (text)
      - `membership_level` (text) - VIP级别
      - `points` (integer) - 积分
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `coupons`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `title` (text) - 券标题
      - `description` (text) - 券描述
      - `discount_amount` (numeric) - 折扣金额
      - `code` (text, unique) - 券码
      - `status` (text) - pending/used/expired
      - `expires_at` (timestamptz)
      - `used_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `verification_records`
      - `id` (uuid, primary key)
      - `coupon_id` (uuid, references coupons)
      - `verified_by` (uuid, references user_profiles)
      - `verified_at` (timestamptz)
      - `notes` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Read their own profile and coupons
      - Update their own profile
      - Verify coupons (for authorized users)
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  membership_level text DEFAULT 'regular',
  points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  discount_amount numeric DEFAULT 0,
  code text UNIQUE NOT NULL,
  status text DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coupons"
  ON coupons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create verification_records table
CREATE TABLE IF NOT EXISTS verification_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES coupons(id) ON DELETE CASCADE,
  verified_by uuid REFERENCES user_profiles(id),
  verified_at timestamptz DEFAULT now(),
  notes text DEFAULT ''
);

ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read verification records"
  ON verification_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create verification records"
  ON verification_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = verified_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
