-- Migration: Add translation_key support for system categories
-- Run this migration to enable multilingual system categories

-- 1. Remove NOT NULL constraint from name column (to allow system categories with translation_key)
ALTER TABLE categories
ALTER COLUMN name DROP NOT NULL;

-- 2. Add translation_key column to categories table
ALTER TABLE categories
ADD COLUMN translation_key TEXT;

-- 3. Add comment for documentation
COMMENT ON COLUMN categories.translation_key IS
'Translation key for system categories (e.g., "category.groceries"). User-created categories have NULL here and use the name field directly.';

-- 4. Create index for faster lookups
CREATE INDEX categories_translation_key_idx ON categories(translation_key) WHERE translation_key IS NOT NULL;

-- 5. Migrate existing default categories to use translation keys
-- This updates categories that match the default seed data

UPDATE categories
SET translation_key = 'category.salary', name = NULL
WHERE name = 'Salary' AND icon = 'Briefcase';

UPDATE categories
SET translation_key = 'category.freelance', name = NULL
WHERE name = 'Freelance' AND icon = 'Laptop';

UPDATE categories
SET translation_key = 'category.groceries', name = NULL
WHERE name = 'Groceries' AND icon = 'ShoppingCart';

UPDATE categories
SET translation_key = 'category.rent', name = NULL
WHERE name = 'Rent' AND icon = 'Home';

UPDATE categories
SET translation_key = 'category.transport', name = NULL
WHERE name = 'Transport' AND icon = 'Car';

UPDATE categories
SET translation_key = 'category.eatingOut', name = NULL
WHERE name = 'Eating Out' AND icon = 'Utensils';

UPDATE categories
SET translation_key = 'category.entertainment', name = NULL
WHERE name = 'Entertainment' AND icon = 'Film';

UPDATE categories
SET translation_key = 'category.health', name = NULL
WHERE name = 'Health' AND icon = 'Heart';

UPDATE categories
SET translation_key = 'category.shopping', name = NULL
WHERE name = 'Shopping' AND icon = 'ShoppingBag';

-- 6. Add check constraint to ensure either name OR translation_key is set
ALTER TABLE categories
ADD CONSTRAINT categories_name_or_key_required
CHECK (name IS NOT NULL OR translation_key IS NOT NULL);

-- Done! Categories now support both:
-- - System categories: translation_key set, name is NULL
-- - User categories: name set, translation_key is NULL
