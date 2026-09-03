-- Add the 4 additional production tools to the existing tools table.
-- Safe to run once; duplicate slugs are prevented.

INSERT INTO tools
(name, slug, description, icon, category, sort_order, is_active, show_on_home, is_featured, version)
SELECT 'PDF Rotate', 'pdf-rotate',
       'Rotate PDF pages and download the updated document.',
       '🔄', 'PDF Tools', 6, 1, 1, 0, '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'pdf-rotate');

INSERT INTO tools
(name, slug, description, icon, category, sort_order, is_active, show_on_home, is_featured, version)
SELECT 'Delete PDF Pages', 'pdf-delete-pages',
       'Remove selected pages from a PDF and download the updated file.',
       '🗑️', 'PDF Tools', 7, 1, 1, 0, '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'pdf-delete-pages');

INSERT INTO tools
(name, slug, description, icon, category, sort_order, is_active, show_on_home, is_featured, version)
SELECT 'Protect PDF', 'pdf-protect',
       'Protect a PDF with a password before downloading it.',
       '🔐', 'PDF Tools', 8, 1, 1, 0, '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'pdf-protect');

INSERT INTO tools
(name, slug, description, icon, category, sort_order, is_active, show_on_home, is_featured, version)
SELECT 'Split PDF', 'pdf-split',
       'Split a PDF into separate documents by page ranges.',
       '✂️', 'PDF Tools', 9, 1, 1, 0, '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'pdf-split');
