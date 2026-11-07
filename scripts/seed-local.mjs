// Gera scripts/seed-local.sql com dados de demonstração para desenvolvimento local.
// Uso: node scripts/seed-local.mjs   (depois: wrangler d1 execute formatura-solidaria --local --file scripts/seed-local.sql)
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

function hashSenha(senha) {
  const iteracoes = 10000;
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(senha, salt, iteracoes, 32, 'sha256');
  return `pbkdf2$${iteracoes}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const SENHA_LOCAL = 'formatura123';
const alunos = [
  ['Matheus Rodrigues da Silva', '3º A'],
  ['Ana Beatriz Souza', '3º A'],
  ['João Pedro Oliveira', '3º A'],
  ['Maria Eduarda Santos', '3º B'],
  ['Gabriel Henrique Lima', '3º B'],
  ['Larissa Fernandes Costa', '3º B'],
  ['Lucas Gabriel Almeida', '9º A'],
  ['Julia Cristina Pereira', '9º A'],
  ['Pedro Henrique Araújo', '9º A'],
  ['Isabela Cavalcanti Rocha', '9º B'],
  ['Vinícius Martins Barbosa', '9º B'],
  ['Camila Aparecida Dias', 'EJA'],
  ['José Carlos Nascimento', 'EJA'],
];

let sql = `-- Dados de demonstração (apenas local)
DELETE FROM auditoria; DELETE FROM alunos; DELETE FROM usuarios; DELETE FROM escolas;
INSERT INTO escolas (id, nome, slug, edicao, capacidade, link_grupo_whatsapp) VALUES
  (1, 'E.E. Professora Edna Fernandes', 'edna', 2026, 600, 'https://chat.whatsapp.com/exemplo'),
  (2, 'E.E. Vila Virgínia', 'vila-virginia', 2026, 500, NULL);
INSERT INTO usuarios (nome, email, senha_hash, papel, escola_id) VALUES
  ('Administrador', 'admin@local.teste', '${hashSenha(SENHA_LOCAL)}', 'admin', NULL),
  ('Comissão Edna', 'comissao@local.teste', '${hashSenha(SENHA_LOCAL)}', 'comissao', 1),
  ('Direção Edna', 'direcao@local.teste', '${hashSenha(SENHA_LOCAL)}', 'direcao', 1);
`;

for (const [nome, turma] of alunos) {
  sql += `INSERT INTO alunos (escola_id, nome, nome_busca, turma) VALUES (1, '${nome.replace(/'/g, "''")}', '${normalizar(nome)}', '${turma}');\n`;
}
sql += `INSERT INTO alunos (escola_id, nome, nome_busca, turma) VALUES (2, 'Aluno Exemplo Vila', '${normalizar('Aluno Exemplo Vila')}', '3º A');\n`;

writeFileSync(new URL('./seed-local.sql', import.meta.url), sql, 'utf8');
console.log('seed-local.sql gerado. Logins locais (senha: ' + SENHA_LOCAL + '):');
console.log('  admin@local.teste | comissao@local.teste | direcao@local.teste');
