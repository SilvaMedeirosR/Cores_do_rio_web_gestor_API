create table if not exists profiles (
  id         uuid references auth.users on delete cascade primary key,
  nome       text not null,
  sobrenome  text not null,
  telefone   text,
  funcao     text not null check (funcao in ('orcamentista','rh','financeiro','materiais','gerencia_financeira')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "users view own profile"
  on profiles for select using (auth.uid() = id);

create policy "users update own profile"
  on profiles for update using (auth.uid() = id);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nome, sobrenome, telefone, funcao)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'sobrenome',
    new.raw_user_meta_data->>'telefone',
    new.raw_user_meta_data->>'funcao'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
