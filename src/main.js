// Controlador da narrativa. A rolagem percorre os passos; cada camada entra com a
// animação que o Keynote usava (ver src/animacao.js) e as viradas de slide aplicam o
// "magic move" — a ponte que se parte, o círculo da igreja que cresce.
import './estilo.css';
import cena from './scene/cena.json';
import geometria from './scene/text.json';
import { textos, links } from './conteudo.js';
import * as ajustes from './ajustes.js';
import { montaCena } from './render.js';
import { estado, suavizar, FRACAO_ENTRADA } from './animacao.js';

// correções manuais sobre os dados gerados (ver src/ajustes.js)
const geo = { ...geometria };
for (const [id, campos] of Object.entries(ajustes.geometria || {})) {
  if (geo[id]) geo[id] = { ...geo[id], ...campos };
}
for (const [id, alvo] of Object.entries(ajustes.passos || {})) {
  const c = cena.camadas.find((l) => l.asset.id === id);
  const ref = typeof alvo === 'string' ? cena.camadas.find((l) => l.asset.id === alvo) : null;
  const passo = ref ? ref.step : alvo;
  if (c && typeof passo === 'number') c.step = passo;
}
if (ajustes.ponte) {
  for (const c of cena.camadas) {
    const y = ajustes.ponte.nivelar[c.asset.id];
    if (y == null) continue;
    const xFinal = c.x + (c.transicoes || []).reduce((s, t) => s + (t.dx || 0), 0);
    if (xFinal < ajustes.ponte.aPartirDe) continue;
    c.y = y;
    if (c.transicoes) c.transicoes = c.transicoes.map((t) => ({ ...t, dy: 0 }));
    // A peça que desliza na virada é a que a cruz devolve depois. Ela sai deslizando para
    // a direita enquanto esmaece — o buraco abre num movimento, não num corte. As demais
    // ficam: o caminho não some inteiro, fica interrompido no ponto do corte.
    if (ajustes.ponte.saida && (c.transicoes || []).some((t) => t.dx)) {
      c.saida = ajustes.ponte.saida.passo;
      c.saidaJanela = ajustes.ponte.saida.janela;
    } else if (ajustes.ponte.fim != null) {
      // as que ficam saem no instante em que a cruz termina de trazer o caminho dela:
      // são o mesmo verde no mesmo lugar, e sobrepostas as bordas se somam
      c.fim = ajustes.ponte.fim;
    }
  }
}

// camadas que saem de cena de vez (ver src/ajustes.js)
if (ajustes.remover && ajustes.remover.length) {
  const fora = new Set(ajustes.remover);
  cena.camadas = cena.camadas.filter((c) => !fora.has(c.asset.id));
}

// fatias: um asset que traz vários desenhos (ou várias linhas de texto) vira N camadas,
// cada uma com o seu passo. É assim que as três faixas roxas — e os três títulos sobre
// elas — entram uma de cada vez, sem precisar recortar o arquivo original.
for (const [id, cortes] of Object.entries(ajustes.fatias || {})) {
  const i = cena.camadas.findIndex((l) => l.asset.id === id);
  if (i < 0) continue;
  const base = cena.camadas[i];
  cena.camadas.splice(i, 1, ...cortes.map((corte, k) => ({
    ...base,
    z: `${base.z}-${k}`,
    step: corte.passo,
    fatia: { linhas: corte.linhas, grupos: corte.grupos },
  })));
}

// camadas novas, que não vêm do deck (as nuvens da eternidade futura)
for (const extra of ajustes.extras || []) {
  const nova = {
    asset: { id: extra.asset }, z: extra.asset, step: extra.passo,
    x: extra.x, y: extra.y, w: extra.w, h: extra.h,
  };
  const i = extra.apos ? cena.camadas.findIndex((l) => l.asset.id === extra.apos) : -1;
  if (i >= 0) cena.camadas.splice(i + 1, 0, nova);
  else cena.camadas.push(nova);
}

// renumeração de "magic move" quando um passo vazio some da narrativa
for (const [id, mapa] of Object.entries(ajustes.transicoes || {})) {
  for (const c of cena.camadas) {
    if (c.asset.id !== id || !c.transicoes) continue;
    c.transicoes = c.transicoes.map((t) => ({ ...t, passo: mapa[t.passo] ?? t.passo }));
  }
}

if (ajustes.passosTotais != null) cena.passos = ajustes.passosTotais;

