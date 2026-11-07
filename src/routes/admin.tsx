import { Hono } from 'hono';
import type { Env, SessUser } from '../auth';
import { hashSenha } from '../auth';
import { FaixaPagina, Layout, Kpi, Msg } from '../ui';
import {
  type Escola,
  dataHoraBrasilia,
  gravarConfig,
  kpisEscola,
  lerConfig,
  normalizar,
  registrarAuditoria,
  slugify,
} from '../db';

type Ctx = { Bindings: Env; Variables: { usuario: SessUser | null } };

export const adminRoutes = new Hono<Ctx>();

adminRoutes.use('/admin/*', async (c, next) => {
  const u = c.get('usuario');
  if (!u) return c.redirect('/entrar');
  if (u.papel !== 'admin') return c.redirect('/painel');
  await next();
});
adminRoutes.use('/admin', async (c, next) => {
  const u = c.get('usuario');
  if (!u) return c.redirect('/entrar');
  if (u.papel !== 'admin') return c.redirect('/painel');
  await next();
});

// ---------- Consolidado ----------
adminRoutes.get('/admin', async (c) => {
  const u = c.get('usuario')!;
  const escolas = (await c.env.DB.prepare('SELECT * FROM escolas ORDER BY nome').all<Escola>()).results;
  const linhas: { e: Escola; k: Awaited<ReturnType<typeof kpisEscola>> }[] = [];
  for (const e of escolas) linhas.push({ e, k: await kpisEscola(c.env.DB, e.id) });
  const tot = linhas.reduce(
    (acc, l) => ({
      lista: acc.lista + l.k.total_lista,
      inscritos: acc.inscritos + l.k.inscritos,
      ingressos: acc.ingressos + l.k.ingressos,
      kg: acc.kg + (l.e.kg_arrecadados ?? 0),
    }),
    { lista: 0, inscritos: 0, ingressos: 0, kg: 0 }
  );
  const whatsappOficial = await lerConfig(c.env.DB, 'whatsapp_oficial');
  const localEvento = await lerConfig(c.env.DB, 'local_evento');
  const dataEvento = await lerConfig(c.env.DB, 'data_evento');

  return c.html(
    <Layout titulo="Administração" usuario={u}>
      <FaixaPagina
        kicker="Administração do projeto"
        titulo="Visão geral"
        lead={`${escolas.length} escola${escolas.length === 1 ? '' : 's'} cadastrada${escolas.length === 1 ? '' : 's'} · números somados de todas as escolas`}
      />
      <main class="wrap">
        <div class="kpis">
          <Kpi valor={escolas.length} rotulo="escolas na edição" />
          <Kpi valor={`${tot.inscritos} / ${tot.lista}`} rotulo="inscritos no total" />
          <Kpi valor={tot.ingressos} rotulo="ingressos usados" />
          <Kpi valor={`${tot.ingressos} kg`} rotulo="esperados no dia" verde />
          {tot.kg > 0 && <Kpi valor={`${tot.kg} kg`} rotulo="arrecadados (lançados)" verde />}
        </div>

        <div class="linha-acoes">
          <a class="botao" href="/admin/escolas/nova">+ Nova escola</a>
          <a class="botao botao-borda" href="/admin/auditoria">Auditoria</a>
        </div>

        <div class="tabela-scroll">
          <table>
            <tr>
              <th>Escola</th>
              <th class="num">Inscritos</th>
              <th class="num">Ingressos</th>
              <th class="num">Saldo</th>
              <th class="num">Kg esper.</th>
              <th class="num">Kg arrec.</th>
              <th>Status</th>
              <th></th>
            </tr>
            {linhas.map(({ e, k }) => (
              <tr>
                <td class="quebra">{e.nome}</td>
                <td class="num">
                  {k.inscritos} / {k.total_lista}
                </td>
                <td class="num">{k.ingressos}</td>
                <td class="num">{k.saldo}</td>
                <td class="num">{k.ingressos}</td>
                <td class="num">{e.kg_arrecadados ?? '—'}</td>
                <td>
                  <span class={e.status === 'ativa' ? 'etiqueta etiqueta-verde' : 'etiqueta etiqueta-cinza'}>
                    {e.status}
                  </span>
                </td>
                <td>
                  <a href={`/admin/escolas/${e.id}`}>configurar</a> ·{' '}
                  <a href={`/painel/escola/${e.id}`}>painel</a>
                </td>
              </tr>
            ))}
          </table>
        </div>
        <p class="ajuda so-mobile">Arraste a tabela para o lado para ver todas as colunas.</p>

        <hr class="separador" />
        <div class="cartao">
          <h2>Configurações do projeto</h2>
          <form method="post" action="/admin/config">
            <label for="cfg-wa">Link do WhatsApp oficial do projeto</label>
            <input id="cfg-wa" type="url" name="whatsapp_oficial" value={whatsappOficial} placeholder="https://wa.me/5511..." />
            <label for="cfg-local">Local do evento (aparece na confirmação)</label>
            <input id="cfg-local" type="text" name="local_evento" value={localEvento} />
            <label for="cfg-data">Data do evento (texto livre)</label>
            <input id="cfg-data" type="text" name="data_evento" value={dataEvento} />
            <div class="linha-acoes">
              <button class="botao" type="submit">Salvar configurações</button>
            </div>
          </form>
        </div>
      </main>
    </Layout>
  );
});

