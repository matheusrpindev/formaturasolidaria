import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

export type Env = { DB: D1Database; SESSION_SECRET: string; ASSETS: Fetcher };
export type SessUser = {
  id: number;
  nome: string;
  email: string;
  papel: 'admin' | 'comissao' | 'direcao';
  escola_id: number | null;
};

const ITERACOES = 10000;

const te = new TextEncoder();

function b64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64dec(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64url(bytes: Uint8Array): string {
  return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pbkdf2(senha: string, salt: Uint8Array, iteracoes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', te.encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: iteracoes },
    key,
    256
  );
  return new Uint8Array(bits);
}

export async function hashSenha(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(senha, salt, ITERACOES);
  return `pbkdf2$${ITERACOES}$${b64(salt)}$${b64(hash)}`;
}

export async function verificarSenha(senha: string, armazenado: string): Promise<boolean> {
  const partes = armazenado.split('$');
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false;
  const iteracoes = parseInt(partes[1], 10);
  const salt = b64dec(partes[2]);
  const esperado = b64dec(partes[3]);
  const hash = await pbkdf2(senha, salt, iteracoes);
  if (hash.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ esperado[i];
  return diff === 0;
}

async function assinar(dados: string, segredo: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', te.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, te.encode(dados));
  return b64url(new Uint8Array(sig));
}

const SESSAO_DIAS = 30;

export async function criarSessao(c: Context<{ Bindings: Env }>, usuarioId: number): Promise<void> {
  const exp = Date.now() + SESSAO_DIAS * 24 * 60 * 60 * 1000;
  const dados = `${usuarioId}.${exp}`;
  const sig = await assinar(dados, c.env.SESSION_SECRET);
  setCookie(c, 'sessao', `${dados}.${sig}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSAO_DIAS * 24 * 60 * 60,
  });
}

export function encerrarSessao(c: Context): void {
  deleteCookie(c, 'sessao', { path: '/' });
}

export async function usuarioDaSessao(c: Context<{ Bindings: Env }>): Promise<SessUser | null> {
  const cookie = getCookie(c, 'sessao');
  if (!cookie) return null;
  const partes = cookie.split('.');
  if (partes.length !== 3) return null;
  const [id, exp, sig] = partes;
  if (parseInt(exp, 10) < Date.now()) return null;
  const esperado = await assinar(`${id}.${exp}`, c.env.SESSION_SECRET);
  if (sig !== esperado) return null;
  const u = await c.env.DB.prepare(
    'SELECT id, nome, email, papel, escola_id FROM usuarios WHERE id = ?'
  ).bind(parseInt(id, 10)).first<SessUser>();
  return u ?? null;
}
