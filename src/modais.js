function posicionaModal(modal, palco, quadro) {
  const matriz = palco.getScreenCTM();
  const inicio = new DOMPoint(quadro.x, quadro.y).matrixTransform(matriz);
  const fim = new DOMPoint(quadro.x + quadro.w, quadro.y + quadro.h).matrixTransform(matriz);
  const larguraTela = document.documentElement.clientWidth;
  const alturaTela = document.documentElement.clientHeight;
  const largura = fim.x - inicio.x;
  const altura = fim.y - inicio.y;
  // Amplia o painel em telas estreitas, mantendo espaço para a legenda no rodapé.
  const compacto = largura < (quadro.compacto ?? 380) || altura < 220;
  const larguraPainel = compacto ? Math.min(larguraTela - 24, Math.max(largura, 420)) : largura;
  const esquerda = compacto ? (larguraTela - larguraPainel) / 2 : inicio.x;
  const topo = compacto ? Math.max(12, Math.min(inicio.y, alturaTela * 0.15)) : Math.max(0, inicio.y);
  const reserva = compacto ? Math.min(180, alturaTela * 0.32) : Math.min(144, alturaTela * 0.28);
  const limiteAltura = alturaTela - topo - reserva;
  const alturaPainel = compacto ? limiteAltura : Math.min(fim.y - topo, limiteAltura);
  const origem = new DOMPoint(quadro.origem.x, quadro.origem.y).matrixTransform(matriz);
  Object.assign(modal.style, {
    left: `${esquerda}px`,
    top: `${topo}px`,
    width: `${larguraPainel}px`,
    height: `${alturaPainel}px`,
  });
  modal.style.setProperty('--origem-modal', `${origem.x - esquerda}px ${origem.y - topo}px`);
  modal.style.setProperty('--altura-legenda', `${alturaTela - topo - alturaPainel - 30}px`);
}

function conectaModal(modal, acionadores, palco, quadro, aoAbrir) {
  let ultimoAcionador;
  const texto = modal.querySelector('.modal-estudo__texto');
  const folha = modal.querySelector('.modal-estudo__folha');
  const posicionar = () => posicionaModal(modal, palco, quadro);
  let entrada;

  function abrir(acionador) {
    if (modal.open || acionador.getAttribute('aria-disabled') === 'true') return;
    ultimoAcionador = acionador;
    aoAbrir?.();
    modal.showModal();
    posicionar();
    if (texto) texto.scrollTop = 0;
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

export function montaModalArvore(palco, quadro) {
  const arvore = palco.querySelector('[data-asset="path4692"]');
  const modal = document.getElementById('modal-arvore');
  const prancha = modal.querySelector('.arvore-prancha');
  const secoes = modal.querySelectorAll('[data-desde]');
  const contador = modal.querySelector('output');
  const [anterior, proxima] = modal.querySelectorAll('[data-avanco]');
  const total = 4;
  let etapa = 1;
  let habilitada;

  function mostraEtapa(numero) {
    const foco = document.activeElement;
    etapa = Math.min(total, Math.max(1, numero));
    prancha.dataset.etapa = etapa;
    contador.value = `${etapa} / ${total}`;
    anterior.disabled = etapa === 1;
    proxima.disabled = etapa === total;
    for (const secao of secoes) secao.hidden = etapa < Number(secao.dataset.desde);
    if (foco === anterior && anterior.disabled) proxima.focus();
    if (foco === proxima && proxima.disabled) anterior.focus();
  }

  anterior.addEventListener('click', () => mostraEtapa(etapa - 1));
  proxima.addEventListener('click', () => mostraEtapa(etapa + 1));
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    mostraEtapa(etapa + (e.key === 'ArrowRight' ? 1 : -1));
  });

  arvore.setAttribute('aria-label', 'Árvore do Pecado Original');
  conectaModal(modal, [arvore], palco, quadro, () => mostraEtapa(1));
  return (valor) => {
    if (valor === habilitada) return;
    habilitada = valor;
    arvore.setAttribute('aria-disabled', String(!valor));
    arvore.setAttribute('tabindex', valor ? '0' : '-1');
  };
}
