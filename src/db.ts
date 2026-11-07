export type Escola = {
  id: number;
  nome: string;
  slug: string;
  edicao: number;
  capacidade: number | null;
  prazo_inscricao: string | null;
  link_grupo_whatsapp: string | null;
  kg_arrecadados: number | null;
  status: string;
  data_cerimonia: string | null;
  hora_cerimonia: string | null;
};

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** '18:00' -> '18h'; '18:30' -> '18h30' */
export function formatarHora(h: string | null | undefined): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(h ?? '');
  if (!m) return '';
  return `${parseInt(m[1], 10)}h${m[2] === '00' ? '' : m[2]}`;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Partes da data da cerimônia para a folhinha do calendário: { dia: '16', mes: 'dez', semana: 'qua' }. */
export function partesCerimonia(e: Pick<Escola, 'data_cerimonia'>): { dia: string; mes: string; semana: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.data_cerimonia ?? '');
  if (!m) return null;
  const d = new Date(`${e.data_cerimonia}T12:00:00Z`).getUTCDay();
  return { dia: m[3], mes: MESES[parseInt(m[2], 10) - 1], semana: DIAS[d].slice(0, 3) };
}

/** Data da cerimônia por extenso curto: 'terça, 08/12 às 18h'. Vazio se não houver data. */
export function formatarCerimonia(e: Pick<Escola, 'data_cerimonia' | 'hora_cerimonia'>, comAno = false): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.data_cerimonia ?? '');
  if (!m) return '';
  const dia = DIAS[new Date(`${e.data_cerimonia}T12:00:00Z`).getUTCDay()];
  const hora = formatarHora(e.hora_cerimonia);
  return `${dia}, ${m[3]}/${m[2]}${comAno ? `/${m[1]}` : ''}${hora ? ` às ${hora}` : ''}`;
}

export type Aluno = {
  id: number;
  escola_id: number;
  nome: string;
  turma: string | null;
  inscrito_em: string | null;
  codigo: string | null;
  qtd_acompanhantes: number;
  qtd_extras: number;
  extra_autorizado_por: string | null;
  telefone: string | null;
  endereco: string | null;
  data_nascimento: string | null;
  qtd_espera: number;
  espera_desde: string | null;
  observacoes: string | null;
  incluido_manualmente: number;
};

export type Acompanhante = {
  id: number;
  aluno_id: number;
  ordem: number;
  nome: string;
  endereco: string;
  data_nascimento: string;
  telefone: string;
  situacao: 'confirmado' | 'espera';
};

/** Acompanhantes que todo formando pode levar. */
export const VAGAS_POR_ALUNO = 3;
/** Máximo de vagas extras que uma família pode pedir pelo formulário. */
export const MAX_EXTRAS_PEDIDO = 7;

/**
 * Vagas sobrando na escola (SQL, um parâmetro: escola_id). Quem ainda não se
 * inscreveu conta como se fosse usar as 3 vagas; quem se inscreveu com menos
 * libera a diferença; extras concedidos consomem do saldo.
 */
export const SQL_SALDO = `(SELECT COALESCE(SUM(3 - qtd_acompanhantes - qtd_extras), 0)
  FROM alunos WHERE escola_id = ? AND inscrito_em IS NOT NULL)`;

/**
 * Vagas sobrando que um pedido NOVO pode pegar (SQL, um parâmetro: escola_id):
 * o saldo menos o que a fila de espera já está aguardando, para ninguém passar
 * na frente de quem pediu antes.
 */
export const SQL_SALDO_LIVRE = `(SELECT COALESCE(SUM(3 - qtd_acompanhantes - qtd_extras - qtd_espera), 0)
  FROM alunos WHERE escola_id = ? AND inscrito_em IS NOT NULL)`;

export async function acompanhantesDoAluno(db: D1Database, alunoId: number): Promise<Acompanhante[]> {
  const r = await db
    .prepare('SELECT * FROM acompanhantes WHERE aluno_id = ? ORDER BY ordem')
    .bind(alunoId)
    .all<Acompanhante>();
  return r.results;
}

