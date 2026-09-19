-- schema.sql
-- -----------------------------------------------------------------------------
-- À exécuter une fois dans l'éditeur SQL de votre projet Supabase.
-- -----------------------------------------------------------------------------

-- Table des commandes passées via le site (SPA)
create table if not exists orders (
  id bigint generated always as identity primary key,
  client_name text not null,
  client_phone text not null,
  client_address text not null,
  items jsonb not null,             -- [{ id, name, price, qty }, ...]
  total integer not null,           -- montant total en FCFA
  payment_method text default 'Paiement à la livraison',
  status text default 'en_attente', -- en_attente | confirmee | livree | annulee
  created_at timestamptz default now()
);

-- Table des clients (commandes en ligne ET inscriptions manuelles admin)
create table if not exists clients (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  email text,
  address text,
  source text default 'en_ligne',   -- 'en_ligne' | 'manuel'
  notes text,
  created_at timestamptz default now()
);

-- Index utiles pour les recherches admin
create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_clients_phone on clients (phone);

-- Sécurité : Row Level Security activée, mais aucune policy publique n'est créée.
-- Seule la clé "service_role" (utilisée uniquement côté serveur dans /api)
-- peut lire/écrire ces tables. Le frontend n'a jamais accès direct à Supabase.
alter table orders enable row level security;
alter table clients enable row level security;