for (const [id, regra] of Object.entries(ajustes.ordem || {})) {
  const i = cena.camadas.findIndex((l) => l.asset.id === id);
  const j = cena.camadas.findIndex((l) => l.asset.id === regra.atrasDe);
  if (i >= 0 && j >= 0 && i > j) cena.camadas.splice(j, 0, ...cena.camadas.splice(i, 1));
}

const palco = document.getElementById('palco-wrap');
palco.appendChild(montaCena(cena, geo, textos, links, ajustes));

const PARALLAX = 14;   // unidades de palco

const camadas = [...palco.querySelectorAll('.camada')].map((el, i) => {
  const dados = cena.camadas[i];
  const revela = el.getAttribute('data-revela');
  return {
    el,
    dados,
    // a faixa que descobre a camada, quando ela entra por revelação (ver src/render.js)
    faixa: revela ? document.getElementById(revela).firstElementChild : null,
    passo: dados.step ?? 0,
    profundidade: cena.camadas.length > 1 ? i / (cena.camadas.length - 1) : 0,
  };
});

const trilha = document.getElementById('trilha');
trilha.style.height = `${(cena.passos + 1) * 85}vh`;

function progresso() {
  const total = trilha.offsetHeight - window.innerHeight;
  return total > 0 ? Math.min(Math.max(window.scrollY / total, 0), 1) : 0;
}

function pinta(p) {
  const cursor = p * cena.passos;
  for (const c of camadas) {
    const avanco = Math.min(Math.max((cursor - c.passo + 1) / FRACAO_ENTRADA, 0), 1);
    const { opacidade, transform } = estado(c.dados, avanco, cursor);
    // numa revelação a camada não esmaece: ela é descoberta de cima para baixo, e o que
    // avança é a borda da faixa que a recorta
    if (c.faixa) c.faixa.setAttribute('height', (c.dados.h * suavizar(avanco)).toFixed(2));
    c.el.style.opacity = c.faixa ? (avanco > 0 ? 1 : 0) : opacidade;
    c.el.style.visibility = c.el.style.opacity <= 0.002 ? 'hidden' : 'visible';
    // um leve deslocamento por profundidade dá relevo à rolagem sem competir com a animação
    const desloc = (1 - suavizar(avanco)) * PARALLAX * (0.3 + c.profundidade);
    c.el.setAttribute('transform', desloc > 0.01 ? `translate(0,${desloc.toFixed(2)}) ${transform}` : transform);
  }
  // no último passo o fogo da Geena congela: a cena vira quadro, não mais animação
  palco.firstElementChild.classList.toggle('parado', cursor >= cena.passos - 2 + FRACAO_ENTRADA);
  document.getElementById('passo-atual').textContent =
    `${Math.min(Math.round(cursor) + 1, cena.passos)} / ${cena.passos}`;
}

// Repinta no máximo uma vez por quadro. Em aba oculta o requestAnimationFrame não roda,
// então ali a pintura é direta — o estado nunca fica preso esperando um quadro que não vem.
let quadro = 0;
function agenda() {
  if (document.hidden) { pinta(progresso()); return; }
  if (quadro) return;
  quadro = requestAnimationFrame(() => { quadro = 0; pinta(progresso()); });
}

addEventListener('scroll', agenda, { passive: true });
addEventListener('resize', agenda);
addEventListener('visibilitychange', () => { if (!document.hidden) agenda(); });

// Navegação discreta: arredondar (e não truncar) evita o clique que não sai do lugar
// quando o cursor está logo acima de um passo inteiro.
function passoAtual() { return Math.round(progresso() * cena.passos); }
function vaiPara(passo) {
  const total = trilha.offsetHeight - window.innerHeight;
  const alvo = Math.min(Math.max(passo, 0), cena.passos);
  scrollTo({ top: (alvo / cena.passos) * total, behavior: 'smooth' });
}
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const teclas = {
    ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1,
    ArrowLeft: -1, ArrowUp: -1, PageUp: -1,
  };
  if (e.key in teclas) { e.preventDefault(); vaiPara(passoAtual() + teclas[e.key]); }
  else if (e.key === 'Home') { e.preventDefault(); vaiPara(0); }
  else if (e.key === 'End') { e.preventDefault(); vaiPara(cena.passos); }
});

document.title = cena.titulo;
agenda();
pinta(0);
