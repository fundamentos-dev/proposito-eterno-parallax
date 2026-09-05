// Controlador da narrativa: a rolagem avança os passos de revelação e move as camadas
// em profundidades diferentes (parallax). Setas, espaço e Home/End também navegam.
import './estilo.css';
import cena from './scene/cena.json';
import geometria from './scene/text.json';
import { textos, links } from './conteudo.js';
import { montaCena } from './render.js';

const palco = document.getElementById('palco-wrap');
const svg = montaCena(cena, geometria, textos, links);
palco.appendChild(svg);

const camadas = [...svg.querySelectorAll('.camada')].map((el) => {
  const passo = +el.dataset.passo;
  // profundidade: o que entra cedo é fundo e se move menos; o que entra depois vem à frente
  const profundidade = cena.passos > 1 ? passo / (cena.passos - 1) : 0;
  return { el, passo, profundidade, base: el.getAttribute('transform') };
});

const trilha = document.getElementById('trilha');
trilha.style.height = `${(cena.passos + 1) * 90}vh`;

const AMPLITUDE = 26;   // deslocamento máximo do parallax, em unidades de palco

function progresso() {
  const total = trilha.offsetHeight - window.innerHeight;
  return total > 0 ? Math.min(Math.max(window.scrollY / total, 0), 1) : 0;
}

function pinta(p) {
  const cursor = p * cena.passos;
  for (const c of camadas) {
    // cada camada abre ao longo de um passo; o passo 0 já nasce visível, como no Keynote
    const a = Math.min(Math.max(cursor - c.passo + 1, 0), 1);
    c.el.style.opacity = a;
    c.el.style.visibility = a <= 0.001 ? 'hidden' : 'visible';
    const desloc = (1 - a) * AMPLITUDE * (0.35 + c.profundidade);
    c.el.setAttribute('transform', `translate(0,${desloc.toFixed(2)}) ${c.base}`);
  }
  document.getElementById('passo-atual').textContent =
    `${Math.min(Math.floor(cursor) + 1, cena.passos)} / ${cena.passos}`;
}

// Repinta no máximo uma vez por quadro. Em aba oculta o requestAnimationFrame não roda,
// então ali a pintura é direta — assim o estado nunca fica preso esperando um quadro
// que não vem, e ao voltar para a aba a cena já está correta.
let quadro = 0;
function agenda() {
  if (document.hidden) { pinta(progresso()); return; }
  if (quadro) return;
  quadro = requestAnimationFrame(() => { quadro = 0; pinta(progresso()); });
}

addEventListener('scroll', agenda, { passive: true });
addEventListener('resize', agenda);
// ao voltar de uma aba em segundo plano não chega evento de scroll, e o rAF esteve parado
addEventListener('visibilitychange', () => { if (!document.hidden) agenda(); });

function vaiPara(passo) {
  const total = trilha.offsetHeight - window.innerHeight;
  const p = Math.min(Math.max(passo / cena.passos, 0), 1);
  scrollTo({ top: p * total, behavior: 'smooth' });
}
addEventListener('keydown', (e) => {
  const cursor = progresso() * cena.passos;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); vaiPara(Math.floor(cursor) + 1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); vaiPara(Math.ceil(cursor) - 1); }
  else if (e.key === 'Home') { e.preventDefault(); vaiPara(0); }
  else if (e.key === 'End') { e.preventDefault(); vaiPara(cena.passos); }
});

document.title = cena.titulo;
agenda();
pinta(0);
