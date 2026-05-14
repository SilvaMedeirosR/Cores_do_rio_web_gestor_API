-- Adiciona a função 'desenvolvedor' com acesso total ao sistema

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_funcao_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_funcao_check
  CHECK (funcao IN ('orcamentista','rh','financeiro','materiais','gerencia_financeira','desenvolvedor'));