adminRoutes.post('/admin/config', async (c) => {
  const corpo = await c.req.parseBody();
  await gravarConfig(c.env.DB, 'whatsapp_oficial', String(corpo['whatsapp_oficial'] ?? '').trim());
  await gravarConfig(c.env.DB, 'local_evento', String(corpo['local_evento'] ?? '').trim());
  await gravarConfig(c.env.DB, 'data_evento', String(corpo['data_evento'] ?? '').trim());
  await registrarAuditoria(c.env.DB, { usuario_id: c.get('usuario')!.id, acao: 'salvou_config' });
  return c.redirect('/admin');
});

// ---------- Nova escola ----------
adminRoutes.get('/admin/escolas/nova', (c) => {
  const u = c.get('usuario')!;
  return c.html(
    <Layout titulo="Nova escola" usuario={u}>
      <FaixaPagina
        estreito
        voltar={{ href: '/admin', texto: 'Voltar' }}
        kicker="Administração"
        titulo="Nova escola"
        lead="O link público de inscrição é gerado automaticamente a partir do nome."
      />
      <main class="wrap wrap-estreito">
        <div class="cartao cartao-destaque puxa-cima">
          <form method="post" action="/admin/escolas/nova">
            <label for="ne-nome">Nome da escola</label>
            <input id="ne-nome" type="text" name="nome" required minlength={3} placeholder="E.E. Professora..." />
            <label for="ne-cap">Capacidade da cerimônia <span class="opcional">(lugares no CEMI, opcional)</span></label>
            <input id="ne-cap" type="number" name="capacidade" min="1" />
            <label for="ne-prazo">Prazo de inscrição <span class="opcional">(opcional)</span></label>
            <input id="ne-prazo" type="date" name="prazo_inscricao" />
            <label for="ne-grupo">Link do grupo de WhatsApp da formatura <span class="opcional">(opcional)</span></label>
            <input id="ne-grupo" type="url" name="link_grupo_whatsapp" placeholder="https://chat.whatsapp.com/..." />
            <div class="linha-acoes">
              <button class="botao" type="submit">Criar escola</button>
            </div>
          </form>
        </div>
      </main>
    </Layout>
  );
});