/** Valida uma data de nascimento no formato do <input type=date> (AAAA-MM-DD). */
export function nascimentoValido(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const d = new Date(`${iso}T12:00:00Z`);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return false;
  const ano = parseInt(m[1], 10);
  return ano >= 1900 && iso <= new Date().toISOString().slice(0, 10);
}

/** Aceita telefone brasileiro com DDD (10 ou 11 dígitos); devolve só os dígitos. */
export function limparTelefone(t: string): string | null {
  let d = t.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
}

/** 11987654321 -> (11) 98765-4321 */
export function formatarTelefone(t: string | null | undefined): string {
  if (!t) return '';
  const d = t.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

export type Kpis = {
  total_lista: number;
  inscritos: number;
  ingressos: number;
  saldo: number;
  espera: number;
  familias_espera: number;
};

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/ /g, '-')
    .slice(0, 40);
}

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function gerarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let s = '';
  for (const b of bytes) s += ALFABETO_CODIGO[b % ALFABETO_CODIGO.length];
  return s;
}

export async function kpisEscola(db: D1Database, escolaId: number): Promise<Kpis> {
  const r = await db.prepare(
    `SELECT
       COUNT(*) AS total_lista,
       COALESCE(SUM(CASE WHEN inscrito_em IS NOT NULL THEN 1 ELSE 0 END), 0) AS inscritos,
       COALESCE(SUM(CASE WHEN inscrito_em IS NOT NULL THEN 1 + qtd_acompanhantes + qtd_extras ELSE 0 END), 0) AS ingressos,
       COALESCE(SUM(CASE WHEN inscrito_em IS NOT NULL THEN 3 - qtd_acompanhantes - qtd_extras ELSE 0 END), 0) AS saldo,
       COALESCE(SUM(CASE WHEN inscrito_em IS NOT NULL THEN qtd_espera ELSE 0 END), 0) AS espera,
       COALESCE(SUM(CASE WHEN inscrito_em IS NOT NULL AND qtd_espera > 0 THEN 1 ELSE 0 END), 0) AS familias_espera
     FROM alunos WHERE escola_id = ?`
  ).bind(escolaId).first<Kpis>();
  return r ?? { total_lista: 0, inscritos: 0, ingressos: 0, saldo: 0, espera: 0, familias_espera: 0 };
}

export async function registrarAuditoria(
  db: D1Database,
  dados: { usuario_id?: number | null; acao: string; aluno_id?: number | null; escola_id?: number | null; detalhe?: string | null }
): Promise<void> {
  await db.prepare(
    'INSERT INTO auditoria (usuario_id, acao, aluno_id, escola_id, detalhe) VALUES (?, ?, ?, ?, ?)'
  ).bind(dados.usuario_id ?? null, dados.acao, dados.aluno_id ?? null, dados.escola_id ?? null, dados.detalhe ?? null).run();
}

export async function lerConfig(db: D1Database, chave: string): Promise<string> {
  const r = await db.prepare('SELECT valor FROM config WHERE chave = ?').bind(chave).first<{ valor: string }>();
  return r?.valor ?? '';
}

export async function gravarConfig(db: D1Database, chave: string, valor: string): Promise<void> {
  await db.prepare(
    'INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor'
  ).bind(chave, valor).run();
}

/** 2026-12-18 -> 18/12/2026 (deixa passar qualquer outro formato). */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** '2026-08-30 04:36:27' (UTC, como o SQLite grava) -> '30/08/2026 01:36' no horário de Brasília. */
export function dataHoraBrasilia(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return iso;
  const b = new Date(d.getTime() - 3 * 60 * 60 * 1000); // UTC-3, sem horário de verão
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(b.getUTCDate())}/${p(b.getUTCMonth() + 1)}/${b.getUTCFullYear()} ${p(b.getUTCHours())}:${p(b.getUTCMinutes())}`;
}

export function prazoEncerrado(escola: Escola): boolean {
  if (!escola.prazo_inscricao) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return hoje > escola.prazo_inscricao;
}
