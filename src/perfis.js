import { conectaAcionadores } from './modais.js';
import { suavizar } from './animacao.js';

const NS = 'http://www.w3.org/2000/svg';
const raio = 160;
const perfis = [
  { id: 'incredulo', nome: 'Incrédulo', centro: 'Eu', primeiroSetor: 'Casa' },
  { id: 'religioso', nome: 'Religioso', centro: 'Eu', primeiroSetor: 'Deus', referencias: 'Ap 3:15,16 · Mt 7:23 · Mt 6:1 · Mt 25:11,12' },
  { id: 'discipulo', nome: 'Discípulo', centro: 'Deus', primeiroSetor: 'Eu', referencias: 'Lc 14:26 · Lc 14:27,33 · Jo 8:31 · Jo 13:34-35 · Jo 15:8' },
];

function svgElemento(nome, atributos = {}, texto = '') {
  const elemento = document.createElementNS(NS, nome);
  for (const [chave, valor] of Object.entries(atributos)) elemento.setAttribute(chave, valor);
  if (texto) elemento.textContent = texto;
  return elemento;
}

function pontoNoCirculo(raio, angulo) {
  const radianos = angulo * Math.PI / 180;
  return [raio * Math.cos(radianos), raio * Math.sin(radianos)];
}

function montaCirculo({ id, nome, centro, primeiroSetor, referencias }) {
  const g = svgElemento('g', { class: 'perfil-circulo', 'data-perfil': id, role: 'group', 'aria-label': nome });
  const setores = [primeiroSetor, 'Família', 'Dinheiro', 'Etc.', 'Trabalho', 'Estudos', 'Sexo', 'Lazer'];
  const idArco = `perfil-arco-${id}`;
  const defs = svgElemento('defs');
  defs.appendChild(svgElemento('path', { id: idArco, d: 'M -137,0 A 137,137 0 0 1 137,0' }));
  g.append(
    defs,
    svgElemento('circle', { r: raio, class: 'perfil-anel' }),
    svgElemento('circle', { r: 132, class: 'perfil-setores' }),
  );

  for (const [i, setor] of setores.entries()) {
    const [x1, y1] = pontoNoCirculo(50, -135 + 45 * i);
    const [x2, y2] = pontoNoCirculo(132, -135 + 45 * i);
    const [x, y] = pontoNoCirculo(97, -112.5 + 45 * i);
    const xRotulo = setor === 'Trabalho' || setor === 'Estudos' ? x + Math.sign(x) * 4 : x;
    g.append(
      svgElemento('line', { x1, y1, x2, y2, class: 'perfil-divisoria' }),
      svgElemento('text', { x: xRotulo, y, dy: '0.33em', class: 'perfil-setor' }, setor),
    );
  }

  g.append(
    svgElemento('circle', { r: 50, class: 'perfil-centro' }),
    svgElemento('text', { dy: '0.33em', class: 'perfil-centro-nome' }, centro.toLocaleUpperCase('pt-BR')),
  );
  const titulo = svgElemento('text', { class: 'perfil-titulo' });
  titulo.appendChild(svgElemento('textPath', { href: `#${idArco}`, startOffset: '50%' }, nome.toLocaleUpperCase('pt-BR')));
  g.appendChild(titulo);
  if (referencias) {
    const idReferencias = `perfil-referencias-${id}`;
    defs.appendChild(svgElemento('path', { id: idReferencias, d: 'M -151,0 A 151,151 0 0 0 151,0' }));
    const faixa = svgElemento('text', { class: 'perfil-referencias' });
    faixa.appendChild(svgElemento('textPath', { href: `#${idReferencias}`, startOffset: '50%' }, referencias));
    g.appendChild(faixa);
  }
  return g;
}

