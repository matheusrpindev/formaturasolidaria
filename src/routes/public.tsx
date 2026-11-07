import { Hono } from 'hono';
import type { Env, SessUser } from '../auth';
import { FaixaPagina, IconeBusca, JS_OPCOES, Layout, Msg } from '../ui';
import {
  type Aluno,
  type Escola,
  MAX_EXTRAS_PEDIDO,
  SQL_SALDO_LIVRE,
  VAGAS_POR_ALUNO,
  acompanhantesDoAluno,
  formatarCerimonia,
  formatarData,
  formatarTelefone,
  partesCerimonia,
  limparTelefone,
  nascimentoValido,
  gerarCodigo,
  lerConfig,
  normalizar,
  prazoEncerrado,
  registrarAuditoria,
} from '../db';

type Ctx = { Bindings: Env; Variables: { usuario: SessUser | null } };

export const publicRoutes = new Hono<Ctx>();

const IconeWhats = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.71-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.47c-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.73 2.65 4.2 3.71.59.25 1.04.4 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.11-.22-.17-.47-.29Z" />
  </svg>
);

// ---------- Página inicial ----------
publicRoutes.get('/', async (c) => {
  const escolas = await c.env.DB.prepare(
    "SELECT * FROM escolas WHERE status = 'ativa' ORDER BY data_cerimonia IS NULL, data_cerimonia, nome"
  ).all<Escola>();
  const total = escolas.results.length;

  return c.html(
    <Layout titulo="Início" usuario={c.get('usuario')} topoSobre>
      <section class="hero-video">
        {/* Vídeo em loop, sem som. Para trocar, substitua public/video/hero.mp4 e hero.jpg. */}
        <video
          class="hero-bg"
          autoplay
          muted
          loop
          playsinline
          preload="auto"
          poster="/video/hero.jpg"
          aria-hidden="true"
        >
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>
        <div class="hero-veu" />
        <div class="hero-conteudo">
          <p class="hero-sobre">
            Projeto social · Itaquaquecetuba
            <br />
            {total > 0 ? `${total} escola${total === 1 ? '' : 's'}` : 'Próxima edição em breve'}
          </p>
          <h1 class="hero-titulo">
            Formaturas
            <br />
            Solidárias
          </h1>
          <div class="hero-linhas">
            <p>A formatura é gratuita.</p>
            <p>O ingresso é 1 litro de leite.</p>
            <p>Todo o leite arrecadado vira doação.</p>
          </div>
          <div class="hero-acoes">
            <a class="botao botao-branco" href="#escolas">
              Encontrar minha escola
            </a>
          </div>
        </div>
      </section>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){var v=document.querySelector('.hero-bg');if(v){v.removeAttribute('autoplay');v.pause();}}",
        }}
      />

      <section class="secao" id="como">
        <div class="secao-cabeca">
          <p class="kicker">Como funciona</p>
          <h2>Três passos até a cerimônia</h2>
        </div>
        <div class="grade grade-3">
          <div class="passo">
            <span class="n">01</span>
            <h3>Ache a sua escola</h3>
            <p>Escolha a escola na lista abaixo e busque o seu nome entre os formandos.</p>
          </div>
          <div class="passo">
            <span class="n">02</span>
            <h3>Diga quem vai com você</h3>
            <p>Ache o seu nome, preencha os seus dados e os de quem vai com você — até 3 acompanhantes.</p>
          </div>
          <div class="passo">
            <span class="n">03</span>
            <h3>Leve 1 litro de leite por pessoa</h3>
            <p>No dia da formatura, cada pessoa leva 1 litro de leite e deposita na caixa da escola. Esse é o ingresso.</p>
          </div>
        </div>
      </section>

      <section class="secao" id="escolas">
        <div class="secao-cabeca">
          <p class="kicker">{total === 0 ? 'Em breve' : 'Escolas e datas'}</p>
          <h2>Escolas participantes</h2>
          {total > 0 && <p>Clique na sua escola para buscar o seu nome na lista de formandos.</p>}
        </div>
        {total === 0 ? (
          <p class="ajuda">
            As escolas desta edição serão publicadas aqui em breve. Acompanhe pela direção da sua
            escola.
          </p>
        ) : (
          <div class="escolas-lista">
            {escolas.results.map((e) => (
              <a class="escola-card" href={`/e/${e.slug}`}>
                {(() => {
                  const d = partesCerimonia(e);
                  return d ? (
                    <div class="folhinha" aria-label={`Formatura ${formatarCerimonia(e)}`}>
                      <b>{d.dia}</b>
                      <span>{d.mes}</span>
                      <small>{d.semana}</small>
                    </div>
                  ) : null;
                })()}
                <div class="escola-info">
                  <h3>{e.nome}</h3>
                  <div class="meta">
                    {e.data_cerimonia && (
                      <span class="data-cerimonia">
                        Formatura {formatarCerimonia(e)}
                      </span>
                    )}
                    {e.prazo_inscricao ? ` · inscrições até ${formatarData(e.prazo_inscricao)}` : ''}
                  </div>
                </div>
                <div class="seta">
                  <b>Buscar meu nome</b> <span>→</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section class="secao secao-final">
        <div class="faixa-verde">
          <div class="num">
            1 L
            <small>de leite por pessoa</small>
          </div>
          <div>
            <p class="kicker">Para onde vai o leite</p>
            <h2>O ingresso vira doação</h2>
            <p>
              Todo o leite recolhido na entrada da cerimônia vira doação: uma parte fica com a
              comunidade escolar da própria escola, e o restante vai para famílias em situação de
              vulnerabilidade social.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
});

// ---------- Página da escola: busca do nome ----------
publicRoutes.get('/e/:slug', async (c) => {
  const escola = await c.env.DB.prepare('SELECT * FROM escolas WHERE slug = ?')
    .bind(c.req.param('slug'))
    .first<Escola>();
  if (!escola || escola.status !== 'ativa') return c.notFound();

  const q = (c.req.query('q') ?? '').trim();
  let resultados: Aluno[] = [];
  if (q.length >= 3) {
    const r = await c.env.DB.prepare(
      'SELECT * FROM alunos WHERE escola_id = ? AND nome_busca LIKE ? ORDER BY nome LIMIT 25'
    )
      .bind(escola.id, `%${normalizar(q)}%`)
      .all<Aluno>();
    resultados = r.results;
  }
  const encerrado = prazoEncerrado(escola);
  const temLista = !!(await c.env.DB.prepare('SELECT 1 FROM alunos WHERE escola_id = ? LIMIT 1').bind(escola.id).first());

  return c.html(
    <Layout
      titulo={escola.nome}
      usuario={c.get('usuario')}
      descricao={`Inscrição na Formatura Solidária da ${escola.nome}. O ingresso é 1 litro de leite por pessoa, entregue no dia da cerimônia.`}
    >
      <FaixaPagina
        estreito
        voltar={{ href: '/', texto: 'Todas as escolas' }}
        kicker={
          escola.data_cerimonia
            ? `Formatura de ${formatarData(escola.data_cerimonia).slice(0, 5)} · Edição ${escola.edicao}`
            : `Formatura Solidária · Edição ${escola.edicao}`
        }
        titulo={escola.nome}
        lead={[
          escola.data_cerimonia ? `Formatura ${formatarCerimonia(escola, true)}.` : '',
          escola.prazo_inscricao && !encerrado
            ? `Inscrições até ${formatarData(escola.prazo_inscricao)} · busque o seu nome na lista de formandos.`
            : 'Busque o seu nome na lista de formandos para confirmar a sua inscrição.',
        ].filter(Boolean).join(' ')}
      />
      <main class="wrap wrap-estreito">
        <div class="cartao cartao-destaque puxa-cima">
          {!temLista ? (
            <Msg tipo="aviso">
              A lista de formandos desta escola ainda não foi publicada. Volte em breve para fazer a sua
              inscrição.
            </Msg>
          ) : encerrado ? (
            <Msg tipo="aviso">
              As inscrições desta escola foram encerradas em {formatarData(escola.prazo_inscricao)}. Fale com a
              comissão de formatura da sua escola.
            </Msg>
          ) : (
            <>
              <label for="q" style="margin-top:0">
                Seu nome completo
              </label>
              <form class="busca-form busca-grande" method="get" action={`/e/${escola.slug}`}>
                <div class="busca-caixa">
                  <IconeBusca />
                  <input
                    id="q"
                    type="text"
                    name="q"
                    value={q}
                    placeholder="Ex.: Maria Silva"
                    minlength={3}
                    required
                    autocomplete="name"
                  />
                </div>
                <button class="botao" type="submit">
                  Buscar
                </button>
              </form>
              <p class="ajuda">
                Digite pelo menos 3 letras. Não precisa de acento nem do nome inteiro.
              </p>
            </>
          )}
        </div>

        {q.length >= 3 && !encerrado && temLista && (
          <div class="cartao">
            <h2>
              {resultados.length === 0
                ? 'Nenhum nome encontrado'
                : `${resultados.length} resultado${resultados.length === 1 ? '' : 's'} para "${q}"`}
            </h2>
            {resultados.length === 0 ? (
              <Msg tipo="aviso">
                Não achamos "{q}" na lista desta escola. Tente outra parte do nome. Se você é
                formando e não aparece, procure a comissão de formatura da escola.
              </Msg>
            ) : (
              <div class="lista">
                {resultados.map((a) => (
                  <div class="resultado">
                    <div>
                      <div class="nome">{a.nome}</div>
                      <div class="turma">{a.turma ?? 'Turma não informada'}</div>
                    </div>
                    {a.inscrito_em ? (
                      <span class="etiqueta etiqueta-verde">Inscrito ✓</span>
                    ) : (
                      <a class="botao botao-verde botao-min" href={`/e/${escola.slug}/inscrever/${a.id}`}>
                        Sou eu
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </Layout>
  );
});

// ---------- Formulário de inscrição ----------
async function carregarAlunoDaEscola(c: any): Promise<{ escola: Escola; aluno: Aluno } | null> {
  const escola = await c.env.DB.prepare('SELECT * FROM escolas WHERE slug = ?')
    .bind(c.req.param('slug'))
    .first<Escola>();
  if (!escola || escola.status !== 'ativa') return null;
  const aluno = await c.env.DB.prepare('SELECT * FROM alunos WHERE id = ? AND escola_id = ?')
    .bind(parseInt(c.req.param('id'), 10), escola.id)
    .first<Aluno>();
  if (!aluno) return null;
  return { escola, aluno };
}

const OPCOES_ACOMP = [
  { valor: '0', titulo: '0', rotulo: 'vou sozinho(a)' },
  { valor: '1', titulo: '1', rotulo: 'acompanhante' },
  { valor: '2', titulo: '2', rotulo: 'acompanhantes' },
  { valor: '3', titulo: '3', rotulo: 'acompanhantes' },
  { valor: 'mais', titulo: '+3', rotulo: 'mais de 3' },
];
const MAX_FICHAS = VAGAS_POR_ALUNO + MAX_EXTRAS_PEDIDO;

type Valores = Record<string, string>;

// Mostra só as fichas dos acompanhantes escolhidos. Fichas escondidas ficam
// desativadas, então o navegador não as valida nem as envia.
const JS_FICHAS = `
(function () {
  function atualizar() {
    var r = document.querySelector('input[name="qtd_acompanhantes"]:checked');
    var mais = !!r && r.value === 'mais';
    var pedido = document.querySelector('[data-pedido-extra]');
    if (pedido) { pedido.hidden = !mais; pedido.disabled = !mais; }
    var sel = document.querySelector('select[name="qtd_extras_pedido"]');
    var n = !r ? 0 : mais ? 3 + (sel ? parseInt(sel.value, 10) || 0 : 0) : parseInt(r.value, 10);
    var fichas = document.querySelectorAll('fieldset[data-acomp]');
    for (var i = 0; i < fichas.length; i++) {
      var ligada = parseInt(fichas[i].getAttribute('data-acomp'), 10) <= n;
      fichas[i].hidden = !ligada;
      fichas[i].disabled = !ligada;
    }
    var mesmos = document.querySelectorAll('input[data-mesmo]');
    for (var j = 0; j < mesmos.length; j++) {
      var campo = document.getElementById(mesmos[j].getAttribute('data-mesmo'));
      if (!campo) continue;
      var caixa = campo.closest('.campo-endereco');
      if (caixa) caixa.hidden = mesmos[j].checked;
      campo.disabled = mesmos[j].checked;
    }
  }
  document.addEventListener('change', atualizar);
  atualizar();
})();
`;

const hoje = () => new Date().toISOString().slice(0, 10);

const CamposPessoa = (p: { prefixo: string; v: Valores; comNome?: boolean; mesmoEndereco?: boolean }) => {
  const id = (c: string) => `${p.prefixo}_${c}`;
  return (
    <>
      {p.comNome && (
        <>
          <label for={id('nome')}>Nome completo</label>
          <input id={id('nome')} type="text" name={id('nome')} value={p.v[id('nome')] ?? ''} required minlength={3} maxlength={120} autocomplete="off" />
        </>
      )}
      <div class="duas-col">
        <div>
          <label for={id('nascimento')}>Data de nascimento</label>
          <input id={id('nascimento')} type="date" name={id('nascimento')} value={p.v[id('nascimento')] ?? ''} min="1900-01-01" max={hoje()} required />
        </div>
        <div>
          <label for={id('telefone')}>Telefone / WhatsApp</label>
          <input id={id('telefone')} type="tel" inputmode="tel" name={id('telefone')} value={p.v[id('telefone')] ?? ''} placeholder="(11) 9XXXX-XXXX" required maxlength={20} />
        </div>
      </div>
      {p.mesmoEndereco && (
        <label class="check-linha">
          <input type="checkbox" name={id('mesmo')} value="1" data-mesmo={id('endereco')} checked={p.v[id('mesmo')] === '1'} />
          <span>Mora no mesmo endereço que o formando</span>
        </label>
      )}
      <div class="campo-endereco">
        <label for={id('endereco')}>Endereço</label>
        <input id={id('endereco')} type="text" name={id('endereco')} value={p.v[id('endereco')] ?? ''} placeholder="Rua, número, bairro e cidade" required minlength={5} maxlength={200} autocomplete={p.comNome ? 'off' : 'street-address'} />
      </div>
    </>
  );
};

const FormInscricao = (p: { escola: Escola; aluno: Aluno; erros?: string[]; valores?: Valores; usuario: SessUser | null }) => {
  const v = p.valores ?? {};
  const escolha = v['qtd_acompanhantes'] ?? '';
  const mais = escolha === 'mais';
  const pedido = Math.min(MAX_EXTRAS_PEDIDO, Math.max(1, parseInt(v['qtd_extras_pedido'] ?? '1', 10) || 1));
  const qtd = mais ? VAGAS_POR_ALUNO + pedido : parseInt(escolha, 10);
  return (
    <Layout titulo="Inscrição" usuario={p.usuario}>
      <FaixaPagina
        estreito
        voltar={{ href: `/e/${p.escola.slug}`, texto: 'Não sou eu, voltar' }}
        kicker={p.escola.data_cerimonia ? `${p.escola.nome} · ${formatarData(p.escola.data_cerimonia).slice(0, 5)}` : p.escola.nome}
        titulo={p.aluno.nome}
        lead={`${p.aluno.turma ?? 'Turma não informada'} · falta pouco para confirmar a sua vaga.`}
      />
      <main class="wrap wrap-estreito">
        <div class="cartao cartao-destaque puxa-cima">
          {p.erros && p.erros.length > 0 && (
            <Msg tipo="erro">
              {p.erros.length === 1 ? (
                p.erros[0]
              ) : (
                <>
                  Confira estes campos:
                  <ul class="lista-erros">
                    {p.erros.map((e) => (
                      <li>{e}</li>
                    ))}
                  </ul>
                </>
              )}
            </Msg>
          )}
          <form method="post" action={`/e/${p.escola.slug}/inscrever/${p.aluno.id}`}>
            <fieldset class="ficha">
              <legend>Seus dados</legend>
              <p class="ajuda ficha-nome">
                Nome: <b>{p.aluno.nome}</b> <span>(como veio da lista da escola)</span>
              </p>
              <CamposPessoa prefixo="aluno" v={v} />
            </fieldset>

            <label style="margin-top:28px">Quantos acompanhantes você vai levar?</label>
            <div class="opcoes">
              {OPCOES_ACOMP.map((o) => (
                <label class={escolha === o.valor ? 'opcao marcada' : 'opcao'}>
                  <input type="radio" name="qtd_acompanhantes" value={o.valor} required checked={escolha === o.valor} />
                  <b>{o.titulo}</b>
                  <span>{o.rotulo}</span>
                </label>
              ))}
            </div>
            <p class="ajuda">
              Todo formando tem direito a até 3 acompanhantes. Precisa de mais? Escolha “mais de 3”.
            </p>

            <fieldset class="pedido-extra" data-pedido-extra hidden={!mais} disabled={!mais}>
              <label for="qtd_extras_pedido" style="margin-top:0">
                Quantas pessoas a mais, além das 3?
              </label>
              <select id="qtd_extras_pedido" name="qtd_extras_pedido">
                {Array.from({ length: MAX_EXTRAS_PEDIDO }, (_, k) => k + 1).map((n) => (
                  <option value={String(n)} selected={pedido === n}>
                    {n} {n === 1 ? 'pessoa' : 'pessoas'} a mais
                  </option>
                ))}
              </select>
              <p class="ajuda">
                As 3 primeiras estão garantidas. As vagas a mais vêm das vagas que outros formandos não
                usaram: se houver vaga sobrando, ela já fica com você. Se não houver agora, o pedido fica
                em espera e a comissão entra em contato se abrirem vagas.
              </p>
            </fieldset>

            {Array.from({ length: MAX_FICHAS }, (_, k) => k + 1).map((i) => {
              const ligada = !isNaN(qtd) && i <= qtd;
              return (
                <fieldset class="ficha" data-acomp={String(i)} hidden={!ligada} disabled={!ligada}>
                  <legend>
                    Acompanhante {i}
                    {i > VAGAS_POR_ALUNO ? ' · vaga a mais' : ''}
                  </legend>
                  <CamposPessoa prefixo={`acomp${i}`} v={v} comNome mesmoEndereco />
                </fieldset>
              );
            })}

            <label class="concordo">
              <input type="checkbox" name="confirmo" value="1" required />
              <span>
                Confirmo que sou {p.aluno.nome} (ou responsável), que os dados acima estão corretos
                e que cada pessoa leva 1 litro de leite no dia da formatura.
              </span>
            </label>

            <div class="linha-acoes">
              <button class="botao botao-verde botao-largo" type="submit">
                Confirmar minha inscrição
              </button>
            </div>
          </form>
        </div>
      </main>
      <script dangerouslySetInnerHTML={{ __html: JS_OPCOES + JS_FICHAS }} />
    </Layout>
  );
};

publicRoutes.get('/e/:slug/inscrever/:id', async (c) => {
  const dados = await carregarAlunoDaEscola(c);
  if (!dados) return c.notFound();
  if (prazoEncerrado(dados.escola)) return c.redirect(`/e/${dados.escola.slug}`);
  if (dados.aluno.inscrito_em) {
    return c.html(
      <Layout titulo="Já inscrito" usuario={c.get('usuario')}>
        <main class="wrap wrap-estreito">
          <div class="cartao cartao-azul">
            <h1>Este nome já está inscrito</h1>
            <p>
              {dados.aluno.nome} já tem inscrição confirmada. Se foi você, está tudo certo! Se você
              não fez essa inscrição, procure a comissão de formatura da escola.
            </p>
            <div class="linha-acoes">
              <a class="botao botao-borda" href={`/e/${dados.escola.slug}`}>
                Voltar para a busca
              </a>
            </div>
          </div>
        </main>
      </Layout>
    );
  }
  return c.html(<FormInscricao escola={dados.escola} aluno={dados.aluno} usuario={c.get('usuario')} />);
});

publicRoutes.post('/e/:slug/inscrever/:id', async (c) => {
  const dados = await carregarAlunoDaEscola(c);
  if (!dados) return c.notFound();
  const { escola, aluno } = dados;
  if (prazoEncerrado(escola)) return c.redirect(`/e/${escola.slug}`);
  if (aluno.inscrito_em) return c.redirect(`/e/${escola.slug}/inscrever/${aluno.id}`);

  const corpo = await c.req.parseBody();
  const v: Valores = {};
  for (const [k, val] of Object.entries(corpo)) if (typeof val === 'string') v[k] = val.trim();

  const erros: string[] = [];
  const pessoa = (prefixo: string, rotulo: string, comNome: boolean, enderecoFormando?: string) => {
    const nome = (v[`${prefixo}_nome`] ?? '').replace(/\s+/g, ' ').slice(0, 120);
    const nascimento = v[`${prefixo}_nascimento`] ?? '';
    const telefone = limparTelefone(v[`${prefixo}_telefone`] ?? '');
    const mesmo = v[`${prefixo}_mesmo`] === '1' && enderecoFormando !== undefined;
    const endereco = mesmo ? enderecoFormando! : (v[`${prefixo}_endereco`] ?? '').replace(/\s+/g, ' ').slice(0, 200);
    if (comNome && nome.length < 3) erros.push(`${rotulo}: informe o nome completo.`);
    if (!nascimentoValido(nascimento)) erros.push(`${rotulo}: informe uma data de nascimento válida.`);
    if (!telefone) erros.push(`${rotulo}: informe o telefone com DDD, por exemplo (11) 91234-5678.`);
    if (endereco.length < 5) erros.push(`${rotulo}: informe o endereço (rua, número e bairro).`);
    return { nome, nascimento, telefone: telefone ?? '', endereco };
  };

  const formando = pessoa('aluno', 'Seus dados', false);
  const escolha = v['qtd_acompanhantes'] ?? '';
  let qtd = parseInt(escolha, 10); // acompanhantes dentro do direito (0 a 3)
  let pedido = 0; // vagas a mais pedidas
  if (escolha === 'mais') {
    qtd = VAGAS_POR_ALUNO;
    pedido = parseInt(v['qtd_extras_pedido'] ?? '', 10);
    if (isNaN(pedido) || pedido < 1 || pedido > MAX_EXTRAS_PEDIDO) {
      erros.push(`Diga quantas pessoas a mais vai levar (de 1 a ${MAX_EXTRAS_PEDIDO}).`);
      pedido = 0;
    }
  }
  const acomps: ReturnType<typeof pessoa>[] = [];
  if (isNaN(qtd) || qtd < 0 || qtd > VAGAS_POR_ALUNO) {
    erros.push('Escolha quantos acompanhantes vai levar.');
  } else {
    for (let i = 1; i <= qtd + pedido; i++) acomps.push(pessoa(`acomp${i}`, `Acompanhante ${i}`, true, formando.endereco));
  }
  if (erros.length > 0) {
    return c.html(
      <FormInscricao escola={escola} aluno={aluno} usuario={c.get('usuario')} erros={erros} valores={v} />
    );
  }

  // Tudo numa transação: a inscrição só vale se este pedido marcou o aluno,
  // e as fichas só entram se o código gravado for o deste pedido.
  const codigo = gerarCodigo();
  const db = c.env.DB;
  const resultados = await db.batch([
    // Vagas a mais: concede o que houver sobrando na escola, depois de reservar o
    // que a fila de espera aguarda, no mesmo comando (sem disputa entre pedidos).
    db.prepare(
      `UPDATE alunos SET inscrito_em = datetime('now'), qtd_acompanhantes = ?, telefone = ?, endereco = ?,
         data_nascimento = ?, codigo = ?,
         qtd_extras = MAX(0, MIN(?, ${SQL_SALDO_LIVRE})),
         qtd_espera = ? - MAX(0, MIN(?, ${SQL_SALDO_LIVRE})),
         espera_desde = CASE WHEN ? > MAX(0, MIN(?, ${SQL_SALDO_LIVRE})) THEN datetime('now') END,
         extra_autorizado_por = CASE WHEN MAX(0, MIN(?, ${SQL_SALDO_LIVRE})) > 0 THEN 'Vagas sobrando (automático)' END
       WHERE id = ? AND inscrito_em IS NULL`
    ).bind(
      qtd, formando.telefone, formando.endereco, formando.nascimento, codigo,
      pedido, escola.id,
      pedido, pedido, escola.id,
      pedido, pedido, escola.id,
      pedido, escola.id,
      aluno.id
    ),
    db.prepare(
      'DELETE FROM acompanhantes WHERE aluno_id = ? AND EXISTS (SELECT 1 FROM alunos WHERE id = ? AND codigo = ?)'
    ).bind(aluno.id, aluno.id, codigo),
    ...acomps.map((a, i) =>
      db.prepare(
        `INSERT INTO acompanhantes (aluno_id, ordem, nome, endereco, data_nascimento, telefone, situacao)
         SELECT ?, ?, ?, ?, ?, ?,
           CASE WHEN ? <= qtd_acompanhantes + qtd_extras THEN 'confirmado' ELSE 'espera' END
         FROM alunos WHERE id = ? AND codigo = ?`
      ).bind(aluno.id, i + 1, a.nome, a.endereco, a.nascimento, a.telefone, i + 1, aluno.id, codigo)
    ),
  ]);
  if (!resultados[0].meta.changes) return c.redirect(`/e/${escola.slug}/inscrever/${aluno.id}`);

  await registrarAuditoria(db, {
    acao: 'inscricao_publica',
    aluno_id: aluno.id,
    escola_id: escola.id,
    detalhe: pedido > 0 ? `${qtd} acompanhante(s) + pediu ${pedido} vaga(s) a mais` : `${qtd} acompanhante(s)`,
  });
  return c.redirect(`/c/${codigo}`);
});

// ---------- Confirmação ----------
publicRoutes.get('/c/:codigo', async (c) => {
  const aluno = await c.env.DB.prepare('SELECT * FROM alunos WHERE codigo = ?')
    .bind(c.req.param('codigo'))
    .first<Aluno>();
  if (!aluno || !aluno.inscrito_em) return c.notFound();
  const escola = await c.env.DB.prepare('SELECT * FROM escolas WHERE id = ?')
    .bind(aluno.escola_id)
    .first<Escola>();
  if (!escola) return c.notFound();

  const acompanhantes = aluno.qtd_acompanhantes + aluno.qtd_extras;
  const pessoas = 1 + acompanhantes;
  const todas = await acompanhantesDoAluno(c.env.DB, aluno.id);
  const fichas = todas.filter((f) => f.situacao === 'confirmado');
  const emEspera = todas.filter((f) => f.situacao === 'espera');
  const semFicha = Math.max(0, acompanhantes - fichas.length);
  const whatsappOficial = await lerConfig(c.env.DB, 'whatsapp_oficial');
  const localEvento = await lerConfig(c.env.DB, 'local_evento');
  const dataEvento = escola.data_cerimonia
    ? formatarCerimonia(escola, true).replace(/^./, (l) => l.toUpperCase())
    : await lerConfig(c.env.DB, 'data_evento');

  return c.html(
    <Layout titulo="Inscrição confirmada" usuario={c.get('usuario')}>
      <main class="wrap wrap-estreito">
        <div class="ticket">
          <div class="ticket-topo">
            <p class="kicker">Inscrição confirmada</p>
            <h1>{aluno.nome}</h1>
            <p class="sub">
              {aluno.turma ? `${aluno.turma} · ` : ''}
              {escola.nome}
            </p>
          </div>
          <div class="ticket-corte">
            <i></i>
          </div>
          <div class="ticket-corpo">
            <div class="ticket-kg">
              <b>
                {pessoas} {pessoas === 1 ? 'litro' : 'litros'}
              </b>
              <span>de leite — 1 litro por pessoa, depositado na caixa da escola na entrada da cerimônia</span>
            </div>

            {aluno.qtd_espera > 0 && (
              <div class="msg msg-aviso espera-aviso">
                <b>
                  Pedido de {aluno.qtd_espera} vaga{aluno.qtd_espera === 1 ? '' : 's'} a mais em espera
                </b>
                {emEspera.length > 0 && <span> ({emEspera.map((f) => f.nome).join(', ')})</span>}. No momento
                ainda estamos fechando as turmas. Se abrirem vagas, a comissão fala com você
                {aluno.telefone ? ` pelo ${formatarTelefone(aluno.telefone)}` : ''}.
              </div>
            )}

            <dl class="dados">
              <dt>Pessoas</dt>
              <dd>
                {pessoas} ({acompanhantes} acompanhante{acompanhantes === 1 ? '' : 's'} + você)
                {(fichas.length > 0 || semFicha > 0) && (
                  <span class="nomes">
                    {fichas.map((f) => (
                      <span>{f.nome}</span>
                    ))}
                    {semFicha > 0 && (
                      <span>
                        + {semFicha} convidado{semFicha === 1 ? '' : 's'} sem ficha
                      </span>
                    )}
                  </span>
                )}
              </dd>
              <dt>Local</dt>
              <dd>{localEvento}</dd>
              <dt>Quando</dt>
              <dd>{dataEvento}</dd>
              <dt>Código</dt>
              <dd class="codigo">{aluno.codigo}</dd>
            </dl>

            <div class="linha-acoes nao-imprime">
              {escola.link_grupo_whatsapp && (
                <a class="botao botao-verde botao-largo-mobile" href={escola.link_grupo_whatsapp}>
                  <IconeWhats /> Grupo da formatura
                </a>
              )}
              {whatsappOficial && (
                <a class="botao botao-borda botao-largo-mobile" href={whatsappOficial}>
                  <IconeWhats /> WhatsApp do projeto
                </a>
              )}
              <button class="botao botao-borda botao-largo-mobile" type="button" onclick="window.print()">
                Salvar / imprimir
              </button>
            </div>

            <p class="ajuda" style="margin-top:18px">
              Guarde este link — ele é o seu comprovante. Qualquer dúvida, fale com a comissão de
              formatura da sua escola.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
});
