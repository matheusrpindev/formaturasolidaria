import { Hono } from 'hono';
import type { Env, SessUser } from '../auth';
import { hashSenha, verificarSenha } from '../auth';
import { FaixaPagina, IconeBusca, Layout, Kpi, Msg } from '../ui';
import {
  type Aluno,
  type Escola,
  dataHoraBrasilia,
  gerarCodigo,
  kpisEscola,
  normalizar,
  registrarAuditoria,
} from '../db';

type Ctx = { Bindings: Env; Variables: { usuario: SessUser | null } };

export const painelRoutes = new Hono<Ctx>();

function exigirLogin(c: any): SessUser | Response {
  const u = c.get('usuario') as SessUser | null;
  if (!u) return c.redirect('/entrar');
  return u;
}

// ---------- Dashboard da escola (comissão edita, direção só lê) ----------
async function renderDashboard(c: any, escolaId: number, somenteLeitura: boolean, avisos?: { ok?: string; erro?: string }) {
  const u = c.get('usuario') as SessUser;
  const escola = await c.env.DB.prepare('SELECT * FROM escolas WHERE id = ?').bind(escolaId).first<Escola>();
  if (!escola) return c.notFound();

  const kpis = await kpisEscola(c.env.DB, escola.id);
  const filtro = c.req.query('f') ?? 'todos';
  const q = (c.req.query('q') ?? '').trim();

  let sql = 'SELECT * FROM alunos WHERE escola_id = ?';
  const binds: unknown[] = [escola.id];
  if (filtro === 'inscritos') sql += ' AND inscrito_em IS NOT NULL';
  if (filtro === 'nao') sql += ' AND inscrito_em IS NULL';
  if (q) {
    sql += ' AND nome_busca LIKE ?';
    binds.push(`%${normalizar(q)}%`);
  }
  sql += ' ORDER BY nome LIMIT 500';
  const alunos = (await c.env.DB.prepare(sql).bind(...binds).all<Aluno>()).results;

  const linkFiltro = (f: string, rotulo: string) => (
    <a href={`?f=${f}${q ? `&q=${encodeURIComponent(q)}` : ''}`} class={filtro === f ? 'ativo' : ''}>
      {rotulo}
    </a>
  );

  const urlBase = new URL(c.req.url);
  const linkPublico = `${urlBase.origin}/e/${escola.slug}`;

  return c.html(
    <Layout titulo={escola.nome} usuario={u}>
      <FaixaPagina
        kicker={somenteLeitura ? 'Painel da direção · somente leitura' : 'Painel da comissão de formatura'}
        titulo={escola.nome}
        lead={`Edição ${escola.edicao}`}
        voltar={u.papel === 'admin' ? { href: '/admin', texto: 'Todas as escolas' } : undefined}
      >
        <p class="lead">
          Link de inscrição dos alunos: <a href={linkPublico}>{linkPublico}</a>
        </p>
      </FaixaPagina>
      <main class="wrap">
        {avisos?.ok && <Msg tipo="ok">{avisos.ok}</Msg>}
        {avisos?.erro && <Msg tipo="erro">{avisos.erro}</Msg>}

        <div class="kpis">
          <Kpi valor={`${kpis.inscritos} / ${kpis.total_lista}`} rotulo="inscritos sobre a lista de formandos" />
          <Kpi valor={kpis.ingressos} rotulo="ingressos usados (formandos + acompanhantes)" />
          <Kpi valor={kpis.saldo >= 0 ? `+${kpis.saldo}` : `${kpis.saldo}`} rotulo="saldo de convites para a direção realocar" />
          <Kpi valor={`${kpis.ingressos} kg`} rotulo="esperados no dia — 1 kg por pessoa" verde />
          {escola.capacidade != null && (
            <Kpi valor={`${kpis.ingressos} / ${escola.capacidade}`} rotulo="lugares usados sobre a capacidade" />
          )}
          {escola.kg_arrecadados != null && (
            <Kpi valor={`${escola.kg_arrecadados} kg`} rotulo="arrecadados no evento (lançado após a cerimônia)" verde />
          )}
        </div>

        <div class="barra-filtro">
          <div class="filtros">
            {linkFiltro('todos', `Todos (${kpis.total_lista})`)}
            {linkFiltro('inscritos', `Inscritos (${kpis.inscritos})`)}
            {linkFiltro('nao', `Não inscritos (${kpis.total_lista - kpis.inscritos})`)}
          </div>
          <form class="busca-form" method="get">
            <input type="hidden" name="f" value={filtro} />
            <div class="busca-caixa">
              <IconeBusca />
              <input type="text" name="q" value={q} placeholder="Buscar aluno pelo nome" />
            </div>
            <button class="botao botao-borda" type="submit">Buscar</button>
          </form>
        </div>

        <div class="tabela-scroll">
          <table>
            <tr>
              <th>Aluno</th>
              <th>Turma</th>
              <th class="num">Acomp.</th>
              <th class="num">Extras</th>
              <th class="num">Kg</th>
              <th>Situação</th>
              {!somenteLeitura && <th></th>}
            </tr>
            {alunos.map((a: Aluno) => (
              <tr>
                <td class="quebra">
                  {a.nome}
                  {a.incluido_manualmente ? <span class="etiqueta etiqueta-azul" style="margin-left:6px;">manual</span> : ''}
                </td>
                <td>{a.turma ?? '—'}</td>
                <td class="num">{a.inscrito_em ? a.qtd_acompanhantes : '—'}</td>
                <td class="num">{a.inscrito_em && a.qtd_extras > 0 ? a.qtd_extras : '—'}</td>
                <td class="num">{a.inscrito_em ? 1 + a.qtd_acompanhantes + a.qtd_extras : '—'}</td>
                <td>
                  {a.inscrito_em ? (
                    <span class="etiqueta etiqueta-verde">Inscrito</span>
                  ) : (
                    <span class="etiqueta etiqueta-cinza">Não inscrito</span>
                  )}
                </td>
                {!somenteLeitura && (
                  <td>
                    <a href={`/painel/aluno/${a.id}`}>editar</a>
                  </td>
                )}
              </tr>
            ))}
          </table>
        </div>
        <p class="ajuda so-mobile">Arraste a tabela para o lado para ver todas as colunas.</p>

        {!somenteLeitura && (
          <>
            <hr class="separador" />
            <div class="cartao">
              <h2>Incluir aluno fora da lista</h2>
              <p class="ajuda">
                Para formando que não veio na lista da secretaria (transferido, nome errado). A inclusão fica
                registrada no seu nome.
              </p>
              <form method="post" action="/painel/aluno-novo">
                <label for="novo-nome">Nome completo</label>
                <input id="novo-nome" type="text" name="nome" required minlength={5} />
                <label for="novo-turma">Turma</label>
                <input id="novo-turma" type="text" name="turma" placeholder="3º A, 9º B, EJA…" />
                <div class="linha-acoes">
                  <button class="botao" type="submit">Incluir na lista</button>
                </div>
              </form>
            </div>

            <div class="cartao">
              <h2>Fechamento do evento</h2>
              <p class="ajuda">
                Depois da cerimônia, lance aqui o total de alimentos que a escola arrecadou no dia.
              </p>
              <form method="post" action="/painel/kg">
                <label for="kg">Total arrecadado (kg)</label>
                <input
                  id="kg"
                  type="number"
                  name="kg"
                  min="0"
                  step="0.1"
                  value={escola.kg_arrecadados ?? ''}
                  required
                />
                <div class="linha-acoes">
                  <button class="botao botao-verde" type="submit">Lançar total</button>
                </div>
              </form>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}

painelRoutes.get('/painel', async (c) => {
  const u = exigirLogin(c);
  if (u instanceof Response) return u;
  if (u.papel === 'admin') return c.redirect('/admin');
  if (!u.escola_id) return c.text('Sua conta não está vinculada a uma escola. Fale com a administração.', 403);
  return renderDashboard(c, u.escola_id, u.papel === 'direcao');
});

painelRoutes.get('/painel/escola/:id', async (c) => {
  const u = exigirLogin(c);
  if (u instanceof Response) return u;
  if (u.papel !== 'admin') return c.redirect('/painel');
  return renderDashboard(c, parseInt(c.req.param('id'), 10), false);
});

// ---------- Ficha do aluno (comissão e admin) ----------
async function carregarAlunoPermitido(c: any): Promise<{ u: SessUser; aluno: Aluno; escola: Escola } | Response> {
  const u = exigirLogin(c);
  if (u instanceof Response) return u;
  if (u.papel === 'direcao') return c.redirect('/painel');
  const aluno = await c.env.DB.prepare('SELECT * FROM alunos WHERE id = ?')
    .bind(parseInt(c.req.param('id'), 10))
    .first<Aluno>();
  if (!aluno) return c.notFound();
  if (u.papel === 'comissao' && aluno.escola_id !== u.escola_id) return c.notFound();
  const escola = await c.env.DB.prepare('SELECT * FROM escolas WHERE id = ?').bind(aluno.escola_id).first<Escola>();
  if (!escola) return c.notFound();
  return { u, aluno, escola };
}

function paginaFicha(c: any, u: SessUser, aluno: Aluno, escola: Escola, aviso?: { ok?: string; erro?: string }) {
  const urlBase = new URL(c.req.url);
  const voltar = u.papel === 'admin' ? `/painel/escola/${escola.id}` : '/painel';
  return c.html(
    <Layout titulo={aluno.nome} usuario={u}>
      <FaixaPagina
        estreito
        voltar={{ href: voltar, texto: 'Voltar ao painel' }}
        kicker={escola.nome}
        titulo={aluno.nome}
        lead={`${aluno.turma ?? 'Turma não informada'}${aluno.incluido_manualmente ? ' · incluído manualmente' : ''}`}
      />
      <main class="wrap wrap-estreito">
        <div class="cartao cartao-destaque puxa-cima">
          {aviso?.ok && <Msg tipo="ok">{aviso.ok}</Msg>}
          {aviso?.erro && <Msg tipo="erro">{aviso.erro}</Msg>}

          {aluno.inscrito_em ? (
            <>
              <p>
                <span class="etiqueta etiqueta-verde">Inscrito</span>{' '}
                <span class="ajuda">em {dataHoraBrasilia(aluno.inscrito_em)}</span>
              </p>
              {aluno.codigo && (
                <p class="ajuda">
                  Comprovante do aluno:{' '}
                  <a href={`/c/${aluno.codigo}`}>
                    {urlBase.origin}/c/{aluno.codigo}
                  </a>
                </p>
              )}
              <form method="post" action={`/painel/aluno/${aluno.id}`}>
                <label for="f-acomp">Acompanhantes (direito de todo formando: até 3)</label>
                <select id="f-acomp" name="qtd_acompanhantes">
                  {[0, 1, 2, 3].map((n) => (
                    <option value={String(n)} selected={aluno.qtd_acompanhantes === n}>
                      {n}
                    </option>
                  ))}
                </select>

                <label for="f-extras">Convidados extras (aprovados pela direção)</label>
                <input
                  id="f-extras"
                  type="number"
                  name="qtd_extras"
                  min="0"
                  max="20"
                  value={String(aluno.qtd_extras)}
                />
                <label for="f-aut">Quem autorizou os extras</label>
                <input
                  id="f-aut"
                  type="text"
                  name="extra_autorizado_por"
                  value={aluno.extra_autorizado_por ?? ''}
                  placeholder="Nome de quem aprovou na direção"
                />

                <label for="f-tel">Telefone</label>
                <input id="f-tel" type="tel" name="telefone" value={aluno.telefone ?? ''} />

                <label for="f-obs">Observações</label>
                <textarea id="f-obs" name="observacoes" rows={2}>
                  {aluno.observacoes ?? ''}
                </textarea>

                <div class="linha-acoes">
                  <button class="botao" type="submit" name="acao" value="salvar">
                    Salvar alterações
                  </button>
                  <button
                    class="botao botao-perigo"
                    type="submit"
                    name="acao"
                    value="cancelar"
                    onclick="return confirm('Cancelar a inscrição deste aluno?')"
                  >
                    Cancelar inscrição
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p>
                <span class="etiqueta etiqueta-cinza">Não inscrito</span>
              </p>
              <form method="post" action={`/painel/aluno/${aluno.id}`}>
                <label for="m-acomp">Acompanhantes</label>
                <select id="m-acomp" name="qtd_acompanhantes">
                  {[0, 1, 2, 3].map((n) => (
                    <option value={String(n)}>{n}</option>
                  ))}
                </select>
                <label for="m-tel">Telefone</label>
                <input id="m-tel" type="tel" name="telefone" value={aluno.telefone ?? ''} />
                <div class="linha-acoes">
                  <button class="botao botao-verde" type="submit" name="acao" value="inscrever">
                    Inscrever manualmente
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}

painelRoutes.get('/painel/aluno/:id', async (c) => {
  const r = await carregarAlunoPermitido(c);
  if (r instanceof Response) return r;
  return paginaFicha(c, r.u, r.aluno, r.escola);
});

painelRoutes.post('/painel/aluno/:id', async (c) => {
  const r = await carregarAlunoPermitido(c);
  if (r instanceof Response) return r;
  const { u, escola } = r;
  let { aluno } = r;
  const corpo = await c.req.parseBody();
  const acao = String(corpo['acao'] ?? 'salvar');

  if (acao === 'cancelar') {
    await c.env.DB.prepare(
      `UPDATE alunos SET inscrito_em = NULL, codigo = NULL, qtd_acompanhantes = 0, qtd_extras = 0,
       extra_autorizado_por = NULL WHERE id = ?`
    ).bind(aluno.id).run();
    await registrarAuditoria(c.env.DB, {
      usuario_id: u.id,
      acao: 'cancelou_inscricao',
      aluno_id: aluno.id,
      escola_id: escola.id,
    });
    return c.redirect(u.papel === 'admin' ? `/painel/escola/${escola.id}` : '/painel');
  }

  const qtd = Math.min(3, Math.max(0, parseInt(String(corpo['qtd_acompanhantes'] ?? '0'), 10) || 0));
  const telefone = String(corpo['telefone'] ?? '').trim().slice(0, 30) || null;

  if (acao === 'inscrever') {
    if (!aluno.inscrito_em) {
      const codigo = gerarCodigo();
      await c.env.DB.prepare(
        `UPDATE alunos SET inscrito_em = datetime('now'), qtd_acompanhantes = ?, telefone = ?, codigo = ?
         WHERE id = ?`
      ).bind(qtd, telefone, codigo, aluno.id).run();
      await registrarAuditoria(c.env.DB, {
        usuario_id: u.id,
        acao: 'inscricao_manual',
        aluno_id: aluno.id,
        escola_id: escola.id,
        detalhe: `${qtd} acompanhante(s)`,
      });
    }
  } else {
    const extras = Math.min(20, Math.max(0, parseInt(String(corpo['qtd_extras'] ?? '0'), 10) || 0));
    const autorizadoPor = String(corpo['extra_autorizado_por'] ?? '').trim().slice(0, 80) || null;
    const obs = String(corpo['observacoes'] ?? '').trim().slice(0, 500) || null;
    if (extras > 0 && !autorizadoPor) {
      return paginaFicha(c, u, aluno, escola, { erro: 'Convidado extra precisa do nome de quem autorizou na direção.' });
    }
    await c.env.DB.prepare(
      `UPDATE alunos SET qtd_acompanhantes = ?, qtd_extras = ?, extra_autorizado_por = ?, telefone = ?, observacoes = ?
       WHERE id = ?`
    ).bind(qtd, extras, autorizadoPor, telefone, obs, aluno.id).run();
    await registrarAuditoria(c.env.DB, {
      usuario_id: u.id,
      acao: 'editou_aluno',
      aluno_id: aluno.id,
      escola_id: escola.id,
      detalhe: `acomp=${qtd} extras=${extras}`,
    });
  }

  aluno = (await c.env.DB.prepare('SELECT * FROM alunos WHERE id = ?').bind(aluno.id).first<Aluno>())!;
  return paginaFicha(c, u, aluno, escola, { ok: 'Alterações salvas.' });
});

// ---------- Incluir aluno fora da lista ----------
painelRoutes.post('/painel/aluno-novo', async (c) => {
  const u = exigirLogin(c);
  if (u instanceof Response) return u;
  if (u.papel !== 'comissao' || !u.escola_id) return c.redirect('/painel');
  const corpo = await c.req.parseBody();
  const nome = String(corpo['nome'] ?? '').trim().slice(0, 120);
  const turma = String(corpo['turma'] ?? '').trim().slice(0, 30) || null;
  if (nome.length < 5) return c.redirect('/painel');
  const r = await c.env.DB.prepare(
    'INSERT INTO alunos (escola_id, nome, nome_busca, turma, incluido_manualmente) VALUES (?, ?, ?, ?, 1)'
  ).bind(u.escola_id, nome, normalizar(nome), turma).run();
  await registrarAuditoria(c.env.DB, {
    usuario_id: u.id,
    acao: 'incluiu_aluno',
    aluno_id: r.meta.last_row_id as number,
    escola_id: u.escola_id,
    detalhe: nome,
  });
  return c.redirect(`/painel/aluno/${r.meta.last_row_id}`);
});

// ---------- Fechamento: total de kg ----------
painelRoutes.post('/painel/kg', async (c) => {
  const u = exigirLogin(c);
  if (u instanceof Response) return u;
  if (u.papel !== 'comissao' || !u.escola_id) return c.redirect('/painel');
  const corpo = await c.req.parseBody();
  const kg = parseFloat(String(corpo['kg'] ?? ''));
  if (isNaN(kg) || kg < 0) return c.redirect('/painel');
  await c.env.DB.prepare('UPDATE escolas SET kg_arrecadados = ? WHERE id = ?').bind(kg, u.escola_id).run();
  await registrarAuditoria(c.env.DB, {
    usuario_id: u.id,
    acao: 'lancou_kg',
    escola_id: u.escola_id,
    detalhe: `${kg} kg`,
  });
  return c.redirect('/painel');
});

// ---------- Trocar senha ----------
painelRoutes.get('/senha', async (c) => {
  const u = exigirLogin(c);
  if (u instanceof Response) return u;
  return c.html(paginaSenha(u));
});

function paginaSenha(u: SessUser, aviso?: { ok?: string; erro?: string }) {
  return (
    <Layout titulo="Trocar senha" usuario={u}>
      <main class="wrap wrap-estreito">
        <div class="cartao">
          <h1>Trocar senha</h1>
          {aviso?.ok && <Msg tipo="ok">{aviso.ok}</Msg>}
          {aviso?.erro && <Msg tipo="erro">{aviso.erro}</Msg>}
          <form method="post" action="/senha">
            <label for="s-atual">Senha atual</label>
            <input id="s-atual" type="password" name="atual" required />
            <label for="s-nova">Nova senha (mínimo 8 caracteres)</label>
            <input id="s-nova" type="password" name="nova" minlength={8} required />
            <div class="linha-acoes">
              <button class="botao" type="submit">Salvar nova senha</button>
            </div>
          </form>
        </div>
      </main>
    </Layout>
  );
}

painelRoutes.post('/senha', async (c) => {
  const u = exigirLogin(c);
  if (u instanceof Response) return u;
  const corpo = await c.req.parseBody();
  const atual = String(corpo['atual'] ?? '');
  const nova = String(corpo['nova'] ?? '');
  const linha = await c.env.DB.prepare('SELECT senha_hash FROM usuarios WHERE id = ?')
    .bind(u.id)
    .first<{ senha_hash: string }>();
  if (!linha || !(await verificarSenha(atual, linha.senha_hash))) {
    return c.html(paginaSenha(u, { erro: 'Senha atual incorreta.' }));
  }
  if (nova.length < 8) {
    return c.html(paginaSenha(u, { erro: 'A nova senha precisa de pelo menos 8 caracteres.' }));
  }
  await c.env.DB.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')
    .bind(await hashSenha(nova), u.id)
    .run();
  await registrarAuditoria(c.env.DB, { usuario_id: u.id, acao: 'trocou_senha' });
  return c.html(paginaSenha(u, { ok: 'Senha alterada.' }));
});
