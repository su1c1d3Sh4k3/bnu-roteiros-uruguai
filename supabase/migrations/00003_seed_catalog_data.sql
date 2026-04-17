-- ============================================================
-- Migration 00003: Seed de dados do catálogo
-- ============================================================
-- Dados extraídos do JSX original (v2, 10.04.26)

-- CIDADES
INSERT INTO public.cities (id, nome, emoji, description, sort_order) VALUES
  ('mvd',    'Montevideo',              '🏙️', 'Capital e maior cidade',   1),
  ('pde',    'Punta del Este',          '🏖️', 'Praias e luxo',            2),
  ('col',    'Colonia del Sacramento',  '🏛️', 'Patrimônio histórico',     3),
  ('jose',   'José Ignacio',            '🌿', 'Charme e natureza',        4),
  ('carmelo','Carmelo',                 '🍇', 'Vinhedos e sossego',       5),
  ('outro',  'Outro',                   '📍', 'Outra cidade',             6)
ON CONFLICT (id) DO UPDATE SET
  nome        = EXCLUDED.nome,
  emoji       = EXCLUDED.emoji,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order;

-- PASSEIOS
INSERT INTO public.tours (id, nome, valor_por_pessoa, emoji, description, dias_min, cidade_base, sort_order) VALUES
  ('city_mvd',    'City Tour Montevideo',              129.00, '🏙️', 'Principais pontos turísticos com guia em português',       1, 'mvd', 1),
  ('city_pde',    'City Tour Punta del Este',           240.00, '🏖️', 'A joia do Atlântico, saindo de Montevideo',               1, 'mvd', 2),
  ('city_col',    'City Tour Colonia del Sacramento',   395.00, '🏛️', 'Centro histórico tombado pela UNESCO',                    1, 'mvd', 3),
  ('pizzorno',    'Almoço na Bodega Pizzorno',          720.00, '🍷', 'Visita à vinícola + almoço harmonizado completo',          1, 'mvd', 4),
  ('bouza',       'Degustação na Bodega Bouza',         520.00, '🍾', 'Degustação de vinhos + tábua de queijos especiais',        1, 'mvd', 5),
  ('primuseum',   'Primuseum: Jantar & Tango',          690.00, '💃', 'Show de tango com jantar completo incluído',               1, 'mvd', 6),
  ('milongon',    'El Milongón: Danças Típicas',        820.00, '🎭', 'Show de danças uruguaias + jantar + transfer',             1, 'mvd', 7),
  ('daytour_pde', 'Day Tour Punta (saindo de Punta)',   370.00, '🌅', 'Pôr do sol na Casapueblo + ingresso incluso',              1, 'pde', 8)
ON CONFLICT (id) DO UPDATE SET
  nome             = EXCLUDED.nome,
  valor_por_pessoa = EXCLUDED.valor_por_pessoa,
  emoji            = EXCLUDED.emoji,
  description      = EXCLUDED.description,
  dias_min         = EXCLUDED.dias_min,
  cidade_base      = EXCLUDED.cidade_base,
  sort_order       = EXCLUDED.sort_order;

-- ESTILOS DE HOTEL
INSERT INTO public.hotel_styles (id, label, description, emoji, stars, sort_order) VALUES
  ('3', 'Econômico',           'Confortável e bem localizado, foco no custo-benefício',                          '🏨', '★★★',     1),
  ('4', 'Intermediário',       'Boa qualidade, equilíbrio entre conforto e preço',                               '🏨', '★★★★',    2),
  ('5', 'Superior / Premium',  'Hotel top, diferenciais como vista pro mar e estrutura completa',                '🌟', '★★★★★',   3)
ON CONFLICT (id) DO UPDATE SET
  label       = EXCLUDED.label,
  description = EXCLUDED.description,
  emoji       = EXCLUDED.emoji,
  stars       = EXCLUDED.stars,
  sort_order  = EXCLUDED.sort_order;

-- PERFIS DE VIAGEM
INSERT INTO public.travel_profiles (id, label, emoji, sort_order) VALUES
  ('casal',      'Casal',                  '👫',          1),
  ('familia',    'Família com crianças',   '👨‍👩‍👧‍👦',  2),
  ('amigos',     'Grupo de amigos',        '🧑‍🤝‍🧑',    3),
  ('lua_de_mel', 'Lua de mel',             '💍',          4),
  ('solo',       'Viagem solo',            '🧳',          5),
  ('negocios',   'Viagem a negócios',      '💼',          6)
ON CONFLICT (id) DO UPDATE SET
  label      = EXCLUDED.label,
  emoji      = EXCLUDED.emoji,
  sort_order = EXCLUDED.sort_order;

-- FAIXAS DE ORÇAMENTO
INSERT INTO public.budget_ranges (id, label, min_value, max_value, sort_order) VALUES
  ('ate3500',   'Até R$ 3.500 por pessoa',           0,      3500.00, 1),
  ('3500_5k',   'R$ 3.500 a R$ 5.000 por pessoa',    3500.00, 5000.00, 2),
  ('5k_8k',     'R$ 5.000 a R$ 8.000 por pessoa',    5000.00, 8000.00, 3),
  ('8k_12k',    'R$ 8.000 a R$ 12.000 por pessoa',   8000.00, 12000.00, 4),
  ('12k_mais',  'Acima de R$ 12.000 por pessoa',      12000.00, NULL,   5)
ON CONFLICT (id) DO UPDATE SET
  label      = EXCLUDED.label,
  min_value  = EXCLUDED.min_value,
  max_value  = EXCLUDED.max_value,
  sort_order = EXCLUDED.sort_order;
