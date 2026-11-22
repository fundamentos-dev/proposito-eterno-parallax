import passagens from './legendas-biblicas.json';

const SVG = 'http://www.w3.org/2000/svg';
const referencias = Object.keys(passagens)
  .sort((a, b) => b.length - a.length)
  .map((ref) => ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const padrao = new RegExp(
  `(?<![\\p{L}\\d])(?:${referencias.join('|')})(?![\\p{L}\\d]|[,;–-]\\s*\\d)`,
  'gu',
);

function marcaReferencias(palco) {
  const referenciasMarcadas = [];
  for (const texto of palco.querySelectorAll('text')) {
    const walker = document.createTreeWalker(texto, NodeFilter.SHOW_TEXT);
    const nos = [];
    while (walker.nextNode()) nos.push(walker.currentNode);

    for (const no of nos) {
      const conteudo = no.data;
      const trechos = [...conteudo.matchAll(padrao)];
      if (!trechos.length) continue;
      const fragmento = document.createDocumentFragment();
      let fim = 0;
      for (const { 0: rotulo, index } of trechos) {
        fragmento.append(conteudo.slice(fim, index));
        const ref = document.createElementNS(SVG, 'tspan');
        ref.classList.add('referencia-biblica');
        ref.setAttribute('tabindex', '0');
        ref.setAttribute('aria-describedby', 'legenda-biblica');
        ref.textContent = rotulo;
        fragmento.appendChild(ref);
        referenciasMarcadas.push(ref);
        fim = index + rotulo.length;
      }
      fragmento.append(conteudo.slice(fim));
      no.replaceWith(fragmento);
    }
  }
  return referenciasMarcadas;
}

function faixaCurva(ref, tamanho) {
  const cima = [];
  const baixo = [];
  const total = ref.getNumberOfChars();
  for (let i = 0; i < total; i++) {
    const angulo = ref.getRotationOfChar(i) * Math.PI / 180;
    const pontos = [ref.getStartPositionOfChar(i)];
    if (i === total - 1) pontos.push(ref.getEndPositionOfChar(i));
    for (const { x, y } of pontos) {
      const normalX = -Math.sin(angulo);
      const normalY = Math.cos(angulo);
      cima.push(`${x - normalX * tamanho * 0.85},${y - normalY * tamanho * 0.85}`);
      baixo.push(`${x + normalX * tamanho * 0.28},${y + normalY * tamanho * 0.28}`);
    }
  }
  return `M ${[...cima, ...baixo.reverse()].join(' L ')} Z`;
}

function realca(ref, fundo) {
  const texto = ref.closest('text');
  const tamanho = parseFloat(getComputedStyle(ref).fontSize);
  if (ref.closest('textPath')) {
    fundo.setAttribute('d', faixaCurva(ref, tamanho));
  } else {
    const { x, y, width, height } = ref.getBBox();
    const margem = tamanho * 0.13;
    const esquerda = x - margem;
    const direita = x + width + margem;
    fundo.setAttribute('d', `M ${esquerda} ${y} H ${direita} V ${y + height} H ${esquerda} Z`);
  }
  fundo.setAttribute('transform', texto.getAttribute('transform') || '');
  texto.before(fundo);
}

function preencheLegenda(legenda, { versiculos, nota }) {
  const texto = document.createElement('p');
  let tamanhoTexto = 0;
  for (const versiculo of versiculos) {
    if (!versiculo) {
      texto.append(' (…) ');
      continue;
    }
    const [numero, conteudo] = versiculo;
    const indice = document.createElement('sup');
    indice.textContent = numero;
    texto.append(indice, ` ${conteudo} `);
    tamanhoTexto += conteudo.length;
  }
  legenda.dataset.extensao = tamanhoTexto > 1000 ? 'longa' : tamanhoTexto > 550 ? 'media' : 'curta';
  legenda.replaceChildren(texto);
  if (nota) {
    const rodape = document.createElement('small');
    rodape.textContent = nota;
    legenda.append(rodape);
  }
}

export function montaLegendas(palco, legenda) {
  const fundo = document.createElementNS(SVG, 'path');
  fundo.classList.add('realce-biblico');
  fundo.setAttribute('aria-hidden', 'true');
  let ativa;

  function fechar() {
    ativa?.classList.remove('ativa');
    ativa = null;
    fundo.remove();
    legenda.hidden = true;
  }

  function abrir(ref, toque = false) {
    if (ref === ativa) {
      if (toque) legenda.dataset.toque = 'true';
      return;
    }
    fechar();
    legenda.dataset.toque = String(toque);
    ativa = ref;
    realca(ref, fundo);
    ref.classList.add('ativa');
    preencheLegenda(legenda, passagens[ref.textContent]);
    legenda.hidden = false;
    legenda.scrollTop = 0;
  }

  for (const ref of marcaReferencias(palco)) {
    ref.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') abrir(ref); });
    ref.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch' && ativa === ref) fechar(); });
    ref.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') abrir(ref, true); });
    ref.addEventListener('focus', () => abrir(ref));
    ref.addEventListener('blur', () => { if (ativa === ref) fechar(); });
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  document.addEventListener('pointerdown', (e) => {
    if (ativa && !ativa.contains(e.target) && !legenda.contains(e.target)) fechar();
  });

  return () => {
    if (ativa?.closest('.camada')?.style.visibility === 'hidden') fechar();
  };
}
