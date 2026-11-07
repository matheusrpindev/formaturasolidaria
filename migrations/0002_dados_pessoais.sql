-- Dados pessoais na inscrição: endereço e data de nascimento do formando,
-- e uma ficha para cada acompanhante (nome, endereço, nascimento, telefone).

ALTER TABLE alunos ADD COLUMN endereco TEXT;
ALTER TABLE alunos ADD COLUMN data_nascimento TEXT;

CREATE TABLE acompanhantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL CHECK (ordem BETWEEN 1 AND 3),
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  data_nascimento TEXT NOT NULL,
  telefone TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (aluno_id, ordem)
);
CREATE INDEX idx_acompanhantes_aluno ON acompanhantes(aluno_id);