function medeQuadro({ x, y, largura, altura }, vertical) {
  const margem = Math.min(20, largura * 0.05);
  const intervalo = Math.min(24, largura * 0.04);
  const barra = 26;
  const diametro = vertical
    ? Math.min(largura - 2 * margem, (altura - 2 * margem - barra - 2 * intervalo) / 3)
    : Math.min((largura - 2 * margem - 2 * intervalo) / 3, altura - 2 * margem - barra);
  const larguraOcupada = vertical ? diametro : 3 * diametro + 2 * intervalo;
  const alturaOcupada = vertical ? 3 * diametro + 2 * intervalo : diametro;
  const centros = perfis.map((_, i) => ({
    x: x + (largura - larguraOcupada + diametro) / 2 + (vertical ? 0 : i * (diametro + intervalo)),
    y: y + barra + (altura - barra - alturaOcupada + diametro) / 2 + (vertical ? i * (diametro + intervalo) : 0),
  }));
  return { centros, escala: diametro / (2 * raio) };
}

function posicao(x, y, escala) {
  return `translate(${x}px, ${y}px) scale(${escala})`;
}

const duracaoOrbita = 1700;

function animacaoOrbital(origens, destinos, escalaFinal, largura, altura) {
  const volta = 2 * Math.PI;
  const direcao = ([azul, , verde]) => Math.atan2(verde.y - azul.y, verde.x - azul.x);
  const eixo = direcao(destinos);
  const giro = volta + (eixo - direcao(origens) + volta) % volta;
  const centro = {
    x: origens.reduce((soma, p) => soma + p.x, 0) / origens.length,
    y: origens.reduce((soma, p) => soma + p.y, 0) / origens.length,
  };

  // O polo termina ao lado da fileira. Assim até o perfil do meio tem uma
  // órbita própria e continua se afastando do polo enquanto chega ao lugar.
  const recuo = Math.hypot(destinos[1].x - destinos[0].x, destinos[1].y - destinos[0].y) * 0.45;
  const polo = { x: destinos[1].x - recuo * Math.sin(eixo), y: destinos[1].y + recuo * Math.cos(eixo) };
  const orbitas = origens.map((origem, i) => {
    const dx = origem.x - centro.x;
    const dy = origem.y - centro.y;
    const fx = destinos[i].x - polo.x;
    const fy = destinos[i].y - polo.y;
    const fase = Math.atan2(dy, dx);
    // Escolhe o ângulo de chegada no mesmo giro do grupo.
    const ajuste = Math.atan2(fy, fx) - fase - giro;
    return {
      fase, arco: giro + Math.atan2(Math.sin(ajuste), Math.cos(ajuste)),
      inicio: Math.hypot(dx, dy), fim: Math.hypot(fx, fy),
    };
  });
  const escalaInicial = origens[0].escala;
  const quadros = origens.map(() => []);
  for (let i = 0; i <= 100; i++) {
    const t = suavizar(i / 100);
    const cx = centro.x + (polo.x - centro.x) * t;
    const cy = centro.y + (polo.y - centro.y) * t;
    const pontos = orbitas.map(({ fase, arco, inicio, fim }) => {
      const distancia = inicio * (fim / inicio) ** t;
      const angulo = fase + arco * t;
      return { x: cx + distancia * Math.cos(angulo), y: cy + distancia * Math.sin(angulo) };
    });

    const distancias = pontos.map((a, k) => {
      const b = pontos[(k + 1) % pontos.length];
      return Math.hypot(a.x - b.x, a.y - b.y);
    });
    const escala = Math.min(escalaInicial * (escalaFinal / escalaInicial) ** t, Math.min(...distancias) * 0.97 / (2 * raio));
    // Se uma borda se aproxima da janela, desloca o polo com o grupo inteiro.
    // Uma correção por círculo mudaria a distância entre as órbitas.
    const margem = escala * raio + 6;
    const ajusteNaTela = (coordenadas, limite) => {
      const minimo = margem - Math.min(...coordenadas);
      const maximo = limite - margem - Math.max(...coordenadas);
      return Math.min(Math.max(0, minimo), maximo);
    };
    const dx = ajusteNaTela(pontos.map(p => p.x), largura);
    const dy = ajusteNaTela(pontos.map(p => p.y), altura);
    pontos.forEach(({ x, y }, k) => quadros[k].push({
      transform: posicao(x + dx, y + dy, escala),
      opacity: 0.48 + 0.52 * t,
    }));
  }
  return quadros;
}

