-- Create document_categories table
create table if not exists public.document_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text unique,
  created_at timestamptz default now()
);

comment on table public.document_categories is 'Lista de categorias de documentos gerenciadas pelo admin';
comment on column public.document_categories.name is 'Nome exibido da categoria de documento';

-- Enable RLS
alter table public.document_categories enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Public can view document categories" on public.document_categories;
drop policy if exists "Admins manage document categories" on public.document_categories;

-- Everyone can read categories
create policy "Public can view document categories"
  on public.document_categories
  for select
  using (true);

-- Only admins can insert/update/delete categories
create policy "Admins manage document categories"
  on public.document_categories
  for all
  using (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );

-- Seed initial categories (idempotent)
insert into public.document_categories (name)
values
  ('Normas Regulamentadoras'),
  ('Boas Práticas'),
  ('Manuais Técnicos'),
  ('Legislação'),
  ('SST'),
  ('EPI'),
  ('Treinamento'),
  ('Procedimentos'),
  ('Relatórios')
on conflict (name) do nothing;


