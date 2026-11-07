-- Formaturas Solidárias — esquema inicial (Fase 1)

CREATE TABLE escolas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  edicao INTEGER NOT NULL DEFAULT 2026,
  capacidade INTEGER,
  prazo_inscricao TEXT,
  link_grupo_whatsapp TEXT,
  kg_arrecadados REAL,
  status TEXT NOT NULL DEFAULT 'ativa',
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('admin', 'comissao', 'direcao')),
  escola_id INTEGER REFERENCES escolas(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE alunos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  escola_id INTEGER NOT NULL REFERENCES escolas(id),
  nome TEXT NOT NULL,
  nome_busca TEXT NOT NULL,
  turma TEXT,
  inscrito_em TEXT,
  codigo TEXT UNIQUE,
  qtd_acompanhantes INTEGER NOT NULL DEFAULT 0 CHECK (qtd_acompanhantes BETWEEN 0 AND 3),
  qtd_extras INTEGER NOT NULL DEFAULT 0 CHECK (qtd_extras >= 0),
  extra_autorizado_por TEXT,
  telefone TEXT,
  observacoes TEXT,
  incluido_manualmente INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_alunos_escola ON alunos(escola_id);
CREATE INDEX idx_alunos_busca ON alunos(escola_id, nome_busca);

CREATE TABLE auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER REFERENCES usuarios(id),
  acao TEXT NOT NULL,
  aluno_id INTEGER,
  escola_id INTEGER,
  detalhe TEXT,
  data TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_auditoria_data ON auditoria(data DESC);

CREATE TABLE config (
  chave TEXT PRIMARY KEY,
  valor TEXT
);
INSERT INTO config (chave, valor) VALUES ('whatsapp_oficial', '');
INSERT INTO config (chave, valor) VALUES ('local_evento', 'CEMI — Centro da Melhor Idade, região central de Itaquaquecetuba (próximo ao Bom Prato)');
INSERT INTO config (chave, valor) VALUES ('data_evento', 'Final de dezembro de 2026 — data exata por escola, avisada no grupo da formatura');
