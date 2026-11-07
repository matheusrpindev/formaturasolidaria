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
