-- Aktivieren von UUIDs (falls noch nicht aktiv)
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Erweitert Clerk User)
-- Hinweis: Wir nutzen TEXT für user_id, da Clerk IDs Strings sind (z.B. "user_2NNE...")
create table profiles (
  user_id text primary key,
  currency text default 'EUR',
  theme_preference text default 'system',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. ACCOUNTS (Giro, Bar, etc.)
create table accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id text not null, -- Verknüpfung zu Clerk ID
  name text not null,
  type text check (type in ('cash', 'bank', 'credit', 'savings')) not null,
  initial_balance decimal(12, 2) default 0.00 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Index für schnelle Abfragen pro User
create index accounts_user_id_idx on accounts(user_id);

-- 3. CATEGORIES
create table categories (
  id uuid default uuid_generate_v4() primary key,
  user_id text not null,
  name text not null,
  icon text, -- Emoji oder Lucide Icon Name
  color text, -- Hex Code (z.B. #FF5733)
  type text check (type in ('income', 'expense')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index categories_user_id_idx on categories(user_id);

-- 4. TRANSACTIONS (Das Herzstück)
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id text not null,
  account_id uuid references accounts(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null,
  amount decimal(12, 2) not null, -- WICHTIG: Decimal statt Float um Rundungsfehler zu vermeiden!
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Indexe für Performance (Filtern nach Datum und User ist am häufigsten)
create index transactions_user_id_date_idx on transactions(user_id, date desc);

-- Row Level Security (RLS) aktivieren
-- Damit Nutzer nur ihre EIGENEN Daten sehen können (Sicherheits-Grundlage)
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

-- Policies (Beispiel für Transaction Table - muss für Clerk angepasst werden)
-- In einer echten Clerk+Supabase Integration übergibt man die UserID oft direkt im Query
-- oder nutzt ein JWT Template. Für den Start reicht es, die RLS vorzubereiten.