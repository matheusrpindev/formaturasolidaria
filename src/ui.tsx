import type { Child, FC } from 'hono/jsx';
import type { SessUser } from './auth';

// Favicon provisório (quadrado com gradiente da identidade + capelo).
// Trocar pelo logo oficial quando ele for definido.
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%230B1B33'/%3E%3Cstop offset='.55' stop-color='%230B1B33'/%3E%3Cstop offset='1' stop-color='%230F8F55'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='14' fill='%230B1B33'/%3E%3Cpath d='M32 16 8 26l24 10 24-10-24-10Z' fill='%23fff'/%3E%3Cpath d='M18 32v10c0 3.9 6.3 7 14 7s14-3.1 14-7V32l-14 5.8L18 32Z' fill='%23fff' opacity='.72'/%3E%3C/svg%3E";

export const CSS = `
:root {
  /* Tema escuro: azul quase preto de fundo, texto claro, verde vivo como única cor de ação. */
  --bg: #070F1C;
  --surface: #0D1828;
  --surface-2: #132238;
  --fg: #EEF2F7;
  --fg-2: #C4CDD9;
  --muted: #8C98AA;
  --line: #1A283C;
  --line-2: #2C3E57;
  --azul: #8AAEFF;
  --azul-esc: #B3C9FF;
  --azul-suave: #14254A;
  --verde: #2BC77E;
  --verde-esc: #52DA99;
  --sobre-verde: #04150C;
  --verde-suave: #0E2A20;
  --verde-borda: #1F5C42;
  --erro: #FF8E80;
  --erro-suave: #2D1517;
  --aviso: #F1C46D;
  --aviso-suave: #2A2211;
  --anel: #8AAEFF;

  --fonte: 'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --largura: 1120px;
  --r: 6px;
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; color-scheme: dark; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font-family: var(--fonte); font-size: 16px; line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  display: flex; flex-direction: column; min-height: 100vh;
}
::selection { background: #24427A; color: var(--fg); }
:focus-visible { outline: 2px solid var(--anel); outline-offset: 3px; }
img, svg, video { max-width: 100%; }

h1, h2, h3 { font-family: var(--fonte); line-height: 1.1; letter-spacing: -0.03em; margin: 0 0 10px; font-weight: 800; }
h1 { font-size: clamp(30px, 4.4vw, 48px); }
h2 { font-size: clamp(24px, 3vw, 34px); }
h3 { font-size: 18px; font-weight: 700; letter-spacing: -0.015em; }
p { margin: 0 0 14px; }
p:last-child { margin-bottom: 0; }
a { color: var(--azul); text-underline-offset: 3px; }

.kicker {
  font-size: 12px; font-weight: 700; letter-spacing: .16em;
  text-transform: uppercase; color: var(--muted); margin: 0 0 10px;
}

/* ---------- Topo ---------- */
.topo { background: var(--bg); color: var(--fg); border-bottom: 1px solid var(--line); }
.topo-inner {
  max-width: var(--largura); margin: 0 auto; padding: 18px 24px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.marca { color: inherit; text-decoration: none; display: block; line-height: 1.1; }
.marca strong { font-size: 17px; font-weight: 800; letter-spacing: -0.03em; }
.marca strong span { color: var(--verde); }
.marca small {
  display: block; margin-top: 3px; font-size: 10.5px; font-weight: 600;
  letter-spacing: .2em; text-transform: uppercase; color: var(--muted);
}
.topo-nav { display: flex; align-items: center; gap: 22px; font-size: 14.5px; }
.topo-nav a, .topo-nav button {
  color: inherit; text-decoration: none; font: inherit; font-weight: 600;
  background: none; border: none; cursor: pointer; padding: 6px 0; opacity: .8;
  border-bottom: 1.5px solid transparent; transition: opacity .15s ease, border-color .15s ease;
}
.topo-nav a:hover, .topo-nav button:hover { opacity: 1; border-bottom-color: currentColor; }
.topo-nav form { margin: 0; display: inline; }

/* Topo transparente sobre o vídeo (só na home) */
.topo-sobre { position: absolute; top: 0; left: 0; right: 0; z-index: 5; background: transparent; color: #fff; border-bottom: 1px solid rgba(255,255,255,.18); }
.topo-sobre .marca strong span { color: #fff; }
.topo-sobre .marca small { color: rgba(255,255,255,.72); }

/* ---------- Estrutura ---------- */
.wrap { width: 100%; max-width: var(--largura); margin: 0 auto; padding: 40px 24px 72px; flex: 1 0 auto; }
.wrap-estreito { max-width: 640px; }
.secao { width: 100%; max-width: var(--largura); margin: 0 auto; padding: 96px 24px 0; }
.secao-cabeca { margin: 0 0 36px; max-width: 640px; }
.secao-cabeca h2 { margin: 0; }
.secao-cabeca p { color: var(--muted); font-size: 16px; margin: 10px 0 0; }
.separador { border: none; border-top: 1px solid var(--line); margin: 28px 0; }
.sobreposto, .puxa-cima { margin-top: 0; }
.secao-final { padding-bottom: 112px; }

/* ---------- Hero com vídeo em loop ---------- */
.hero-video {
  position: relative; overflow: hidden; color: #fff; background: var(--bg);
  min-height: 100vh; min-height: 100svh; display: flex; align-items: flex-end;
}
.hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero-veu {
  position: absolute; inset: 0;
  background:
    linear-gradient(90deg, rgba(5,14,30,.62) 0%, rgba(5,14,30,.38) 55%, rgba(5,14,30,.12) 100%),
    linear-gradient(180deg, rgba(7,15,28,.35) 0%, rgba(7,15,28,0) 30%, rgba(7,15,28,.6) 82%, #070F1C 100%);
}
@media (max-width: 720px) {
  .hero-veu { background: linear-gradient(180deg, rgba(5,14,30,.35) 0%, rgba(5,14,30,.45) 40%, rgba(7,15,28,.85) 88%, #070F1C 100%); }
}
.hero-conteudo {
  position: relative; z-index: 2; width: 100%; max-width: var(--largura);
  margin: 0 auto; padding: 140px 24px 80px;
}
.hero-sobre { font-size: 15px; font-weight: 600; line-height: 1.5; color: rgba(255,255,255,.88); margin: 0 0 18px; }
.hero-titulo {
  font-size: clamp(46px, 11.5vw, 148px); font-weight: 800; line-height: .9;
  letter-spacing: -0.045em; text-transform: uppercase; margin: 0; color: #fff;
}
.hero-linhas { margin: 34px 0 0; font-size: clamp(16px, 1.7vw, 19px); font-weight: 500; max-width: 34ch; }
.hero-linhas p { margin: 0 0 6px; color: rgba(255,255,255,.92); }
.hero-acoes { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 36px; }

/* ---------- Faixa de página interna ---------- */
.faixa-pagina { background: var(--bg); border-bottom: 1px solid var(--line); }
.faixa-inner { max-width: var(--largura); margin: 0 auto; padding: 44px 24px 40px; }
.faixa-inner.estreito { max-width: 640px; }
.faixa-inner h1 { margin: 0; }
.faixa-inner .lead { color: var(--muted); font-size: 16px; margin: 12px 0 0; }
.faixa-inner .kicker { margin-top: 22px; }
.volta { color: var(--muted); text-decoration: none; font-weight: 600; font-size: 14px; }
.volta:hover { color: var(--fg); }
.faixa-inner a:not(.volta):not(.botao) { color: var(--azul); font-weight: 600; word-break: break-all; }

/* ---------- Cartões ---------- */
.cartao { background: var(--bg); border: 1px solid var(--line); border-radius: var(--r); padding: 28px; margin-bottom: 20px; }
.cartao > :last-child { margin-bottom: 0; }
.cartao-verde { border-top: 2px solid var(--verde); }
.cartao-azul { border-top: 2px solid var(--fg-2); }
.cartao-destaque { border-color: var(--line-2); }

.grade { display: grid; gap: 20px; }
.grade-3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 40px; }
.grade-2 { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }

/* Passos: colunas com linha no topo, sem caixa */
.passo { border-top: 1px solid var(--line-2); padding-top: 22px; }
.passo .n { display: block; font-size: 13px; font-weight: 700; letter-spacing: .14em; color: var(--muted); margin-bottom: 18px; font-variant-numeric: tabular-nums; }
.passo h3 { font-size: 21px; margin-bottom: 8px; }
.passo p { color: var(--muted); font-size: 15.5px; margin: 0; }

/* Lista de escolas: linhas simples */
.escolas-lista { border-top: 1px solid var(--line); }
.escola-card {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 26px 0; border-bottom: 1px solid var(--line); text-decoration: none; color: inherit;
}
.escola-card h3 { margin: 0; font-size: clamp(20px, 2.4vw, 26px); font-weight: 700; transition: color .15s ease; }
.escola-card .meta { color: var(--muted); font-size: 14.5px; margin-top: 4px; }
.escola-card .seta {
  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 10px;
  font-weight: 700; font-size: 14.5px; color: var(--fg); transition: gap .15s ease;
}
.escola-card:hover h3 { color: var(--verde); }
.escola-card:hover .seta { gap: 16px; }

/* Bloco do leite */
.faixa-verde { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 48px; align-items: end; border-top: 1px solid var(--line-2); padding-top: 32px; }
.faixa-verde .num { font-size: clamp(64px, 10vw, 128px); font-weight: 800; line-height: .9; letter-spacing: -0.05em; color: var(--verde); }
.faixa-verde .num small { display: block; font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); margin-top: 14px; }
.faixa-verde h2 { margin: 0 0 12px; }
.faixa-verde p { color: var(--fg-2); margin: 0; font-size: 16.5px; max-width: 52ch; }

/* ---------- Botões ---------- */
.botao {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--fg); color: var(--bg); border: 1.5px solid var(--fg); border-radius: var(--r);
  padding: 13px 24px; min-height: 48px; font: inherit; font-weight: 700; font-size: 15px;
  text-decoration: none; cursor: pointer; text-align: center;
  transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}
.botao:hover { background: #FFFFFF; border-color: #FFFFFF; }
.botao:active { transform: translateY(1px); }
.botao-verde { background: var(--verde); border-color: var(--verde); color: var(--sobre-verde); }
.botao-verde:hover { background: var(--verde-esc); border-color: var(--verde-esc); }
.botao-borda { background: transparent; color: var(--fg); border-color: var(--line-2); }
.botao-borda:hover { background: var(--surface-2); border-color: var(--fg-2); }
.botao-claro { background: transparent; color: #fff; border-color: rgba(255,255,255,.6); }
.botao-claro:hover { background: rgba(255,255,255,.12); border-color: #fff; }
.botao-branco { background: #fff; color: #070F1C; border-color: #fff; }
.botao-branco:hover { background: rgba(255,255,255,.88); border-color: rgba(255,255,255,.88); }
.botao-perigo { background: transparent; color: var(--erro); border-color: #6B3330; }
.botao-perigo:hover { background: var(--erro-suave); }
.botao-largo { display: flex; width: 100%; }
.botao-min { padding: 8px 14px; min-height: 38px; font-size: 13.5px; }
.botao[disabled] { opacity: .5; cursor: not-allowed; }

/* ---------- Formulários ---------- */
label { display: block; font-weight: 600; font-size: 14.5px; margin: 20px 0 8px; }
label .opcional { font-weight: 500; color: var(--muted); }
input[type=text], input[type=tel], input[type=email], input[type=password],
input[type=number], input[type=date], input[type=url], select, textarea {
  width: 100%; border: 1px solid var(--line-2); border-radius: var(--r);
  padding: 12px 14px; font: inherit; font-size: 16px; background: var(--surface); color: var(--fg);
  transition: border-color .15s ease, box-shadow .15s ease;
}
input:hover, select:hover, textarea:hover { border-color: #4A5E7A; }
input::placeholder, textarea::placeholder { color: var(--muted); opacity: 1; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--fg-2); box-shadow: 0 0 0 3px rgba(138,174,255,.18); }
textarea { min-height: 84px; }
select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5l5-5' stroke='%238C98AA' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; background-size: 12px; padding-right: 38px; }
.ajuda { font-size: 14px; color: var(--muted); margin-top: 8px; }
.linha-acoes { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 24px 0 0; }
.wrap > .linha-acoes { margin-bottom: 20px; }

.busca-form { display: flex; gap: 10px; }
.busca-caixa { position: relative; flex: 1; }
.busca-caixa svg { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.busca-caixa input { padding-left: 44px; }
.busca-grande input { min-height: 54px; font-size: 17px; }

/* Opções (acompanhantes) */
.opcoes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 6px; }
.opcao {
  position: relative; border: 1px solid var(--line-2); border-radius: var(--r); background: var(--surface);
  padding: 16px 10px; text-align: center; cursor: pointer; display: block; margin: 0; font-weight: 600;
  transition: border-color .15s ease, background-color .15s ease;
}
.opcao:hover { border-color: var(--fg-2); }
.opcao input {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0;
  overflow: hidden; white-space: nowrap; clip: rect(0 0 0 0); clip-path: inset(50%);
}
.opcao b { display: block; font-size: 26px; font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; }
.opcao span { display: block; font-size: 12.5px; color: var(--muted); font-weight: 500; margin-top: 2px; }
/* Regras separadas de propósito: se o navegador não entender :has(),
   ele descarta só aquela regra e a classe .marcada (via JS) continua valendo. */
.opcao.marcada { border-color: var(--verde); background: var(--verde-suave); box-shadow: inset 0 0 0 1px var(--verde); }
.opcao.marcada b { color: var(--verde); }
.opcao:has(input:checked) { border-color: var(--verde); background: var(--verde-suave); box-shadow: inset 0 0 0 1px var(--verde); }
.opcao:has(input:checked) b { color: var(--verde); }
.opcao:has(input:focus-visible) { outline: 2px solid var(--anel); outline-offset: 3px; }
.opcao:focus-within { outline: 2px solid var(--anel); outline-offset: 3px; }

/* Fichas da inscrição (formando e acompanhantes) */
.ficha { border: 1px solid var(--line-2); border-radius: var(--r); padding: 4px 20px 22px; margin: 24px 0 0; min-width: 0; }
.ficha:first-child { margin-top: 0; }
.ficha legend { padding: 0 8px; margin-left: -8px; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--verde); }
.ficha-nome { margin: 10px 0 0; color: var(--fg-2); }
.ficha-nome b { color: var(--fg); }
.ficha-nome span { color: var(--muted); }
.duas-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
.duas-col > div { min-width: 0; }
.check-linha { display: flex; gap: 10px; align-items: center; font-weight: 500; color: var(--fg-2); margin: 18px 0 0; cursor: pointer; }
.check-linha input { width: 18px; height: 18px; margin: 0; accent-color: var(--verde); flex: 0 0 auto; }
input[type=date] { color-scheme: dark; min-height: 48px; }
.lista-erros { margin: 8px 0 0; padding-left: 18px; font-weight: 500; }
.lista-erros li + li { margin-top: 4px; }
.dados dd .nomes { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; color: var(--fg-2); font-weight: 500; }
.dados dd .nomes span::before { content: '· '; color: var(--muted); }
.ficha-lista { display: grid; gap: 12px; margin: 10px 0 0; }
.ficha-item { border: 1px solid var(--line); border-radius: var(--r); padding: 14px 16px; }
.ficha-item b { display: block; }
.ficha-item .dados { margin-top: 8px; font-size: 14px; }

.concordo {
  display: flex; gap: 12px; align-items: flex-start; margin: 24px 0 0;
  background: var(--surface-2); border-radius: var(--r); padding: 16px 18px;
  font-weight: 500; font-size: 14.5px; line-height: 1.5;
}
.concordo input { width: 20px; height: 20px; flex: 0 0 auto; margin: 1px 0 0; accent-color: var(--verde); }

/* ---------- Mensagens ---------- */
.msg { border-radius: var(--r); padding: 14px 16px; margin-bottom: 18px; font-size: 14.5px; font-weight: 600; border-left: 3px solid transparent; }
.msg-ok { background: var(--verde-suave); color: var(--verde-esc); border-left-color: var(--verde); }
.msg-erro { background: var(--erro-suave); color: var(--erro); border-left-color: var(--erro); }
.msg-aviso { background: var(--aviso-suave); color: var(--aviso); border-left-color: #C9952E; }

/* ---------- KPIs ---------- */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0; margin-bottom: 28px; border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
.kpi { padding: 18px 20px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.kpi b { display: block; font-size: 30px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.1; color: var(--fg); font-variant-numeric: tabular-nums; }
.kpi.kpi-verde b { color: var(--verde); }
.kpi span { display: block; font-size: 13px; color: var(--muted); line-height: 1.35; margin-top: 6px; }

/* ---------- Tabela ---------- */
.tabela-scroll { overflow-x: auto; border-top: 1px solid var(--line-2); }
table { border-collapse: collapse; width: 100%; font-size: 14.5px; }
th, td { text-align: left; padding: 13px 14px; border-bottom: 1px solid var(--line); white-space: nowrap; }
th { font-size: 11.5px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); font-weight: 700; }
tbody tr:hover td, tr:hover td { background: var(--surface-2); }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
td a { font-weight: 700; text-decoration: none; }
td a:hover { text-decoration: underline; }
.quebra { white-space: normal; min-width: 180px; }
.so-mobile { display: none; }

/* ---------- Etiquetas ---------- */
.etiqueta { display: inline-block; border-radius: 4px; padding: 3px 9px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.etiqueta-verde { background: var(--verde-suave); color: var(--verde-esc); }
.etiqueta-cinza { background: var(--surface-2); color: var(--muted); }
.etiqueta-azul { background: var(--azul-suave); color: var(--azul-esc); }
.etiqueta-aviso { background: var(--aviso-suave); color: var(--aviso); }

/* ---------- Filtros ---------- */
.filtros { display: inline-flex; flex-wrap: wrap; gap: 22px; margin-bottom: 18px; border-bottom: 1px solid var(--line); }
.filtros a {
  text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 0; margin-bottom: -1px;
  color: var(--muted); border-bottom: 2px solid transparent; transition: color .15s ease, border-color .15s ease;
}
.filtros a:hover { color: var(--fg); }
.filtros a.ativo { color: var(--fg); border-bottom-color: var(--fg); }
.barra-filtro { display: flex; gap: 16px; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; margin-bottom: 18px; }
.barra-filtro .filtros { margin-bottom: 0; }
.barra-filtro .busca-form { flex: 1 1 260px; max-width: 380px; }

/* ---------- Lista de resultados ---------- */
.lista { border-top: 1px solid var(--line); }
.resultado { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--line); }
.resultado > div:first-child { min-width: 0; }
.resultado .botao, .resultado .etiqueta { flex: 0 0 auto; white-space: nowrap; }
.resultado .nome { font-weight: 700; }
.resultado .turma { color: var(--muted); font-size: 14px; }

/* ---------- Ingresso (confirmação) ---------- */
.ticket { background: var(--surface); border: 1px solid var(--line-2); border-radius: var(--r); overflow: hidden; margin-bottom: 20px; }
.ticket-topo { background: var(--surface-2); color: var(--fg); padding: 28px 28px 26px; }
.ticket-topo .kicker { color: var(--verde); }
.ticket-topo h1 { margin: 0; font-size: clamp(26px, 4.6vw, 34px); color: var(--fg); }
.ticket-topo .sub { margin: 8px 0 0; color: var(--fg-2); font-size: 15px; }
.ticket-corte { position: relative; height: 24px; background: var(--surface); }
.ticket-corte::before, .ticket-corte::after {
  content: ''; position: absolute; top: 0; width: 24px; height: 24px; border-radius: 50%;
  background: var(--bg); border: 1px solid var(--line-2);
}
.ticket-corte::before { left: -13px; }
.ticket-corte::after { right: -13px; }
.ticket-corte i { position: absolute; left: 20px; right: 20px; top: 50%; border-top: 1.5px dashed var(--line-2); display: block; }
.ticket-corpo { padding: 8px 28px 30px; }
.ticket-kg { border-bottom: 1px solid var(--line); padding: 14px 0 24px; margin: 0 0 22px; }
.ticket-kg b { display: block; font-size: clamp(48px, 12vw, 72px); font-weight: 800; letter-spacing: -0.05em; line-height: 1; color: var(--verde); }
.ticket-kg span { display: block; margin-top: 10px; color: var(--fg-2); font-weight: 500; font-size: 15px; }
.dados { display: grid; grid-template-columns: auto 1fr; gap: 12px 20px; font-size: 15px; align-items: baseline; }
.dados dt { color: var(--muted); font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.dados dd { margin: 0; font-weight: 600; }
.codigo { font-family: var(--mono); font-weight: 700; letter-spacing: .12em; }

/* ---------- Rodapé ---------- */
.rodape { background: var(--bg); border-top: 1px solid var(--line); margin-top: auto; }
.rodape-inner {
  max-width: var(--largura); margin: 0 auto; padding: 32px 24px 40px;
  display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  color: var(--muted); font-size: 13.5px;
}
.rodape-inner b { color: var(--fg); }
.rodape-inner a { color: var(--fg); text-decoration: none; font-weight: 600; }
.rodape-inner a:hover { text-decoration: underline; }

/* ---------- Responsivo ---------- */
@media (min-width: 520px) { .opcoes { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 720px) {
  .faixa-verde { grid-template-columns: 1fr; gap: 20px; }
  .secao { padding-top: 72px; }
}
@media (max-width: 620px) {
  .topo-inner { padding: 16px; }
  .topo-nav { gap: 16px; }
  .hero-conteudo { padding: 120px 16px 56px; }
  .hero-acoes .botao { width: 100%; }
  .cartao { padding: 20px; }
  .ticket-topo, .ticket-corpo { padding-left: 20px; padding-right: 20px; }
  .wrap { padding: 28px 16px 56px; }
  .secao { padding-left: 16px; padding-right: 16px; }
  .faixa-inner { padding: 32px 16px 30px; }
  .escola-card .seta b { display: none; }
  th, td { padding: 11px 10px; }
  .botao-largo-mobile { display: flex; width: 100%; }
  .so-mobile { display: block; }
  .barra-filtro .busca-form { max-width: none; }
  .duas-col { grid-template-columns: 1fr; }
  .ficha { padding: 2px 14px 18px; }
}

@media print {
  :root { --bg: #fff; --surface: #fff; --surface-2: #fff; --fg: #000; --fg-2: #222; --muted: #555; --line: #ccc; --line-2: #999; --verde: #0A6B3F; color-scheme: light; }
  .topo, .rodape, .linha-acoes, .nao-imprime { display: none !important; }
  body { background: #fff; }
  .ticket { border: 1px solid #999; }
  .ticket-topo { background: #fff; color: #000; border-bottom: 1px solid #999; }
  .ticket-topo h1, .ticket-topo .sub, .ticket-topo .kicker { color: #000; }
  .wrap { padding: 0; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
`;

