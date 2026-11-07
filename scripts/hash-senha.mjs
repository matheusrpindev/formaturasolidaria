// Gera o hash de uma senha para inserir usuários via SQL.
// Uso: node scripts/hash-senha.mjs "minha senha"
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const senha = process.argv[2];
if (!senha) {
  console.error('Uso: node scripts/hash-senha.mjs "senha"');
  process.exit(1);
}
const iteracoes = 10000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(senha, salt, iteracoes, 32, 'sha256');
console.log(`pbkdf2$${iteracoes}$${salt.toString('base64')}$${hash.toString('base64')}`);
