-- 0035_seed_csv_services.sql — Seed new categories + style modifiers from CSV data

-- ── New service_categories ──────────────────────────────────────────
INSERT INTO service_categories (name, domain, display_name_zh)
VALUES
  ('correction', 'nails', '矯正'),
  ('new_set_addon', 'lashes', '嫁接加購')
ON CONFLICT (name) DO NOTHING;

-- ── Nails style modifiers ───────────────────────────────────────────
-- gel styles (existing: solid, french, gradient, design + new ones)
INSERT INTO service_style_modifiers (key, display_name_zh, category_id)
SELECT key, display_name_zh, sc.id
FROM (VALUES
  ('cat_eye',      '貓眼'),
  ('mirror',       '鏡面'),
  ('hand_painted', '手繪'),
  ('hailey',       '海莉'),
  ('design_any',   '不挑款/設計款'),
  ('photo_quote',  '傳圖報價'),
  ('discuss',      '到店討論')
) AS v(key, display_name_zh)
CROSS JOIN service_categories sc
WHERE sc.name = 'gel'
ON CONFLICT (key) DO NOTHING;

-- extension styles
INSERT INTO service_style_modifiers (key, display_name_zh, category_id)
SELECT key, display_name_zh, sc.id
FROM (VALUES
  ('single_finger',   '單指'),
  ('full_extension',  '全延')
) AS v(key, display_name_zh)
CROSS JOIN service_categories sc
WHERE sc.name = 'extension'
ON CONFLICT (key) DO NOTHING;

-- removal styles
INSERT INTO service_style_modifiers (key, display_name_zh, category_id)
SELECT key, display_name_zh, sc.id
FROM (VALUES
  ('with_redo',    '續做'),
  ('without_redo', '不續做')
) AS v(key, display_name_zh)
CROSS JOIN service_categories sc
WHERE sc.name = 'nail_removal'
ON CONFLICT (key) DO NOTHING;

-- repair styles
INSERT INTO service_style_modifiers (key, display_name_zh, category_id)
SELECT key, display_name_zh, sc.id
FROM (VALUES
  ('single_finger_repair', '單指')
) AS v(key, display_name_zh)
CROSS JOIN service_categories sc
WHERE sc.name = 'repair'
ON CONFLICT (key) DO NOTHING;

-- treatment styles
INSERT INTO service_style_modifiers (key, display_name_zh, category_id)
SELECT key, display_name_zh, sc.id
FROM (VALUES
  ('basic', '基本'),
  ('deep',  '深層')
) AS v(key, display_name_zh)
CROSS JOIN service_categories sc
WHERE sc.name = 'treatment'
ON CONFLICT (key) DO NOTHING;

-- correction styles
INSERT INTO service_style_modifiers (key, display_name_zh, category_id)
SELECT key, display_name_zh, sc.id
FROM (VALUES
  ('nail_correction', '指甲矯正')
) AS v(key, display_name_zh)
CROSS JOIN service_categories sc
WHERE sc.name = 'correction'
ON CONFLICT (key) DO NOTHING;

-- ── Lashes style modifiers ──────────────────────────────────────────
-- new_set styles (21 items)
INSERT INTO service_style_modifiers (key, display_name_zh, category_id)
SELECT key, display_name_zh, sc.id
FROM (VALUES
  ('jp_natural',     '日式自然'),
  ('jp_glam',        '日式妝感'),
  ('jp_dense',       '日式濃密'),
  ('kr_natural',     '韓式自然'),
  ('kr_glam',        '韓式妝感'),
  ('kr_dense',       '韓式濃密'),
  ('eu_natural',     '歐美自然'),
  ('eu_glam',        '歐美妝感'),
  ('eu_dense',       '歐美濃密'),
  ('unsure_natural', '不確定自然'),
  ('unsure_glam',    '不確定妝感'),
  ('unsure_dense',   '不確定濃密'),
  ('cn_manga',       '新中式漫畫'),
  ('cn_fox',         '新中式狐系'),
  ('cn_butterfly',   '新中式蝶系'),
  ('cn_bunny',       '新中式兔系'),
  ('cn_tassel',      '新中式流蘇'),
  ('cn_sunflower',   '新中式太陽花'),
  ('cn_baby_curl',   '新中式嬰兒彎'),
  ('thai',           '泰式'),
  ('bottom_only',    '純下睫毛')
) AS v(key, display_name_zh)
CROSS JOIN service_categories sc
WHERE sc.name = 'new_set'
ON CONFLICT (key) DO NOTHING;

-- new_set_addon styles
INSERT INTO service_style_modifiers (key, display_name_zh, category_id)
SELECT key, display_name_zh, sc.id
FROM (VALUES
  ('addon_bottom', '下睫毛'),
  ('addon_brown',  '換咖啡色睫毛'),
  ('addon_color',  '加彩色睫毛')
) AS v(key, display_name_zh)
CROSS JOIN service_categories sc
WHERE sc.name = 'new_set_addon'
ON CONFLICT (key) DO NOTHING;

-- lash_removal styles
INSERT INTO service_style_modifiers (key, display_name_zh, category_id)
SELECT key, display_name_zh, sc.id
FROM (VALUES
  ('removal_refill', '續接'),
  ('removal_only',   '純卸睫')
) AS v(key, display_name_zh)
CROSS JOIN service_categories sc
WHERE sc.name = 'lash_removal'
ON CONFLICT (key) DO NOTHING;

-- lash_management styles
INSERT INTO service_style_modifiers (key, display_name_zh, category_id)
SELECT key, display_name_zh, sc.id
FROM (VALUES
  ('management_default', '睫毛管理')
) AS v(key, display_name_zh)
CROSS JOIN service_categories sc
WHERE sc.name = 'lash_management'
ON CONFLICT (key) DO NOTHING;
