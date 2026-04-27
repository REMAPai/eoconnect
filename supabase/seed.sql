insert into public.categories (name, slug, icon, sort_order) values
  ('Professional Services',    'professional-services',    '⚖️',  1),
  ('Technology & Software',    'technology-software',      '💻',  2),
  ('Marketing & Creative',     'marketing-creative',       '🎨',  3),
  ('Financial Services',       'financial-services',       '💰',  4),
  ('Real Estate & Property',   'real-estate-property',     '🏢',  5),
  ('Manufacturing & Industry', 'manufacturing-industry',   '🏭',  6),
  ('Health & Wellness',        'health-wellness',          '❤️',  7),
  ('Education & Training',     'education-training',       '📚',  8),
  ('Retail & E-Commerce',      'retail-ecommerce',         '🛒',  9),
  ('Hospitality & Events',     'hospitality-events',       '🎉', 10),
  ('Construction & Trades',    'construction-trades',      '🔨', 11),
  ('Media & Entertainment',    'media-entertainment',      '🎬', 12),
  ('Logistics & Transport',    'logistics-transport',      '🚚', 13),
  ('Food & Beverage',          'food-beverage',            '🍽️', 14)
on conflict (slug) do nothing;
