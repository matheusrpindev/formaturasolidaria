-- Dados pessoais na inscrição e vagas extras.
--
-- Formando: endereço e data de nascimento.
-- Acompanhantes: uma ficha por pessoa (nome, endereço, nascimento, telefone).
--   As 3 primeiras são o direito de todo formando; da 4ª em diante são vagas
--   extras, 'confirmado' quando havia vaga sobrando na escola ou 'espera' quando não.
-- Vagas sobrando na escola = soma, entre os inscritos, de (3 - acompanhantes - extras).
--   Quem ainda não se inscreveu conta como se fosse usar as 3.

-- Data e horário da cerimônia de cada escola (cada escola/turma tem a sua).
ALTER TABLE escolas ADD COLUMN data_cerimonia TEXT;
ALTER TABLE escolas ADD COLUMN hora_cerimonia TEXT;

ALTER TABLE alunos ADD COLUMN endereco TEXT;
ALTER TABLE alunos ADD COLUMN data_nascimento TEXT;
-- Vagas extras pedidas que ainda não foram atendidas (fila de espera).
ALTER TABLE alunos ADD COLUMN qtd_espera INTEGER NOT NULL DEFAULT 0 CHECK (qtd_espera >= 0);
ALTER TABLE alunos ADD COLUMN espera_desde TEXT;

CREATE TABLE acompanhantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL CHECK (ordem >= 1),
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  data_nascimento TEXT NOT NULL,
  telefone TEXT NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'confirmado' CHECK (situacao IN ('confirmado', 'espera')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (aluno_id, ordem)
);
CREATE INDEX idx_acompanhantes_aluno ON acompanhantes(aluno_id);
CREATE INDEX idx_alunos_espera ON alunos(escola_id, espera_desde) WHERE qtd_espera > 0;
