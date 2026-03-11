-- ========================================
-- シードデータ（2農場）
-- ========================================

-- 農場1: 中村協進農場
INSERT INTO farms (id, name, slug, address, latitude, longitude) VALUES
  ('11111111-0000-0000-0000-000000000001', '中村協進農場', 'nakamura', '岐阜県〇〇市〇〇町', 35.5, 136.7);

-- 農場2: サンプル農場B
INSERT INTO farms (id, name, slug, address, latitude, longitude) VALUES
  ('11111111-0000-0000-0000-000000000002', 'サンプル農場B', 'sample-b', '岐阜県〇〇市△△町', 35.6, 136.8);

-- ----------------------------------------
-- 作業者（農場1）
-- ----------------------------------------
INSERT INTO workers (farm_id, name) VALUES
  ('11111111-0000-0000-0000-000000000001', '中村 太郎'),
  ('11111111-0000-0000-0000-000000000001', '田中 一郎'),
  ('11111111-0000-0000-0000-000000000001', '鈴木 花子');

-- 作業者（農場2）
INSERT INTO workers (farm_id, name) VALUES
  ('11111111-0000-0000-0000-000000000002', '山田 次郎');

-- ----------------------------------------
-- 作物カテゴリ（農場1）
-- ----------------------------------------
INSERT INTO crop_categories (farm_id, name, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', '米', 1),
  ('11111111-0000-0000-0000-000000000001', '野菜', 2),
  ('11111111-0000-0000-0000-000000000001', 'その他', 3);

-- 作物（農場1）
INSERT INTO crops (farm_id, category_id, name)
SELECT '11111111-0000-0000-0000-000000000001', id, 'コシヒカリ' FROM crop_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='米';
INSERT INTO crops (farm_id, category_id, name)
SELECT '11111111-0000-0000-0000-000000000001', id, 'ひとめぼれ' FROM crop_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='米';
INSERT INTO crops (farm_id, category_id, name)
SELECT '11111111-0000-0000-0000-000000000001', id, 'トマト' FROM crop_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='野菜';
INSERT INTO crops (farm_id, category_id, name)
SELECT '11111111-0000-0000-0000-000000000001', id, 'キャベツ' FROM crop_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='野菜';

-- ----------------------------------------
-- 作業カテゴリ（農場1）
-- ----------------------------------------
INSERT INTO work_categories (farm_id, name, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', '土地準備', 1),
  ('11111111-0000-0000-0000-000000000001', '播種・定植', 2),
  ('11111111-0000-0000-0000-000000000001', '施肥', 3),
  ('11111111-0000-0000-0000-000000000001', '防除', 4),
  ('11111111-0000-0000-0000-000000000001', '水管理', 5),
  ('11111111-0000-0000-0000-000000000001', '生育管理', 6),
  ('11111111-0000-0000-0000-000000000001', '収穫', 7),
  ('11111111-0000-0000-0000-000000000001', '出荷', 8),
  ('11111111-0000-0000-0000-000000000001', 'その他', 9);

-- 作業項目（農場1）
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '耕起', false, false, 1 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='土地準備';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '代かき', false, false, 2 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='土地準備';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '畝立て', false, false, 3 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='土地準備';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, 'マルチ張り', false, false, 4 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='土地準備';

INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '播種', false, false, 1 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='播種・定植';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '田植え', false, false, 2 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='播種・定植';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '定植・移植', false, false, 3 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='播種・定植';

INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '元肥施用', false, true, 1 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='施肥';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '追肥', false, true, 2 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='施肥';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '葉面散布', false, true, 3 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='施肥';

INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '農薬散布', true, false, 1 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='防除';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '除草', false, false, 2 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='防除';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '病害虫調査', false, false, 3 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='防除';

INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '入水', false, false, 1 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='水管理';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '落水', false, false, 2 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='水管理';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '灌水', false, false, 3 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='水管理';

INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '整枝・剪定', false, false, 1 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='生育管理';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '誘引', false, false, 2 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='生育管理';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '摘心・摘芽', false, false, 3 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='生育管理';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '摘果', false, false, 4 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='生育管理';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '生育調査', false, false, 5 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='生育管理';

INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '収穫', false, false, 1 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='収穫';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '稲刈り', false, false, 2 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='収穫';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '脱穀・乾燥', false, false, 3 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='収穫';

INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '調製・選別', false, false, 1 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='出荷';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '箱詰め・梱包', false, false, 2 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='出荷';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '出荷', false, false, 3 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='出荷';

INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '圃場見回り', false, false, 1 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='その他';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, '農機整備', false, false, 2 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='その他';
INSERT INTO work_types (farm_id, category_id, name, needs_pesticide, needs_fertilizer, sort_order)
SELECT '11111111-0000-0000-0000-000000000001', id, 'その他', false, false, 99 FROM work_categories WHERE farm_id='11111111-0000-0000-0000-000000000001' AND name='その他';

-- ----------------------------------------
-- 農薬マスタ（農場1・サンプル）
-- ----------------------------------------
INSERT INTO pesticides (farm_id, name, registration_number, default_dilution, default_unit) VALUES
  ('11111111-0000-0000-0000-000000000001', 'コシヒカリ専用農薬A', '農薬-12345', '1000倍', 'L'),
  ('11111111-0000-0000-0000-000000000001', '除草剤B', '農薬-67890', '500倍', 'L');

-- ----------------------------------------
-- 肥料マスタ（農場1・サンプル）
-- ----------------------------------------
INSERT INTO fertilizers (farm_id, name, type) VALUES
  ('11111111-0000-0000-0000-000000000001', '有機一発肥料', '有機'),
  ('11111111-0000-0000-0000-000000000001', '化成肥料14-14-14', '化学');

-- ----------------------------------------
-- 圃場（農場1・サンプル）
-- ----------------------------------------
INSERT INTO fields (farm_id, name, area, location_note, qr_slug)
VALUES
  ('11111111-0000-0000-0000-000000000001', '田んぼA（北側）', 30.0, '〇〇町北部', 'nakamura-field-a'),
  ('11111111-0000-0000-0000-000000000001', '田んぼB（南側）', 25.0, '〇〇町南部', 'nakamura-field-b'),
  ('11111111-0000-0000-0000-000000000001', '野菜畑C', 15.0, '△△町', 'nakamura-field-c');