adminRoutes.post('/admin/escolas/nova', async (c) => {
  const corpo = await c.req.parseBody();
  const nome = String(corpo['nome'] ?? '').trim().slice(0, 120);
  if (nome.length < 3) return c.redirect('/admin/escolas/nova');
  let slug = slugify(nome) || 'escola';
  const existe = await c.env.DB.prepare('SELECT 1 FROM escolas WHERE slug = ?').bind(slug).first();
  if (existe) slug = `${slug}-${Math.floor(Math.random() * 900 + 100)}`;
  const capacidade = parseInt(String(corpo['capacidade'] ?? ''), 10);
  const prazo = String(corpo['prazo_inscricao'] ?? '').trim() || null;
  const grupo = String(corpo['link_grupo_whatsapp'] ?? '').trim() || null;
  const r = await c.env.DB.prepare(
    'INSERT INTO escolas (nome, slug, capacidade, prazo_inscricao, link_grupo_whatsapp) VALUES (?, ?, ?, ?, ?)'
  ).bind(nome, slug, isNaN(capacidade) ? null : capacidade, prazo, grupo).run();
  await registrarAuditoria(c.env.DB, {
    usuario_id: c.get('usuario')!.id,
    acao: 'criou_escola',
    escola_id: r.meta.last_row_id as number,
    detalhe: nome,
  });
  return c.redirect(`/admin/escolas/${r.meta.last_row_id}`);
});

// ---------- Configurar escola ----------
type UsuarioLinha = { id: number; nome: string; email: string; papel: string };