export function montaPerfis(palco, quadro) {
  const modal = document.getElementById('modal-perfis');
  const svg = modal.querySelector('svg');
  const fechar = modal.querySelector('.perfis-fechar');
  const papel = svgElemento('rect', { class: 'perfis-papel' });
  const circulos = perfis.map(montaCirculo);
  const pontos = perfis.map(({ id, nome }) => {
    const ponto = palco.querySelector(`[data-perfil="${id}"]`);
    ponto.setAttribute('aria-label', `${nome} — abrir comparação`);
    return ponto;
  });
  svg.append(papel, ...circulos);
  let acionador;

  function posicionar(origens) {
    const { x: esquerda, y: topo, width: largura, height: altura } = svg.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${largura} ${altura}`);
    const matriz = palco.getScreenCTM();
    const inicio = new DOMPoint(quadro.x, quadro.y).matrixTransform(matriz);
    const fim = new DOMPoint(quadro.x + quadro.w, quadro.y + quadro.h).matrixTransform(matriz);
    const compacto = largura < 650;
    const caixa = compacto
      ? { x: 12, y: 12, largura: largura - 24, altura: altura - 24 - Math.min(140, altura * 0.25) }
      : { x: inicio.x - esquerda, y: inicio.y - topo, largura: fim.x - inicio.x, altura: fim.y - inicio.y };
    const { x, y, largura: larguraQuadro, altura: alturaQuadro } = caixa;
    const vertical = compacto && altura > largura;
    const { centros, escala } = medeQuadro(caixa, vertical);
    papel.setAttribute('x', x);
    papel.setAttribute('y', y);
    papel.setAttribute('width', larguraQuadro);
    papel.setAttribute('height', alturaQuadro);
    fechar.style.left = `${x + larguraQuadro - 39}px`;
    fechar.style.top = `${y + 3}px`;
    modal.style.setProperty('--altura-legenda', `${altura - y - alturaQuadro - 30}px`);

    const locais = origens?.map(origem => ({
      x: origem.x + origem.width / 2 - esquerda,
      y: origem.y + origem.height / 2 - topo,
      escala: origem.width / (2 * raio),
    }));
    const quadros = locais && animacaoOrbital(locais, centros, escala, largura, altura);
    circulos.forEach((circulo, i) => {
      const destino = centros[i];
      circulo.style.transform = posicao(destino.x, destino.y, escala);
      if (quadros) circulo.animate(quadros[i], { duration: duracaoOrbita });
    });
    if (origens) {
      const entrada = { delay: duracaoOrbita - 230, duration: 230, fill: 'backwards', easing: 'ease-out' };
      papel.animate([{ opacity: 0 }, { opacity: 1 }], entrada);
      fechar.animate([{ opacity: 0 }, { opacity: 1 }], entrada);
    }
  }

  conectaAcionadores(modal, pontos, (ponto) => {
    if (modal.open) return;
    acionador = ponto;
    const origens = pontos.map((p) => p.getBoundingClientRect());
    modal.showModal();
    posicionar(matchMedia('(prefers-reduced-motion: reduce)').matches ? null : origens);
  });
  svg.addEventListener('click', (e) => { if (e.target === svg) modal.close(); });
  function cancelaAnimacoes() {
    for (const animacao of modal.getAnimations({ subtree: true })) animacao.cancel();
  }
  modal.addEventListener('close', () => {
    cancelaAnimacoes();
    acionador?.focus({ preventScroll: true });
  });
  addEventListener('resize', () => {
    if (!modal.open) return;
    cancelaAnimacoes();
    posicionar();
  });
}
