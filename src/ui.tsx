import type { Child, FC } from 'hono/jsx';
import type { SessUser } from './auth';

// Favicon provisório (quadrado com gradiente da identidade + capelo).
// Trocar pelo logo oficial quando ele for definido.
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%230B2A63'/%3E%3Cstop offset='.55' stop-color='%231546A8'/%3E%3Cstop offset='1' stop-color='%230F8F55'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='14' fill='url(%23g)'/%3E%3Cpath d='M32 16 8 26l24 10 24-10-24-10Z' fill='%23fff'/%3E%3Cpath d='M18 32v10c0 3.9 6.3 7 14 7s14-3.1 14-7V32l-14 5.8L18 32Z' fill='%23fff' opacity='.72'/%3E%3C/svg%3E";

export const CSS = `
:root {
  --azul: #1D5BD6;
  --azul-esc: #123A8C;
  --azul-noite: #0B2A63;
  --azul-suave: #EDF3FD;
  --azul-borda: #CBDDF6;
  --verde: #0F8F55;
  --verde-esc: #0A5C38;
  --verde-suave: #E6F6ED;
  --verde-borda: #B7E3CB;
  --menta: #7BE8B3;
  --bg: #F4F7FB;
  --card: #FFFFFF;
  --ink: #0F1D33;
  --muted: #5A6B84;
  --line: #DCE5EF;
  --erro: #B3372B;
  --erro-suave: #FCEDEA;
  --aviso: #8A5B0B;
  --aviso-suave: #FDF4DF;
  --anel: #93B9F5;

  --fonte: 'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --fonte-titulo: 'Bricolage Grotesque', 'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --largura: 1040px;
  --r-sm: 10px;
  --r: 14px;
  --r-lg: 20px;
  --r-xl: 28px;
  --sombra-1: 0 1px 2px rgba(15,29,51,.05), 0 2px 8px rgba(15,29,51,.05);
  --sombra-2: 0 2px 4px rgba(15,29,51,.05), 0 12px 28px rgba(15,29,51,.10);
  --sombra-3: 0 24px 60px rgba(11,42,99,.18);
  --grad: linear-gradient(135deg, #0B2A63 0%, #1546A8 46%, #0F8F55 118%);
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; color-scheme: light; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--fonte);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
::selection { background: #CFE1FB; color: var(--azul-esc); }
:focus-visible { outline: 3px solid var(--anel); outline-offset: 2px; border-radius: 6px; }
img, svg { max-width: 100%; }

h1, h2, h3 {
  font-family: var(--fonte-titulo);
  line-height: 1.15;
  letter-spacing: -0.025em;
  margin: 0 0 10px;
  font-weight: 800;
}
h1 { font-size: clamp(25px, 3.4vw, 34px); }
h2 { font-size: clamp(19px, 2.2vw, 23px); }
h3 { font-size: 16.5px; font-weight: 700; letter-spacing: -0.01em; }
p { margin: 0 0 14px; }
p:last-child { margin-bottom: 0; }
a { color: var(--azul); text-underline-offset: 3px; }

.kicker {
  font-size: 12px; font-weight: 800; letter-spacing: .14em;
  text-transform: uppercase; color: var(--verde-esc); margin: 0 0 6px;
}

/* ---------- Topo ---------- */
.topo { background: var(--grad); color: #fff; }
.topo-inner {
  max-width: var(--largura); margin: 0 auto; padding: 13px 20px;
  display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
}
.marca { color: #fff; text-decoration: none; display: block; line-height: 1.1; }
.marca strong { font-family: var(--fonte-titulo); font-size: 19px; font-weight: 800; letter-spacing: -0.03em; }
.marca strong span { color: var(--menta); }
.marca small {
  display: block; margin-top: 3px; font-size: 10px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase; color: rgba(255,255,255,.6);
}
.topo-nav { display: flex; align-items: center; gap: 4px; font-size: 14px; }
.topo-nav a, .topo-nav button {
  color: rgba(255,255,255,.88); text-decoration: none; font: inherit; font-weight: 700;
  background: none; border: none; cursor: pointer; padding: 7px 12px; border-radius: 99px;
  transition: background-color .15s ease, color .15s ease;
}
.topo-nav a:hover, .topo-nav button:hover { background: rgba(255,255,255,.14); color: #fff; }
.topo-nav form { margin: 0; display: inline; }
.topo-nav .sair { color: rgba(255,255,255,.62); }

/* ---------- Estrutura ---------- */
.wrap { width: 100%; max-width: var(--largura); margin: 0 auto; padding: 28px 20px 56px; flex: 1 0 auto; }
.wrap-estreito { max-width: 620px; }
.secao { width: 100%; max-width: var(--largura); margin: 0 auto; padding: 0 20px; }
.secao-cabeca { margin: 46px 0 18px; }
.secao-cabeca h2 { margin: 0; }
.secao-cabeca p { color: var(--muted); font-size: 14.5px; margin: 4px 0 0; }
.separador { border: none; border-top: 1px solid var(--line); margin: 26px 0; }

/* ---------- Hero ---------- */
.hero { background: var(--grad); color: #fff; position: relative; overflow: hidden; }
.hero::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(58% 78% at 8% 4%, rgba(123,232,179,.20), transparent 62%),
    radial-gradient(52% 72% at 96% 18%, rgba(96,164,255,.30), transparent 66%);
}
.hero::after {
  content: ''; position: absolute; inset: 0; opacity: .12;
  background-image: radial-gradient(rgba(255,255,255,.7) 1px, transparent 1px);
  background-size: 22px 22px;
  -webkit-mask-image: linear-gradient(to bottom, #000, transparent 72%);
  mask-image: linear-gradient(to bottom, #000, transparent 72%);
}
.hero-inner { position: relative; max-width: var(--largura); margin: 0 auto; padding: 52px 20px 76px; }
.hero h1 { font-size: clamp(30px, 5.6vw, 50px); max-width: 17ch; margin: 14px 0 0; letter-spacing: -0.035em; }
.hero h1 em { font-style: normal; color: var(--menta); }
.hero .lead { font-size: clamp(16px, 1.9vw, 18.5px); color: rgba(255,255,255,.84); max-width: 50ch; margin: 16px 0 0; }
.selo-topo {
  display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase; color: var(--menta);
  background: rgba(255,255,255,.10); border: 1px solid rgba(255,255,255,.22);
  padding: 6px 14px; border-radius: 99px;
}
.hero-acoes { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 30px; }
.hero-selos {
  display: flex; gap: 26px; flex-wrap: wrap; margin-top: 40px;
  padding-top: 26px; border-top: 1px solid rgba(255,255,255,.18);
}
.hero-selos div { min-width: 120px; }
.hero-selos b { display: block; font-family: var(--fonte-titulo); font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
.hero-selos span { font-size: 13px; color: rgba(255,255,255,.7); }

/* Faixa de página interna (mais discreta que o hero) */
.faixa-pagina { background: var(--grad); color: #fff; position: relative; overflow: hidden; }
.faixa-pagina::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(60% 100% at 92% 0%, rgba(123,232,179,.22), transparent 68%);
}
.faixa-inner { position: relative; max-width: var(--largura); margin: 0 auto; padding: 30px 20px 34px; }
.faixa-inner.estreito { max-width: 620px; }
.faixa-inner h1 { margin: 6px 0 0; color: #fff; }
.faixa-inner .lead { color: rgba(255,255,255,.8); font-size: 14.5px; margin: 8px 0 0; }
.faixa-inner .kicker { color: var(--menta); }
.volta { color: rgba(255,255,255,.78); text-decoration: none; font-weight: 700; font-size: 14px; }
.volta:hover { color: #fff; }
.faixa-inner a:not(.volta):not(.botao) {
  color: #fff; font-weight: 700; text-decoration: underline; text-decoration-color: rgba(255,255,255,.45);
  text-underline-offset: 3px; word-break: break-all;
}

/* Conteúdo que sobe por cima do hero / da faixa */
.sobreposto { margin-top: -46px; position: relative; z-index: 2; }
.puxa-cima { margin-top: -42px; position: relative; z-index: 2; }
.secao-final { padding-bottom: 60px; }

/* ---------- Cartões ---------- */
.cartao {
  background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg);
  padding: 24px; margin-bottom: 18px; box-shadow: var(--sombra-1);
}
.cartao > :last-child { margin-bottom: 0; }
.cartao-verde { border-top: 4px solid var(--verde); }
.cartao-azul { border-top: 4px solid var(--azul); }
.cartao-destaque { box-shadow: var(--sombra-2); }

.grade { display: grid; gap: 16px; }
.grade-3 { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
.grade-2 { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }

/* Passos */
.passo {
  background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg);
  padding: 22px; box-shadow: var(--sombra-1);
}
.passo .n {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 12px; margin-bottom: 12px;
  background: var(--azul-suave); color: var(--azul-esc);
  font-family: var(--fonte-titulo); font-weight: 800; font-size: 17px;
}
.passo.passo-verde .n { background: var(--verde-suave); color: var(--verde-esc); }
.passo h3 { margin-bottom: 5px; }
.passo p { color: var(--muted); font-size: 14.5px; margin: 0; }

/* Cartão de escola */
.escola-card {
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 8px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg);
  padding: 22px; text-decoration: none; color: inherit; box-shadow: var(--sombra-1);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.escola-card::before { content: ''; position: absolute; inset: 0 0 auto; height: 4px; background: var(--grad); }
.escola-card:hover { transform: translateY(-3px); box-shadow: var(--sombra-2); border-color: var(--azul-borda); }
.escola-card h3 { margin: 6px 0 0; font-family: var(--fonte-titulo); font-size: 18px; font-weight: 800; }
.escola-card .meta { color: var(--muted); font-size: 13.5px; }
.escola-card .seta {
  margin-top: 12px; color: var(--azul); font-weight: 800; font-size: 14.5px;
  display: inline-flex; align-items: center; gap: 6px;
}
.escola-card:hover .seta { gap: 10px; }
.escola-card .seta span { transition: none; }

/* Faixa verde de impacto */
.faixa-verde {
  background: linear-gradient(120deg, var(--verde-esc) 0%, var(--verde) 100%);
  color: #fff; border-radius: var(--r-xl); padding: 30px; box-shadow: var(--sombra-2);
  display: flex; gap: 26px; align-items: center; flex-wrap: wrap;
}
.faixa-verde h2 { color: #fff; margin: 0 0 6px; }
.faixa-verde p { color: rgba(255,255,255,.86); margin: 0; max-width: 58ch; font-size: 15px; }
.faixa-verde .num {
  font-family: var(--fonte-titulo); font-size: 46px; font-weight: 800; line-height: 1;
  letter-spacing: -0.03em; flex: 0 0 auto;
}
.faixa-verde .num small { display: block; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .8; margin-top: 6px; }

/* ---------- Botões ---------- */
.botao {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--azul); color: #fff; border: 1.5px solid transparent; border-radius: 11px;
  padding: 12px 20px; min-height: 46px; font: inherit; font-weight: 800; font-size: 15px;
  letter-spacing: -0.01em; text-decoration: none; cursor: pointer; text-align: center;
  box-shadow: 0 1px 2px rgba(15,29,51,.10), 0 4px 12px rgba(29,91,214,.18);
  transition: background-color .15s ease, transform .12s ease, box-shadow .15s ease;
}
.botao:hover { background: var(--azul-esc); }
.botao:active { transform: translateY(1px); box-shadow: 0 1px 2px rgba(15,29,51,.12); }
.botao-verde { background: var(--verde); box-shadow: 0 1px 2px rgba(15,29,51,.10), 0 4px 12px rgba(15,143,85,.22); }
.botao-verde:hover { background: var(--verde-esc); }
.botao-borda { background: #fff; color: var(--azul-esc); border-color: var(--azul-borda); box-shadow: var(--sombra-1); }
.botao-borda:hover { background: var(--azul-suave); border-color: var(--azul); }
.botao-claro { background: rgba(255,255,255,.12); color: #fff; border-color: rgba(255,255,255,.4); box-shadow: none; }
.botao-claro:hover { background: rgba(255,255,255,.22); }
.botao-perigo { background: #fff; color: var(--erro); border-color: #E4B7B1; box-shadow: none; }
.botao-perigo:hover { background: var(--erro-suave); }
.botao-largo { display: flex; width: 100%; }
.botao-min { padding: 8px 14px; min-height: 38px; font-size: 13.5px; }
.botao[disabled] { opacity: .55; cursor: not-allowed; }

/* ---------- Formulários ---------- */
label { display: block; font-weight: 700; font-size: 14.5px; margin: 18px 0 6px; }
label .opcional { font-weight: 500; color: var(--muted); }
input[type=text], input[type=tel], input[type=email], input[type=password],
input[type=number], input[type=date], input[type=url], select, textarea {
  width: 100%; border: 1.5px solid var(--line); border-radius: 11px;
  padding: 12px 14px; font: inherit; font-size: 16px; background: #fff; color: var(--ink);
  transition: border-color .15s ease, box-shadow .15s ease;
}
input:hover, select:hover, textarea:hover { border-color: #C3D2E3; }
input:focus, select:focus, textarea:focus {
  outline: none; border-color: var(--azul); box-shadow: 0 0 0 4px rgba(29,91,214,.14);
}
textarea { min-height: 84px; }
select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5l5-5' stroke='%235A6B84' stroke-width='1.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; background-size: 12px; padding-right: 38px; }
.ajuda { font-size: 13.5px; color: var(--muted); margin-top: 6px; }
.linha-acoes { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 20px 0 0; }
.wrap > .linha-acoes { margin-bottom: 18px; }

/* Busca com ícone */
.busca-form { display: flex; gap: 10px; }
.busca-caixa { position: relative; flex: 1; }
.busca-caixa svg { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.busca-caixa input { padding-left: 44px; }
.busca-grande input { min-height: 54px; font-size: 17px; }

/* Opções em cartão (acompanhantes) */
.opcoes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 6px; }
.opcao {
  position: relative; border: 1.5px solid var(--line); border-radius: var(--r); background: #fff;
  padding: 14px 10px; text-align: center; cursor: pointer; display: block;
  transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease;
  margin: 0; font-weight: 600;
}
.opcao:hover { border-color: var(--verde-borda); background: #FAFDFB; }
.opcao input {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0;
  overflow: hidden; white-space: nowrap; clip: rect(0 0 0 0); clip-path: inset(50%);
}
.opcao b { display: block; font-family: var(--fonte-titulo); font-size: 24px; font-weight: 800; line-height: 1.1; }
.opcao span { display: block; font-size: 12.5px; color: var(--muted); font-weight: 600; margin-top: 2px; }
/* Regras separadas de propósito: se o navegador não entender :has(),
   ele descarta só aquela regra e a classe .marcada (via JS) continua valendo. */
.opcao.marcada { border-color: var(--verde); background: var(--verde-suave); box-shadow: 0 0 0 3px rgba(15,143,85,.14); }
.opcao.marcada b { color: var(--verde-esc); }
.opcao:has(input:checked) { border-color: var(--verde); background: var(--verde-suave); box-shadow: 0 0 0 3px rgba(15,143,85,.14); }
.opcao:has(input:checked) b { color: var(--verde-esc); }
.opcao:has(input:focus-visible) { outline: 3px solid var(--anel); outline-offset: 2px; }
.opcao:focus-within { outline: 3px solid var(--anel); outline-offset: 2px; }

.concordo {
  display: flex; gap: 12px; align-items: flex-start; margin: 20px 0 0;
  background: var(--azul-suave); border: 1px solid var(--azul-borda);
  border-radius: var(--r); padding: 14px 16px; font-weight: 600; font-size: 14.5px; line-height: 1.5;
}
.concordo input { width: 20px; height: 20px; flex: 0 0 auto; margin: 2px 0 0; accent-color: var(--verde); }

/* ---------- Mensagens ---------- */
.msg {
  border-radius: var(--r); padding: 13px 16px; margin-bottom: 16px;
  font-size: 14.5px; font-weight: 600; border: 1px solid transparent;
}
.msg-ok { background: var(--verde-suave); color: var(--verde-esc); border-color: var(--verde-borda); }
.msg-erro { background: var(--erro-suave); color: var(--erro); border-color: #EFC9C2; }
.msg-aviso { background: var(--aviso-suave); color: var(--aviso); border-color: #EFD9A6; }

/* ---------- KPIs ---------- */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(158px, 1fr)); gap: 12px; margin-bottom: 20px; }
.kpi {
  position: relative; overflow: hidden; background: var(--card); border: 1px solid var(--line);
  border-radius: var(--r); padding: 15px 16px 14px 19px; box-shadow: var(--sombra-1);
}
.kpi::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--azul); }
.kpi.kpi-verde::before { background: var(--verde); }
.kpi b {
  display: block; font-family: var(--fonte-titulo); font-size: 28px; font-weight: 800;
  letter-spacing: -0.03em; line-height: 1.1; color: var(--azul-esc); font-variant-numeric: tabular-nums;
}
.kpi.kpi-verde b { color: var(--verde-esc); }
.kpi span { display: block; font-size: 12.5px; color: var(--muted); line-height: 1.35; margin-top: 5px; }

/* ---------- Tabela ---------- */
.tabela-scroll {
  overflow-x: auto; background: var(--card); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sombra-1);
}
table { border-collapse: collapse; width: 100%; font-size: 14.5px; }
th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--line); white-space: nowrap; }
th { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); background: #F7FAFD; font-weight: 800; }
tr:last-child td { border-bottom: none; }
tbody tr:hover td, tr:hover td { background: #F8FBFF; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
td a { font-weight: 700; text-decoration: none; }
td a:hover { text-decoration: underline; }
.quebra { white-space: normal; min-width: 180px; }
.so-mobile { display: none; }

/* ---------- Etiquetas ---------- */
.etiqueta {
  display: inline-block; border-radius: 99px; padding: 3px 11px;
  font-size: 12px; font-weight: 800; letter-spacing: -0.01em; white-space: nowrap;
}
.etiqueta-verde { background: var(--verde-suave); color: var(--verde-esc); }
.etiqueta-cinza { background: #EDF1F6; color: var(--muted); }
.etiqueta-azul { background: var(--azul-suave); color: var(--azul-esc); }
.etiqueta-aviso { background: var(--aviso-suave); color: var(--aviso); }

/* ---------- Filtros (segmentado) ---------- */
.filtros {
  display: inline-flex; flex-wrap: wrap; gap: 4px; background: #fff; border: 1px solid var(--line);
  border-radius: 99px; padding: 4px; margin-bottom: 16px; box-shadow: var(--sombra-1);
}
.filtros a {
  text-decoration: none; font-weight: 700; font-size: 13.5px; padding: 8px 15px;
  border-radius: 99px; color: var(--muted); transition: background-color .15s ease, color .15s ease;
}
.filtros a:hover { background: var(--azul-suave); color: var(--azul-esc); }
.filtros a.ativo { background: var(--azul); color: #fff; }
.filtros a.ativo:hover { background: var(--azul-esc); color: #fff; }

.barra-filtro {
  display: flex; gap: 12px; align-items: center; justify-content: space-between;
  flex-wrap: wrap; margin-bottom: 16px;
}
.barra-filtro .filtros { margin-bottom: 0; }
.barra-filtro .busca-form { flex: 1 1 260px; max-width: 380px; }

/* ---------- Lista de resultados ---------- */
.lista { border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; background: #fff; }
.resultado {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 16px; border-bottom: 1px solid var(--line);
}
.resultado:last-child { border-bottom: none; }
.resultado:hover { background: #F8FBFF; }
.resultado > div:first-child { min-width: 0; }
.resultado .botao, .resultado .etiqueta { flex: 0 0 auto; white-space: nowrap; }
.resultado .nome { font-weight: 800; letter-spacing: -0.01em; }
.resultado .turma { color: var(--muted); font-size: 13.5px; }

/* ---------- Ingresso (confirmação) ---------- */
.ticket {
  background: #fff; border: 1px solid var(--line); border-radius: var(--r-xl);
  overflow: hidden; box-shadow: var(--sombra-2); margin-bottom: 18px;
}
.ticket-topo { background: var(--grad); color: #fff; padding: 26px 26px 24px; position: relative; overflow: hidden; }
.ticket-topo::after {
  content: ''; position: absolute; inset: 0; opacity: .13;
  background-image: radial-gradient(rgba(255,255,255,.8) 1px, transparent 1px); background-size: 20px 20px;
}
.ticket-topo .kicker { color: var(--menta); position: relative; }
.ticket-topo h1 { position: relative; margin: 0; font-size: clamp(24px, 4.6vw, 32px); }
.ticket-topo .sub { position: relative; margin: 8px 0 0; color: rgba(255,255,255,.82); font-size: 14.5px; }
.ticket-corte { position: relative; height: 24px; background: #fff; }
.ticket-corte::before, .ticket-corte::after {
  content: ''; position: absolute; top: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--bg);
}
.ticket-corte::before { left: -12px; }
.ticket-corte::after { right: -12px; }
.ticket-corte i {
  position: absolute; left: 18px; right: 18px; top: 50%;
  border-top: 2px dashed var(--line); display: block;
}
.ticket-corpo { padding: 4px 26px 28px; }
.ticket-kg {
  background: var(--verde-suave); border: 1.5px dashed var(--verde-borda); border-radius: var(--r-lg);
  padding: 22px 18px; text-align: center; margin: 6px 0 22px;
}
.ticket-kg b {
  display: block; font-family: var(--fonte-titulo); font-size: clamp(40px, 11vw, 54px);
  font-weight: 800; letter-spacing: -0.04em; line-height: 1; color: var(--verde-esc);
}
.ticket-kg span { display: block; margin-top: 8px; color: var(--verde-esc); font-weight: 600; font-size: 14px; }
.dados { display: grid; grid-template-columns: auto 1fr; gap: 10px 18px; font-size: 15px; align-items: baseline; }
.dados dt { color: var(--muted); font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.dados dd { margin: 0; font-weight: 600; }
.codigo { font-family: var(--mono); font-weight: 700; letter-spacing: .12em; }

/* ---------- Rodapé ---------- */
.rodape { background: #fff; border-top: 1px solid var(--line); margin-top: auto; }
.rodape-inner {
  max-width: var(--largura); margin: 0 auto; padding: 26px 20px 34px;
  display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap;
  color: var(--muted); font-size: 13.5px;
}
.rodape-inner b { color: var(--ink); }
.rodape-inner a { color: var(--muted); text-decoration: none; font-weight: 700; }
.rodape-inner a:hover { color: var(--azul); }

/* ---------- Responsivo ---------- */
@media (min-width: 520px) {
  .opcoes { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 620px) {
  .hero-inner { padding: 40px 20px 64px; }
  .hero-selos { gap: 18px; margin-top: 30px; }
  .cartao, .passo, .escola-card { padding: 20px; }
  .faixa-verde { padding: 24px; gap: 18px; }
  .ticket-topo, .ticket-corpo { padding-left: 20px; padding-right: 20px; }
  .wrap { padding: 22px 16px 48px; }
  .secao { padding: 0 16px; }
  th, td { padding: 11px 12px; }
  .botao-largo-mobile { display: flex; width: 100%; }
  .so-mobile { display: block; }
  .barra-filtro .busca-form { max-width: none; }
}

@media print {
  .topo, .rodape, .linha-acoes, .nao-imprime { display: none !important; }
  body { background: #fff; }
  .ticket { box-shadow: none; border: 1px solid #999; }
  .ticket-corte::before, .ticket-corte::after { background: #fff; }
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
    <circle cx="9" cy="9" r="6.25" stroke="#5A6B84" stroke-width="1.8" />
    <path d="m13.7 13.7 3.3 3.3" stroke="#5A6B84" stroke-width="1.8" stroke-linecap="round" />
  </svg>
);

export const Layout: FC<{
  titulo: string;
  descricao?: string;
  usuario?: SessUser | null;
  children?: Child;
}> = (props) => {
  const descricao =
    props.descricao ??
    'Formatura gratuita para escolas públicas de Itaquaquecetuba. O ingresso é 1 kg de alimento não perecível por pessoa, entregue no dia da cerimônia.';
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
        <meta name="theme-color" content="#0B2A63" />
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
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&display=swap"
        />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <header class="topo">
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
              <br />O ingresso é 1 kg de alimento não perecível por pessoa, entregue no dia.
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