// Marca as opções escolhidas mesmo em navegadores sem :has()
export const JS_OPCOES = `
document.addEventListener('change', function (e) {
  var alvo = e.target;
  if (!alvo || alvo.type !== 'radio' || !alvo.closest('.opcao')) return;
  var grupo = document.querySelectorAll('input[name="' + alvo.name + '"]');
  for (var i = 0; i < grupo.length; i++) {
    var cartao = grupo[i].closest('.opcao');
    if (cartao) cartao.classList.toggle('marcada', grupo[i].checked);
  }
});
`;

export const IconeBusca = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="9" cy="9" r="6.25" stroke="#8C98AA" stroke-width="1.8" />
    <path d="m13.7 13.7 3.3 3.3" stroke="#8C98AA" stroke-width="1.8" stroke-linecap="round" />
  </svg>
);

export const Layout: FC<{
  titulo: string;
  descricao?: string;
  usuario?: SessUser | null;
  /** Cabeçalho transparente por cima do vídeo (home). */
  topoSobre?: boolean;
  children?: Child;
}> = (props) => {
  const descricao =
    props.descricao ??
    'Formatura gratuita para escolas públicas de Itaquaquecetuba. O ingresso é 1 litro de leite por pessoa, entregue no dia da cerimônia.';
  const titulo = `${props.titulo} · Formaturas Solidárias`;
  // Título que aparece na prévia do link no WhatsApp.
  const tituloCompartilhado =
    props.titulo === 'Início' ? 'Formaturas Solidárias · Itaquaquecetuba' : titulo;
  return (
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{titulo}</title>
        <meta name="description" content={descricao} />
        <meta name="theme-color" content="#070F1C" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Formaturas Solidárias" />
        <meta property="og:title" content={tituloCompartilhado} />
        <meta property="og:description" content={descricao} />
        <meta property="og:locale" content="pt_BR" />
        <meta name="twitter:card" content="summary" />
        <link rel="icon" href={FAVICON} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <header class={props.topoSobre ? 'topo topo-sobre' : 'topo'}>
          <div class="topo-inner">
            {/* O logo oficial entra aqui quando for definido. */}
            <a class="marca" href="/">
              <strong>
                Formaturas <span>Solidárias</span>
              </strong>
              <small>Itaquaquecetuba</small>
            </a>
            <nav class="topo-nav">
              {props.usuario ? (
                <>
                  <a href={props.usuario.papel === 'admin' ? '/admin' : '/painel'}>Painel</a>
                  <a href="/senha">Senha</a>
                  <form method="post" action="/sair">
                    <button class="sair" type="submit">
                      Sair ({props.usuario.nome.split(' ')[0]})
                    </button>
                  </form>
                </>
              ) : (
                <a href="/entrar">Entrar</a>
              )}
            </nav>
          </div>
        </header>
        {props.children}
        <footer class="rodape">
          <div class="rodape-inner">
            <div>
              <b>Formaturas Solidárias</b> · Itaquaquecetuba
              <br />O ingresso é 1 litro de leite por pessoa, entregue no dia.
            </div>
            <div>
              Parceria Universidade Guarulhos e Inova Formaturas
              <br />
              {props.usuario ? <a href="/painel">Ir para o painel</a> : <a href="/entrar">Acesso da comissão e da direção</a>}
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
};

export const Kpi: FC<{ valor: string | number; rotulo: string; verde?: boolean }> = (p) => (
  <div class={p.verde ? 'kpi kpi-verde' : 'kpi'}>
    <b>{p.valor}</b>
    <span>{p.rotulo}</span>
  </div>
);

export const Msg: FC<{ tipo?: 'ok' | 'erro' | 'aviso'; children?: Child }> = (p) => (
  <div class={`msg msg-${p.tipo ?? 'ok'}`}>{p.children}</div>
);

/** Cabeçalho colorido para páginas internas (escola, inscrição, painel). */
export const FaixaPagina: FC<{
  kicker?: string;
  titulo: string;
  lead?: string;
  voltar?: { href: string; texto: string };
  estreito?: boolean;
  children?: Child;
}> = (p) => (
  <div class="faixa-pagina">
    <div class={p.estreito ? 'faixa-inner estreito' : 'faixa-inner'}>
      {p.voltar && (
        <a class="volta" href={p.voltar.href}>
          ← {p.voltar.texto}
        </a>
      )}
      {p.kicker && <p class="kicker">{p.kicker}</p>}
      <h1>{p.titulo}</h1>
      {p.lead && <p class="lead">{p.lead}</p>}
      {p.children}
    </div>
  </div>
);