async function paginaEscola(c: any, escolaId: number, aviso?: { ok?: string; erro?: string }) {
  const u = c.get('usuario') as SessUser;
  const escola = await c.env.DB.prepare('SELECT * FROM escolas WHERE id = ?').bind(escolaId).first<Escola>();
  if (!escola) return c.notFound();
  const usuarios = (
    await c.env.DB.prepare("SELECT id, nome, email, papel FROM usuarios WHERE escola_id = ? ORDER BY papel, nome")
      .bind(escola.id)
      .all<UsuarioLinha>()
  ).results;
  const totalAlunos = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM alunos WHERE escola_id = ?')
    .bind(escola.id)
    .first<{ n: number }>();
  const urlBase = new URL(c.req.url);

  return c.html(
    <Layout titulo={escola.nome} usuario={u}>
      <FaixaPagina
        estreito
        voltar={{ href: '/admin', texto: 'Voltar' }}
        kicker="Configurar escola"
        titulo={escola.nome}
        lead={`${totalAlunos?.n ?? 0} alunos na lista`}
      >
        <p class="lead">
          Link público: <a href={`/e/${escola.slug}`}>{urlBase.origin}/e/{escola.slug}</a>
          <br />
          <a href={`/painel/escola/${escola.id}`}>Abrir o painel desta escola →</a>
        </p>
      </FaixaPagina>
      <main class="wrap wrap-estreito">
        <div class="cartao cartao-destaque puxa-cima">
          {aviso?.ok && <Msg tipo="ok">{aviso.ok}</Msg>}
          {aviso?.erro && <Msg tipo="erro">{aviso.erro}</Msg>}
          <form method="post" action={`/admin/escolas/${escola.id}`}>
            <label for="ee-nome">Nome</label>
            <input id="ee-nome" type="text" name="nome" value={escola.nome} required minlength={3} />
            <label for="ee-cap">Capacidade</label>
            <input id="ee-cap" type="number" name="capacidade" min="1" value={escola.capacidade ?? ''} />
            <label for="ee-prazo">Prazo de inscrição</label>
            <input id="ee-prazo" type="date" name="prazo_inscricao" value={escola.prazo_inscricao ?? ''} />
            <label for="ee-grupo">Link do grupo de WhatsApp</label>
            <input id="ee-grupo" type="url" name="link_grupo_whatsapp" value={escola.link_grupo_whatsapp ?? ''} />
            <label for="ee-status">Status</label>
            <select id="ee-status" name="status">
              <option value="ativa" selected={escola.status === 'ativa'}>ativa</option>
              <option value="encerrada" selected={escola.status === 'encerrada'}>encerrada</option>
            </select>
            <div class="linha-acoes">
              <button class="botao" type="submit">Salvar</button>
            </div>
          </form>
        </div>

        <div class="cartao">
          <h2>Importar lista de formandos</h2>
          <p class="ajuda">
            Cole a lista da secretaria: um aluno por linha, no formato <b>Nome;Turma</b> (ou separado
            por vírgula/tabulação). A primeira linha pode ser cabeçalho. Nomes que já existem na
            lista são ignorados.
          </p>
          <form method="post" action={`/admin/escolas/${escola.id}/importar`}>
            <label for="imp-texto">Lista</label>
            <textarea
              id="imp-texto"
              name="texto"
              rows={8}
              required
              placeholder={'Maria da Silva;3º A\nJoão Souza;3º B\n...'}
            ></textarea>
            <div class="linha-acoes">
              <button class="botao" type="submit" name="acao" value="preview">Conferir antes de importar</button>
            </div>
          </form>
        </div>

        <div class="cartao">
          <h2>Acessos desta escola</h2>
          {usuarios.length > 0 && (
            <div class="tabela-scroll" style="margin-bottom:14px;">
              <table>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Papel</th>
                </tr>
                {usuarios.map((x) => (
                  <tr>
                    <td>{x.nome}</td>
                    <td>{x.email}</td>
                    <td>
                      <span class={x.papel === 'comissao' ? 'etiqueta etiqueta-azul' : 'etiqueta etiqueta-cinza'}>
                        {x.papel === 'comissao' ? 'comissão' : 'direção'}
                      </span>
                    </td>
                  </tr>
                ))}
              </table>
            </div>
          )}
          <h3>Criar acesso</h3>
          <form method="post" action={`/admin/escolas/${escola.id}/usuarios`}>
            <label for="us-nome">Nome</label>
            <input id="us-nome" type="text" name="nome" required minlength={3} />
            <label for="us-email">E-mail (será o login)</label>
            <input id="us-email" type="email" name="email" required />
            <label for="us-papel">Papel</label>
            <select id="us-papel" name="papel" required>
              <option value="comissao">Comissão (edita a escola)</option>
              <option value="direcao">Direção (só relatório)</option>
            </select>
            <label for="us-senha">Senha inicial (mínimo 8 caracteres)</label>
            <input id="us-senha" type="text" name="senha" required minlength={8} />
            <p class="ajuda">Passe a senha para a pessoa e peça para trocar no primeiro acesso (menu "Senha").</p>
            <div class="linha-acoes">
              <button class="botao" type="submit">Criar acesso</button>
            </div>
          </form>
        </div>
      </main>
    </Layout>
  );
}

adminRoutes.get('/admin/escolas/:id', (c) => paginaEscola(c, parseInt(c.req.param('id'), 10)));

adminRoutes.post('/admin/escolas/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const corpo = await c.req.parseBody();
  const nome = String(corpo['nome'] ?? '').trim().slice(0, 120);
  if (nome.length < 3) return paginaEscola(c, id, { erro: 'Nome muito curto.' });
  const capacidade = parseInt(String(corpo['capacidade'] ?? ''), 10);
  const prazo = String(corpo['prazo_inscricao'] ?? '').trim() || null;
  const grupo = String(corpo['link_grupo_whatsapp'] ?? '').trim() || null;
  const status = String(corpo['status'] ?? 'ativa') === 'encerrada' ? 'encerrada' : 'ativa';
  await c.env.DB.prepare(
    'UPDATE escolas SET nome = ?, capacidade = ?, prazo_inscricao = ?, link_grupo_whatsapp = ?, status = ? WHERE id = ?'
  ).bind(nome, isNaN(capacidade) ? null : capacidade, prazo, grupo, status, id).run();
  await registrarAuditoria(c.env.DB, { usuario_id: c.get('usuario')!.id, acao: 'editou_escola', escola_id: id });
  return paginaEscola(c, id, { ok: 'Escola atualizada.' });
});

