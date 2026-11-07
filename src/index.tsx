import { Hono } from 'hono';
import type { Env, SessUser } from './auth';
import { criarSessao, encerrarSessao, usuarioDaSessao, verificarSenha } from './auth';
import { Layout, Msg } from './ui';
import { registrarAuditoria } from './db';
import { publicRoutes } from './routes/public';
import { painelRoutes } from './routes/painel';
import { adminRoutes } from './routes/admin';

type Ctx = { Bindings: Env; Variables: { usuario: SessUser | null } };

const app = new Hono<Ctx>();

// ---------- Vídeos com suporte a Range ----------
// O Safari do iPhone só toca <video> se o servidor responder pedidos de pedaços
// do arquivo (206 Partial Content). Os arquivos são pequenos (~2 MB), então dá
// para ler inteiro e devolver só o trecho pedido.
app.get('/video/*', async (c) => {
  const res = await c.env.ASSETS.fetch(new Request(new URL(c.req.path, c.req.url)));
  if (!res.ok) return res;
  const corpo = new Uint8Array(await res.arrayBuffer());
  const total = corpo.length;
  const cabecalhos: Record<string, string> = {
    'Accept-Ranges': 'bytes',
    'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=86400',
  };
  const etag = res.headers.get('etag');
  if (etag) cabecalhos['ETag'] = etag;

  const m = /^bytes=(\d*)-(\d*)$/.exec((c.req.header('range') ?? '').trim());
  if (!m || (m[1] === '' && m[2] === '')) {
    return new Response(corpo, { headers: { ...cabecalhos, 'Content-Length': String(total) } });
  }
  let inicio: number;
  let fim: number;
  if (m[1] === '') {
    inicio = Math.max(0, total - parseInt(m[2], 10)); // "bytes=-500": os últimos 500
    fim = total - 1;
  } else {
    inicio = parseInt(m[1], 10);
    fim = m[2] === '' ? total - 1 : Math.min(parseInt(m[2], 10), total - 1);
  }
  if (inicio > fim || inicio >= total) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
  }
  return new Response(corpo.slice(inicio, fim + 1), {
    status: 206,
    headers: {
      ...cabecalhos,
      'Content-Range': `bytes ${inicio}-${fim}/${total}`,
      'Content-Length': String(fim - inicio + 1),
    },
  });
});

app.use('*', async (c, next) => {
  c.set('usuario', await usuarioDaSessao(c));
  await next();
});

// ---------- Login ----------
const PaginaEntrar = (p: { erro?: string; usuario: SessUser | null }) => (
  <Layout titulo="Entrar" usuario={p.usuario}>
    <main class="wrap wrap-estreito">
      <div class="cartao cartao-azul">
        <h1>Entrar</h1>
        <p class="ajuda">
          Acesso para a comissão de formatura, direção da escola e administração do projeto. Aluno não
          precisa de senha — a inscrição é pelo link da escola.
        </p>
        {p.erro && <Msg tipo="erro">{p.erro}</Msg>}
        <form method="post" action="/entrar">
          <label for="l-email">E-mail</label>
          <input id="l-email" type="email" name="email" required autocomplete="username" />
          <label for="l-senha">Senha</label>
          <input id="l-senha" type="password" name="senha" required autocomplete="current-password" />
          <div class="linha-acoes">
            <button class="botao botao-largo" type="submit">Entrar</button>
          </div>
        </form>
      </div>
    </main>
  </Layout>
);

app.get('/entrar', (c) => {
  const u = c.get('usuario');
  if (u) return c.redirect(u.papel === 'admin' ? '/admin' : '/painel');
  return c.html(<PaginaEntrar usuario={null} />);
});

app.post('/entrar', async (c) => {
  const corpo = await c.req.parseBody();
  const email = String(corpo['email'] ?? '').trim().toLowerCase();
  const senha = String(corpo['senha'] ?? '');
  const usuario = await c.env.DB.prepare('SELECT * FROM usuarios WHERE email = ?')
    .bind(email)
    .first<SessUser & { senha_hash: string }>();
  if (!usuario || !(await verificarSenha(senha, usuario.senha_hash))) {
    await registrarAuditoria(c.env.DB, { acao: 'login_falhou', detalhe: email });
    return c.html(<PaginaEntrar usuario={null} erro="E-mail ou senha incorretos." />, 401);
  }
  await criarSessao(c, usuario.id);
  await registrarAuditoria(c.env.DB, { usuario_id: usuario.id, acao: 'login' });
  return c.redirect(usuario.papel === 'admin' ? '/admin' : '/painel');
});

app.post('/sair', (c) => {
  encerrarSessao(c);
  return c.redirect('/');
});

// ---------- Rotas ----------
app.route('/', painelRoutes);
app.route('/', adminRoutes);
app.route('/', publicRoutes);

app.notFound((c) =>
  c.html(
    <Layout titulo="Página não encontrada" usuario={c.get('usuario')}>
      <main class="wrap wrap-estreito">
        <div class="cartao">
          <h1>Página não encontrada</h1>
          <p>
            O endereço pode estar errado ou a página não existe mais. <a href="/">Ir para o início</a>.
          </p>
        </div>
      </main>
    </Layout>,
    404
  )
);

export default app;
