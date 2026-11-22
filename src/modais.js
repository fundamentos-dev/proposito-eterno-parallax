function posicionaModal(modal, palco, quadro) {
  const matriz = palco.getScreenCTM();
  const inicio = new DOMPoint(quadro.x, quadro.y).matrixTransform(matriz);
  const fim = new DOMPoint(quadro.x + quadro.w, quadro.y + quadro.h).matrixTransform(matriz);
  const larguraTela = document.documentElement.clientWidth;
  const alturaTela = document.documentElement.clientHeight;
  const largura = fim.x - inicio.x;
  const altura = fim.y - inicio.y;
  // Amplia o painel em telas estreitas, mantendo espaço para a legenda no rodapé.
  const compacto = largura < 380 || altura < 220;
  const esquerda = Math.max(12, inicio.x);
  const topo = Math.max(12, compacto ? Math.min(inicio.y, alturaTela * 0.15) : inicio.y);
  const reserva = compacto ? Math.min(180, alturaTela * 0.32) : Math.min(144, alturaTela * 0.28);
  const limiteAltura = alturaTela - topo - reserva;
  const alturaPainel = compacto ? limiteAltura : Math.min(altura, limiteAltura);
  const origem = new DOMPoint(quadro.origem.x, quadro.origem.y).matrixTransform(matriz);
  Object.assign(modal.style, {
    left: `${esquerda}px`,
    top: `${topo}px`,
    width: `${Math.min(larguraTela - esquerda - 12, compacto ? Math.max(largura, 420) : largura)}px`,
    height: `${alturaPainel}px`,
  });
  modal.style.setProperty('--origem-modal', `${origem.x - esquerda}px ${origem.y - topo}px`);
  modal.style.setProperty('--altura-legenda', `${alturaTela - topo - alturaPainel - 30}px`);
}

function conectaModal(modal, acionadores, palco, quadro) {
  let ultimoAcionador;
  const texto = modal.querySelector('.modal-estudo__texto');
  const folha = modal.querySelector('.modal-estudo__folha');
  const posicionar = () => posicionaModal(modal, palco, quadro);
  let entrada;

  function abrir(acionador) {
    if (modal.open) return;
    ultimoAcionador = acionador;
    modal.showModal();
    posicionar();
    texto.scrollTop = 0;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      entrada = folha.animate([
        { transform: 'scale(0.12)', opacity: 0.1 },
        { transform: 'scale(1)', opacity: 1 },
      ], { duration: 290, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }
  }

  for (const acionador of acionadores) {
    acionador.classList.add('acionador-modal');
    acionador.setAttribute('role', 'button');
    acionador.setAttribute('tabindex', '0');
    acionador.setAttribute('aria-haspopup', 'dialog');
    acionador.setAttribute('aria-controls', modal.id);
    acionador.addEventListener('click', () => abrir(acionador));
    acionador.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      abrir(acionador);
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target !== modal) return;
    const { left, right, top, bottom } = modal.getBoundingClientRect();
    if (e.clientX < left || e.clientX > right || e.clientY < top || e.clientY > bottom) modal.close();
  });
  modal.addEventListener('close', () => {
    entrada?.cancel();
    ultimoAcionador?.focus({ preventScroll: true });
  });
  addEventListener('resize', () => { if (modal.open) posicionar(); });
}

export function montaModalPorta(palco, quadro) {
  const rotulo = palco.querySelector('[data-asset="legendaPorta"] text');
  const porta = palco.querySelector('[data-aciona-porta]');
  const modal = document.getElementById('modal-porta');
  const nome = rotulo.firstChild;
  const titulo = nome.data.split(' · ')[0];
  const palavra = document.createElementNS(rotulo.namespaceURI, 'tspan');
  palavra.textContent = titulo;
  nome.splitText(titulo.length);
  nome.replaceWith(palavra);

  porta.setAttribute('aria-label', 'Porta');
  conectaModal(modal, [palavra, porta], palco, quadro);
}