// ---------- Importação ----------
function parsearLista(texto: string): { nome: string; turma: string | null }[] {
  const linhas = texto.split(/\r?\n/);
  const itens: { nome: string; turma: string | null }[] = [];
  for (const linha of linhas) {
    const limpa = linha.trim();
    if (!limpa) continue;
    let partes: string[];
    if (limpa.includes(';')) partes = limpa.split(';');
    else if (limpa.includes('\t')) partes = limpa.split('\t');
    else if (limpa.includes(',')) partes = limpa.split(',');
    else partes = [limpa];
    const nome = (partes[0] ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const turma = (partes[1] ?? '').trim().slice(0, 30) || null;
    if (nome.length < 5) continue;
    if (normalizar(nome) === 'nome') continue; // cabeçalho
    itens.push({ nome, turma });
  }
  return itens;
}

adminRoutes.post('/admin/escolas/:id/importar', async (c) => {
  const u = c.get('usuario')!;
  const id = parseInt(c.req.param('id'), 10);
  const escola = await c.env.DB.prepare('SELECT * FROM escolas WHERE id = ?').bind(id).first<Escola>();
  if (!escola) return c.notFound();
  const corpo = await c.req.parseBody();
  const texto = String(corpo['texto'] ?? '');
  const acao = String(corpo['acao'] ?? 'preview');
  const itens = parsearLista(texto);
  if (itens.length === 0) return paginaEscola(c, id, { erro: 'Nenhum nome válido encontrado na lista.' });

  const existentes = new Set(
    (
      await c.env.DB.prepare('SELECT nome_busca FROM alunos WHERE escola_id = ?').bind(id).all<{ nome_busca: string }>()
    ).results.map((r) => r.nome_busca)
  );
  const vistos = new Set<string>();
  const novos: typeof itens = [];
  let duplicados = 0;
  for (const item of itens) {
    const chave = normalizar(item.nome);
    if (existentes.has(chave) || vistos.has(chave)) {
      duplicados++;
      continue;
    }
    vistos.add(chave);
    novos.push(item);
  }

  if (acao === 'confirmar') {
    const stmt = c.env.DB.prepare(
      'INSERT INTO alunos (escola_id, nome, nome_busca, turma) VALUES (?, ?, ?, ?)'
    );
    const lote = novos.map((item) => stmt.bind(id, item.nome, normalizar(item.nome), item.turma));
    for (let i = 0; i < lote.length; i += 50) {
      await c.env.DB.batch(lote.slice(i, i + 50));
    }
    await registrarAuditoria(c.env.DB, {
      usuario_id: u.id,
      acao: 'importou_lista',
      escola_id: id,
      detalhe: `${novos.length} novos, ${duplicados} ignorados`,
    });
    return paginaEscola(c, id, { ok: `Importação concluída: ${novos.length} alunos adicionados, ${duplicados} ignorados (já existiam).` });
  }

  // preview
  return c.html(
    <Layout titulo="Conferir importação" usuario={u}>
      <FaixaPagina
        estreito
        voltar={{ href: `/admin/escolas/${id}`, texto: 'Voltar' }}
        kicker={escola.nome}
        titulo="Conferir importação"
        lead={`${novos.length} alunos novos serão adicionados · ${duplicados} ignorados (repetidos ou já na lista)`}
      />
      <main class="wrap wrap-estreito">
        <div class="cartao cartao-destaque puxa-cima">
          <div class="tabela-scroll" style="max-height:340px;overflow-y:auto;">
            <table>
              <tr>
                <th>Nome</th>
                <th>Turma</th>
              </tr>
              {novos.slice(0, 200).map((n) => (
                <tr>
                  <td class="quebra">{n.nome}</td>
                  <td>{n.turma ?? '—'}</td>
                </tr>
              ))}
            </table>
          </div>
          {novos.length > 200 && <p class="ajuda">Mostrando 200 de {novos.length}.</p>}
          <form method="post" action={`/admin/escolas/${id}/importar`}>
            <input type="hidden" name="acao" value="confirmar" />
            <textarea name="texto" style="display:none;">{texto}</textarea>
            <div class="linha-acoes">
              <button class="botao botao-verde" type="submit">Confirmar importação</button>
              <a class="botao botao-borda" href={`/admin/escolas/${id}`}>Cancelar</a>
            </div>
          </form>
        </div>
      </main>
    </Layout>
  );
});

// ---------- Usuários ----------
adminRoutes.post('/admin/escolas/:id/usuarios', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const corpo = await c.req.parseBody();
  const nome = String(corpo['nome'] ?? '').trim().slice(0, 80);
  const email = String(corpo['email'] ?? '').trim().toLowerCase().slice(0, 120);
  const papel = String(corpo['papel'] ?? '') === 'direcao' ? 'direcao' : 'comissao';
  const senha = String(corpo['senha'] ?? '');
  if (nome.length < 3 || !email.includes('@') || senha.length < 8) {
    return paginaEscola(c, id, { erro: 'Confira nome, e-mail e senha (mínimo 8 caracteres).' });
  }
  const jaExiste = await c.env.DB.prepare('SELECT 1 FROM usuarios WHERE email = ?').bind(email).first();
  if (jaExiste) return paginaEscola(c, id, { erro: `Já existe um acesso com o e-mail ${email}.` });
  await c.env.DB.prepare(
    'INSERT INTO usuarios (nome, email, senha_hash, papel, escola_id) VALUES (?, ?, ?, ?, ?)'
  ).bind(nome, email, await hashSenha(senha), papel, id).run();
  await registrarAuditoria(c.env.DB, {
    usuario_id: c.get('usuario')!.id,
    acao: 'criou_usuario',
    escola_id: id,
    detalhe: `${email} (${papel})`,
  });
  return paginaEscola(c, id, { ok: `Acesso criado para ${email}.` });
});

