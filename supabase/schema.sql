-- ========================================
-- 農作業記録アプリ データベーススキーマ
-- ========================================

-- 農場
CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作業者
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作物カテゴリ（米 / 野菜 / 果樹 など）
CREATE TABLE crop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作物マスタ
CREATE TABLE crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  category_id UUID REFERENCES crop_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作業カテゴリ（土地準備 / 施肥 / 防除 など）
CREATE TABLE work_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作業項目マスタ
CREATE TABLE work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  category_id UUID REFERENCES work_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  needs_pesticide BOOLEAN DEFAULT FALSE,
  needs_fertilizer BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 農薬マスタ
CREATE TABLE pesticides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  registration_number TEXT,
  default_dilution TEXT,
  default_unit TEXT DEFAULT 'L',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 肥料マスタ
CREATE TABLE fertilizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('有機', '化学', '液体', 'その他')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 圃場
CREATE TABLE fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area FLOAT,
  current_crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
  location_note TEXT,
  qr_slug TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作業記録
CREATE TABLE work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  weather TEXT CHECK (weather IN ('晴', '曇', '雨', '雪', '晴れ時々曇', '曇り時々雨')),
  weather_source TEXT DEFAULT 'manual' CHECK (weather_source IN ('manual', 'auto')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作業項目の記録（多対多）
CREATE TABLE work_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_log_id UUID NOT NULL REFERENCES work_logs(id) ON DELETE CASCADE,
  work_type_id UUID NOT NULL REFERENCES work_types(id) ON DELETE RESTRICT
);

-- 農薬使用記録（法定記載事項）
CREATE TABLE pesticide_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_log_id UUID NOT NULL REFERENCES work_logs(id) ON DELETE CASCADE,
  pesticide_id UUID NOT NULL REFERENCES pesticides(id) ON DELETE RESTRICT,
  dilution_ratio TEXT,
  amount_used FLOAT,
  amount_unit TEXT DEFAULT 'L',
  spray_area FLOAT,
  spray_area_unit TEXT DEFAULT 'a',
  target_pest TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 施肥記録
CREATE TABLE fertilizer_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_log_id UUID NOT NULL REFERENCES work_logs(id) ON DELETE CASCADE,
  fertilizer_id UUID NOT NULL REFERENCES fertilizers(id) ON DELETE RESTRICT,
  amount_used FLOAT,
  amount_unit TEXT DEFAULT 'kg',
  method TEXT CHECK (method IN ('元肥', '追肥', '葉面散布', 'その他')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- インデックス
-- ========================================
CREATE INDEX idx_work_logs_farm_date ON work_logs(farm_id, work_date);
CREATE INDEX idx_work_logs_field ON work_logs(field_id);
CREATE INDEX idx_fields_farm ON fields(farm_id);
CREATE INDEX idx_fields_qr_slug ON fields(qr_slug);
CREATE INDEX idx_workers_farm ON workers(farm_id, active);

-- ========================================
-- Row Level Security（RLS）
-- ========================================
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesticides ENABLE ROW LEVEL SECURITY;
ALTER TABLE fertilizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesticide_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fertilizer_uses ENABLE ROW LEVEL SECURITY;

-- 全テーブルを anon ロールから読み書き可能にする（ログイン不要設計）
CREATE POLICY "allow_all" ON farms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON workers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON crop_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON crops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON work_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON work_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON pesticides FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON fertilizers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON work_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON work_log_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON pesticide_uses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON fertilizer_uses FOR ALL USING (true) WITH CHECK (true);
