-- Phase 3F: Initial production Online Tools
-- Safe to run more than once because inserts are guarded by slug.

INSERT INTO tools
(name, slug, description, icon, category, sort_order, is_active, show_on_home, is_featured, version)
SELECT 'Image Crop & Resize', 'image-crop-resize',
       'Crop, resize and optimize images with a target file size.',
       '🖼️', 'Image Tools', 1, 1, 1, 1, '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'image-crop-resize');

INSERT INTO tools
(name, slug, description, icon, category, sort_order, is_active, show_on_home, is_featured, version)
SELECT 'PDF Compressor', 'pdf-compressor',
       'Compress PDF files locally and reduce file size while keeping the document usable.',
       '📦', 'PDF Tools', 2, 1, 1, 1, '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'pdf-compressor');

INSERT INTO tools
(name, slug, description, icon, category, sort_order, is_active, show_on_home, is_featured, version)
SELECT 'JPG/PNG to PDF', 'jpg-png-to-pdf',
       'Convert JPG and PNG images into a PDF document.',
       '🖼️', 'PDF Tools', 3, 1, 1, 0, '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'jpg-png-to-pdf');

INSERT INTO tools
(name, slug, description, icon, category, sort_order, is_active, show_on_home, is_featured, version)
SELECT 'Passport Photo Maker', 'passport-photo-maker',
       'Create passport-size photos with crop, size and AI enhancement options.',
       '🪪', 'Image Tools', 4, 1, 1, 1, '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'passport-photo-maker');

INSERT INTO tools
(name, slug, description, icon, category, sort_order, is_active, show_on_home, is_featured, version)
SELECT 'Merge PDF', 'merge-pdf',
       'Combine multiple PDF files into one PDF document.',
       '📑', 'PDF Tools', 5, 1, 1, 1, '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'merge-pdf');