// ---------- Auditoria ----------
type LinhaAuditoria = {
  id: number;
  acao: string;
  detalhe: string | null;
  data: string;
  usuario: string | null;
  aluno: string | null;
  escola: string | null;
};

adminRoutes.get('/admin/auditoria', async (c) => {
  const u = c.get('usuario')!;
  const linhas = (
    await c.env.DB.prepare(
      `SELECT a.id, a.acao, a.detalhe, a.data,
              u.nome AS usuario, al.nome AS aluno, e.nome AS escola
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       LEFT JOIN alunos al ON al.id = a.aluno_id
       LEFT JOIN escolas e ON e.id = a.escola_id
       ORDER BY a.id DESC LIMIT 200`
    ).all<LinhaAuditoria>()
  ).results;
  return c.html(
    <Layout titulo="Auditoria" usuario={u}>
      <FaixaPagina
        voltar={{ href: '/admin', texto: 'Voltar' }}
        kicker="Administração"
        titulo="Auditoria"
        lead="Últimos 200 registros, no horário de Brasília."
      />
      <main class="wrap">
        <div class="tabela-scroll">
          <table>
            <tr>
              <th>Quando</th>
              <th>Quem</th>
              <th>Ação</th>
              <th>Aluno</th>
              <th>Escola</th>
              <th>Detalhe</th>
            </tr>
            {linhas.map((l) => (
              <tr>
                <td>{dataHoraBrasilia(l.data)}</td>
                <td>{l.usuario ?? 'público'}</td>
                <td>{l.acao}</td>
                <td class="quebra">{l.aluno ?? '—'}</td>
                <td class="quebra">{l.escola ?? '—'}</td>
                <td class="quebra">{l.detalhe ?? '—'}</td>
              </tr>
            ))}
          </table>
        </div>
      </main>
    </Layout>
  );
});
