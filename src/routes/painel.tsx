import { Hono } from 'hono';
import type { Env, SessUser } from '../auth';
import { hashSenha, verificarSenha } from '../auth';
import { FaixaPagina, IconeBusca, Layout, Kpi, Msg } from '../ui';
import {
  type Acompanhante,
  type Aluno,
  type Escola,
  SQL_SALDO,
  acompanhantesDoAluno,
  dataHoraBrasilia,
  formatarCerimonia,
  formatarData,
  formatarTelefone,
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

// Atualiza o painel sozinho a cada 30 s (acompanhamento em tempo real dos ingressos).
// Troca só o conteúdo da página e pula a vez se a pessoa estiver digitando ou com a aba escondida.
const JS_AO_VIVO = `
(function () {
  var INTERVALO = 30000;
  function ocupado() {
    var a = document.activeElement;
    return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || document.visibilityState !== 'visible';
  }
  function atualizar() {
    if (ocupado()) return;
    fetch(location.href, { credentials: 'same-origin', headers: { 'X-Ao-Vivo': '1' } })
      .then(function (r) { return r.ok && !r.redirected ? r.text() : null; })
      .then(function (html) {
        if (!html || ocupado()) return;
        var novo = new DOMParser().parseFromString(html, 'text/html').querySelector('main');
        var atual = document.querySelector('main');
        if (novo && atual) atual.innerHTML = novo.innerHTML;
      })
      .catch(function () {});
  }
  setInterval(atualizar, INTERVALO);
})();
`;

function horaBrasilia(): string {
  const b = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(b.getUTCHours())}:${p(b.getUTCMinutes())}:${p(b.getUTCSeconds())}`;
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
  const fila = (
    await c.env.DB.prepare(
      'SELECT * FROM alunos WHERE escola_id = ? AND inscrito_em IS NOT NULL AND qtd_espera > 0 ORDER BY espera_desde, id'
    ).bind(escola.id).all<Aluno>()
  ).results;

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
        lead={escola.data_cerimonia ? `Formatura ${formatarCerimonia(escola, true)}` : `Edição ${escola.edicao}`}
        voltar={u.papel === 'admin' ? { href: '/admin', texto: 'Todas as escolas' } : undefined}
      >
        <p class="lead">
          Link de inscrição dos alunos: <a href={linkPublico}>{linkPublico}</a>
        </p>
      </FaixaPagina>
      <main class="wrap">
        {avisos?.ok && <Msg tipo="ok">{avisos.ok}</Msg>}
        {avisos?.erro && <Msg tipo="erro">{avisos.erro}</Msg>}

        <p class="ao-vivo">
          <i aria-hidden="true"></i> Ao vivo · atualiza sozinho a cada 30 segundos · última atualização às {horaBrasilia()}
        </p>
        <div class="kpis">
          <Kpi valor={`${kpis.inscritos} / ${kpis.total_lista}`} rotulo="inscritos sobre a lista de formandos" />
          <Kpi valor={kpis.ingressos} rotulo="ingressos usados (formandos + acompanhantes)" />
          <Kpi valor={kpis.saldo} rotulo="vagas sobrando (de quem levou menos de 3)" />
          <Kpi
            valor={kpis.espera}
            rotulo={`vagas a mais em espera${kpis.familias_espera ? ` (${kpis.familias_espera} família${kpis.familias_espera === 1 ? '' : 's'})` : ''}`}
          />
          <Kpi valor={`${kpis.ingressos} L`} rotulo="de leite esperados no dia — 1 litro por pessoa" verde />
          {escola.capacidade != null && (
            <Kpi valor={`${kpis.ingressos} / ${escola.capacidade}`} rotulo="lugares usados sobre a capacidade" />
          )}
          {escola.kg_arrecadados != null && (
            <Kpi valor={`${escola.kg_arrecadados} L`} rotulo="de leite arrecadados no evento (lançado após a cerimônia)" verde />
          )}
        </div>

        {fila.length > 0 && (
          <div class="cartao">
            <h2>Fila de espera</h2>
            <p class="ajuda">
              Famílias que pediram mais de 3 acompanhantes quando não havia vaga sobrando, por ordem de
              pedido. Vagas sobrando agora: <b>{Math.max(0, kpis.saldo)}</b>.
              {!somenteLeitura && kpis.saldo > 0 && ' Ao liberar, avise a família pelo telefone.'}
            </p>
            <div class="fila">
              {fila.map((a: Aluno) => (
                <div class="fila-item">
                  <div>
                    <div class="nome">{a.nome}</div>
                    <div class="meta">
                      {a.turma ?? 'Turma não informada'} · pediu {a.qtd_espera} a mais · desde{' '}
                      {dataHoraBrasilia(a.espera_desde)}
                      {a.telefone ? ` · ${formatarTelefone(a.telefone)}` : ''}
                    </div>
                  </div>
                  {!somenteLeitura && (
                    <div class="linha-acoes" style="margin:0">
                      {kpis.saldo > 0 && (
                        <form method="post" action={`/painel/aluno/${a.id}`} style="margin:0">
                          <button class="botao botao-verde botao-min" type="submit" name="acao" value="liberar">
                            Liberar {Math.min(a.qtd_espera, kpis.saldo)}
                          </button>
                        </form>
                      )}
                      <a class="botao botao-borda botao-min" href={`/painel/aluno/${a.id}`}>
                        Ficha
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
              <th class="num">Litros</th>
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
                    <>
                      <span class="etiqueta etiqueta-verde">Inscrito</span>
                      {a.qtd_espera > 0 && (
                        <span class="etiqueta etiqueta-aviso" style="margin-left:6px">
                          +{a.qtd_espera} em espera
                        </span>
                      )}
                    </>
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
                Depois da cerimônia, lance aqui quantos litros de leite a escola arrecadou no dia.
              </p>
              <form method="post" action="/painel/kg">
                <label for="kg">Total arrecadado (litros)</label>
                <input
                  id="kg"
                  type="number"
                  name="kg"
                  min="0"
                  step="1"
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
      <script dangerouslySetInnerHTML={{ __html: JS_AO_VIVO }} />
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

async function paginaFicha(c: any, u: SessUser, aluno: Aluno, escola: Escola, aviso?: { ok?: string; erro?: string }) {
  const fichas: Acompanhante[] = await acompanhantesDoAluno(c.env.DB, aluno.id);
  const saldoRow = await c.env.DB.prepare(`SELECT ${SQL_SALDO} AS saldo`).bind(escola.id).first<{ saldo: number }>();
  const saldo = saldoRow?.saldo ?? 0;
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
              <h3 style="margin:22px 0 0">Dados do formando</h3>
              <dl class="dados" style="margin-top:10px">
                <dt>Nascimento</dt>
                <dd>{aluno.data_nascimento ? formatarData(aluno.data_nascimento) : '—'}</dd>
                <dt>Telefone</dt>
                <dd>{aluno.telefone ? formatarTelefone(aluno.telefone) : '—'}</dd>
                <dt>Endereço</dt>
                <dd>{aluno.endereco ?? '—'}</dd>
              </dl>

              <h3 style="margin:24px 0 0">Acompanhantes</h3>
              {fichas.length === 0 ? (
                <p class="ajuda">
                  {aluno.qtd_acompanhantes > 0
                    ? 'Inscrição feita sem as fichas dos acompanhantes (inscrição manual ou anterior ao formulário novo).'
                    : 'Nenhum acompanhante.'}
                </p>
              ) : (
                <div class="ficha-lista">
                  {fichas.map((f) => (
                    <div class={f.situacao === 'espera' ? 'ficha-item em-espera' : 'ficha-item'}>
                      <b>
                        {f.ordem}. {f.nome}
                        {f.ordem > 3 && f.situacao === 'confirmado' && (
                          <span class="etiqueta etiqueta-verde" style="margin-left:8px">vaga a mais</span>
                        )}
                        {f.situacao === 'espera' && (
                          <span class="etiqueta etiqueta-aviso" style="margin-left:8px">em espera</span>
                        )}
                      </b>
                      <dl class="dados">
                        <dt>Nascimento</dt>
                        <dd>{formatarData(f.data_nascimento)}</dd>
                        <dt>Telefone</dt>
                        <dd>{formatarTelefone(f.telefone)}</dd>
                        <dt>Endereço</dt>
                        <dd>{f.endereco}</dd>
                      </dl>
                    </div>
                  ))}
                </div>
              )}

              {aluno.qtd_espera > 0 && (
                <div class="msg msg-aviso" style="margin-top:18px">
                  Pediu {aluno.qtd_espera} vaga{aluno.qtd_espera === 1 ? '' : 's'} a mais, em espera desde{' '}
                  {dataHoraBrasilia(aluno.espera_desde)}. Vagas sobrando na escola agora: {Math.max(0, saldo)}.
                  {saldo > 0 && (
                    <form method="post" action={`/painel/aluno/${aluno.id}`} style="margin:10px 0 0">
                      <button class="botao botao-verde botao-min" type="submit" name="acao" value="liberar">
                        Liberar {Math.min(aluno.qtd_espera, saldo)} vaga{Math.min(aluno.qtd_espera, saldo) === 1 ? '' : 's'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              <hr class="separador" />
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
                <label for="f-espera">Vagas a mais em espera</label>
                <input id="f-espera" type="number" name="qtd_espera" min="0" max="20" value={String(aluno.qtd_espera)} />
                <p class="ajuda">Para conceder uma vaga em espera, passe 1 de “em espera” para “convidados extras”.</p>
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
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM acompanhantes WHERE aluno_id = ?').bind(aluno.id),
      c.env.DB.prepare(
        `UPDATE alunos SET inscrito_em = NULL, codigo = NULL, qtd_acompanhantes = 0, qtd_extras = 0,
         extra_autorizado_por = NULL, qtd_espera = 0, espera_desde = NULL WHERE id = ?`
      ).bind(aluno.id),
    ]);
    await registrarAuditoria(c.env.DB, {
      usuario_id: u.id,
      acao: 'cancelou_inscricao',
      aluno_id: aluno.id,
      escola_id: escola.id,
    });
    return c.redirect(u.papel === 'admin' ? `/painel/escola/${escola.id}` : '/painel');
  }

  if (acao === 'liberar') {
    if (!aluno.inscrito_em || aluno.qtd_espera <= 0) return paginaFicha(c, u, aluno, escola);
    // Passa para este aluno o que houver de vaga sobrando, até o que ele pediu.
    const db = c.env.DB;
    const [r1] = await db.batch([
      db.prepare(
        `UPDATE alunos SET
           extra_autorizado_por = COALESCE(extra_autorizado_por, ?),
           qtd_extras = qtd_extras + MAX(0, MIN(qtd_espera, ${SQL_SALDO})),
           qtd_espera = qtd_espera - MAX(0, MIN(qtd_espera, ${SQL_SALDO}))
         WHERE id = ? AND inscrito_em IS NOT NULL`
      ).bind(`Fila de espera (liberado por ${u.nome})`, escola.id, escola.id, aluno.id),
      db.prepare(
        `UPDATE acompanhantes SET situacao = 'confirmado'
         WHERE aluno_id = ? AND ordem <= (SELECT qtd_acompanhantes + qtd_extras FROM alunos WHERE id = ?)`
      ).bind(aluno.id, aluno.id),
      db.prepare("UPDATE alunos SET espera_desde = NULL WHERE id = ? AND qtd_espera = 0").bind(aluno.id),
    ]);
    const depois = (await db.prepare('SELECT * FROM alunos WHERE id = ?').bind(aluno.id).first<Aluno>())!;
    const liberadas = depois.qtd_extras - aluno.qtd_extras;
    if (liberadas > 0) {
      await registrarAuditoria(db, {
        usuario_id: u.id,
        acao: 'liberou_vagas',
        aluno_id: aluno.id,
        escola_id: escola.id,
        detalhe: `${liberadas} vaga(s) da fila de espera`,
      });
    }
    const voltarPainel = c.req.header('referer')?.includes('/painel/aluno/') !== true;
    const msg =
      liberadas > 0
        ? `${liberadas} vaga${liberadas === 1 ? '' : 's'} liberada${liberadas === 1 ? '' : 's'} para ${aluno.nome}. Avise a família.`
        : 'Não há vagas sobrando agora.';
    if (voltarPainel) return renderDashboard(c, escola.id, false, liberadas > 0 ? { ok: msg } : { erro: msg });
    return paginaFicha(c, u, depois, escola, liberadas > 0 ? { ok: msg } : { erro: msg });
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
    const espera = Math.min(20, Math.max(0, parseInt(String(corpo['qtd_espera'] ?? '0'), 10) || 0));
    if (extras > 0 && !autorizadoPor) {
      return paginaFicha(c, u, aluno, escola, { erro: 'Convidado extra precisa do nome de quem autorizou na direção.' });
    }
    const confirmadas = qtd + extras;
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE alunos SET qtd_acompanhantes = ?, qtd_extras = ?, extra_autorizado_por = ?, telefone = ?, observacoes = ?,
           qtd_espera = ?, espera_desde = CASE WHEN ? > 0 THEN COALESCE(espera_desde, datetime('now')) END
         WHERE id = ?`
      ).bind(qtd, extras, autorizadoPor, telefone, obs, espera, espera, aluno.id),
      // Fichas: as primeiras ficam confirmadas, as seguintes em espera; o que passar disso sai.
      c.env.DB.prepare(
        `UPDATE acompanhantes SET situacao = CASE WHEN ordem <= ? THEN 'confirmado' ELSE 'espera' END WHERE aluno_id = ?`
      ).bind(confirmadas, aluno.id),
      c.env.DB.prepare('DELETE FROM acompanhantes WHERE aluno_id = ? AND ordem > ?').bind(aluno.id, confirmadas + espera),
    ]);
    await registrarAuditoria(c.env.DB, {
      usuario_id: u.id,
      acao: 'editou_aluno',
      aluno_id: aluno.id,
      escola_id: escola.id,
      detalhe: `acomp=${qtd} extras=${extras} espera=${espera}`,
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

// ---------- Fechamento: total de litros de leite (coluna kg_arrecadados) ----------
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
    detalhe: `${kg} L`,
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
