// Correções manuais sobre os dados extraídos. Fica separado de src/scene/*.json porque
// aqueles são gerados: reextrair sobrescreve lá, não aqui.

import textosExtraidos from './scene/text.json';

const [linhaGenesis] = textosExtraidos.flowRoot4641.linhas;
const [linhaHebraica, ...linhasExplicativas] = textosExtraidos.image132.linhas;
const quadroAlvo = { x: 2315, y: 682, w: 154, h: 154 };

// Enquadra o estudo entre o contorno do desenho e a faixa da Justificação.
export const modais = {
  porta: { x: 171, y: 279, w: 1437, h: 872, origem: { x: 1785, y: 735 } },
  perfis: { x: 171, y: 279, w: 2303, h: 872 },
  arvore: { x: 1608, y: -62, w: 1155, h: 1213, origem: { x: 1195, y: 677 }, compacto: 330 },
};

// Título da cena: sobrescreve scene.json (usado como aria-label do SVG). O extraído do
// Keynote tem erro de digitação e o sufixo "- Animação", que não fazem sentido fora do deck.
export const titulo = 'Propósito Eterno de Deus';

// Geometria de texto: complementa os dados de src/scene/text.json.
export const geometria = {
  image132: {
    linhas: [{ ...linhaHebraica, x: linhaHebraica.x -10, ancora: 'end' }, ...linhasExplicativas],
  },
  flowRoot4641: {
    linhas: [0, 5.5, 11].map((deslocamento) => ({ ...linhaGenesis, y: linhaGenesis.y + deslocamento })),
  },
  flowRoot5933: { serif: true },
  flowRoot6261: { serif: true },
  // afasta "Mt 25:41" da borda vermelha da Geena
  text6327: { r: 54 },
  // no SVG do Inkscape este texto é preto, quase ilegível sobre o vermelho escuro;
  // no deck do Keynote (e no site em produção) ele é branco
  text6040: { fill: '#ffffff' },
  propositoDaSalvacao: {
    tipo: 'linhas',
    viewBox: [1020, 40],
    linhas: [{ x: 0, y: 0, size: 37 }],
    rot: 90,
    fill: '#6248ac',
  },
  legendaPorta: {
    tipo: 'linhas',
    viewBox: [190, 32],
    linhas: [{ x: 0, y: 0, size: 26 }],
    rot: -90,
    fill: '#142a19',
    serif: true,
  },
  legendaCaminho: {
    tipo: 'linhas',
    viewBox: [300, 50],
    linhas: [{ x: 150, y: 34, size: 30, ancora: 'middle' }],
    fill: '#142a19',
    serif: true,
  },
  legendaAlvo: {
    tipo: 'curvo',
    viewBox: [quadroAlvo.w, quadroAlvo.h],
    cx: quadroAlvo.w / 2,
    cy: quadroAlvo.h / 2,
    r: 112,
    a0: -90,
    arco: 112.5,
    ancora: 'middle',
    size: 27,
    fill: '#fff',
    serif: true,
  },
};

// Abre espaço entre o bloco de referências e o círculo da eternidade passada.
const deslocamentoDoBlocoHebraico = -174;
export const deslocamentosX = {
  image132: deslocamentoDoBlocoHebraico,
  flowRoot4641: deslocamentoDoBlocoHebraico,
};

// Passo de entrada: sobrescreve quando a ordem do deck não é a desejada.
//
// A numeração aqui é a da rolagem (0 é o primeiro passo). O deck tinha um passo morto
// entre a 1ª morte e a Geena — nada entrava nele —, então tudo o que vinha depois subiu
// uma casa e a eternidade futura entra no passo 16.
export const passos = {
  // Espírito, Alma e Corpo acompanham cada um a sua faixa roxa e o seu título
  flowRoot6067: 12,   // Espírito, com JUSTIFICAÇÃO
  flowRoot6140: 14,   // Alma, com SANTIFICAÇÃO
  flowRoot6175: 15,   // Corpo, com GLORIFICAÇÃO
  // path6060 é o remendo roxo que existe só para cobrir o círculo branco da Geena — o
  // branco delimita o fogo e não deve ficar à mostra. Ele acompanha a faixa que o
  // sustenta, a terceira.
  path6060: 15,
  // a Geena inteira (o passo morto que havia antes dela foi removido)
  circle4539: 10,
  circle5931: 10,
  circle5578: 10,
  text6327: 10,
  text6040: 10,
  // as chamas não têm animação própria no deck (quem anima é o grupo), então herdaram um
  // passo cedo demais e o fogo aparecia antes do círculo da Geena
  g5929: 10,
  // o título da 1ª morte e o thanatos pertencem à seta: entram com Gn 2:17, não antes dela
  flowRoot4797: 9,
  flowRoot4813: 9,
  // "A QUEDA · O PECADO" nomeia a seta vermelha: entra com ela, não um passo depois
  flowRoot5943: 7,
  // a cruz e o caminho verde que ela devolve
  'forma-127x506': 11,
  rect4678: 11,
  rect4680: 11,
  // o que a cruz significa entra com ela
  flowRoot5959: 11,
  // Ts 5:23 é o versículo das três colunas; só faz sentido quando a última fecha o trio
  flowRoot6124: 15,
  // a bola amarela da igreja, que já entra crescendo (ver `transicoes`), e os seus textos
  path4835: 13,
  circle4893: 13,
  text6005: 13,
  text6387: 13,
};

// Os perfis entram no passo 18 (slide 19), depois da porta e do alvo.
export const passosTotais = 19;

// Renumeração do "magic move": o círculo da igreja crescia no passo final, longe do
// texto que o nomeia. Ele passa a crescer no passo em que entra, junto com o texto.
export const transicoes = {
  path4835: { 17: 13 },
  circle4893: { 17: 13 },
};

// Camadas que não entram em cena. As três peças verdes que o Keynote trazia de volta
// logo depois do corte da ponte deixavam um trecho de caminho boiando entre a queda e a
// eternidade futura — sem apoio nenhum embaixo. O caminho só volta com a cruz.
export const remover = ['forma-672x108', 'forma-681x109', 'forma-643x101'];

// Fatias: um asset com vários desenhos vira várias camadas, cada uma com o seu passo.
// A ordem aqui é a de desenho — a faixa da direita primeiro, porque no original as da
// esquerda cobrem a emenda com a vizinha.
export const fatias = {
  'forma-1155x1681': [
    { grupos: [0], passo: 15 },   // faixa da direita  · Glorificação
    { grupos: [1], passo: 14 },   // faixa do meio     · Santificação
    { grupos: [2], passo: 12 },   // faixa da esquerda · Justificação
  ],
  flowRoot6020: [
    { linhas: [0], passo: 12 },      // JUSTIFICAÇÃO
    { linhas: [1, 2], passo: 14 },   // · SANTIFICAÇÃO
    { linhas: [3, 4], passo: 15 },   // · GLORIFICAÇÃO
  ],
};

// Camadas novas, que não vêm do deck.
export const extras = [
  { asset: 'propositoDaSalvacao', apos: 'flowRoot4633', passo: 4, x: 3000, y: 37, w: 1020, h: 40 },
  // nuvens dentro da eternidade futura; o círculo interno as recorta (ver `recortes`)
  { asset: 'nuvens', apos: 'circle6215', passo: 16, x: 2247, y: 322, w: 587, h: 587 },
  { asset: 'porta-da-cruz', apos: 'forma-127x506', passo: 17, entrada: { tipo: 'porta' }, x: 1741.46, y: 608.04, w: 338, h: 275 },
  { asset: 'alvo', apos: 'text6203', passo: 17, entrada: { tipo: 'zoom' }, ...quadroAlvo },
  { asset: 'legendaAlvo', apos: 'alvo', passo: 17, entrada: { tipo: 'zoom' }, ...quadroAlvo },
  { asset: 'legendaPorta', apos: 'text6005', passo: 17, x: 1730, y: 792, w: 190, h: 32 },
  { asset: 'legendaCaminho', apos: 'legendaPorta', passo: 17, x: 1919, y: 800, w: 300, h: 50 },
  { asset: 'perfis-pontos', apos: 'legendaCaminho', passo: 18, x: 1375, y: 737, w: 248, h: 213 },
];

// Ordem de camadas: joga um asset para trás de outro. (Nada por enquanto.)
export const ordem = {};

// Contornos: largura em unidades de palco. O círculo da Geena tem um contorno claro em
// produção que separa o fogo do roxo; no SVG do Inkscape ele ficou com `stroke:none`,
// embora a largura tenha sobrado no estilo.
export const contornos = {
  circle4539: { cor: '#ffffff', largura: 7 },
};

// A ponte verde é feita de peças repetidas. As da direita terminam ~8px mais baixas que as
// da esquerda, e o degrau no topo aparece também no site em produção (6px em 1920). Aqui ele
// é nivelado de propósito: as peças da direita são reancoradas na altura das da esquerda e o
// empurrão vertical da virada de slide é anulado (o deslocamento horizontal continua).
export const ponte = {
  aPartirDe: 1700,                       // só as peças à direita desta coordenada de palco
  nivelar: { path4731: 762, path4734: 770 },
  // Só as peças que deslizam saem de cena quando a queda acontece: são exatamente as que
  // a cruz devolve depois (rect4678/rect4680). Elas esmaecem ao longo do passo inteiro,
  // enquanto ainda deslizam, para o buraco abrir num movimento e não num corte. As que
  // chegam à eternidade futura ficam — o caminho não some inteiro, fica interrompido.
  saida: { passo: 7, janela: 1 },
  fim: 11,                               // as que ficaram dão lugar ao caminho da cruz
};

// Revelação: em vez de esmaecer, a camada é descoberta por uma faixa que desce sobre ela.
// A seta da queda é desenhada de cima para baixo, no sentido em que se lê a queda.
export const revelacoes = {
  'forma-1173x520': 'cima',
};

// Camadas com animação contínua (não ligada à rolagem).
export const continuas = {
  g5929: 'fogo',   // as chamas da Geena
};

// Recortes: uma camada é limitada pelo disco de outra. As chamas se moviam para fora da
// borda da Geena; o círculo vermelho passa a contê-las.
export const recortes = {
  g5929: { disco: 'circle4539' },
  nuvens: { disco: 'circle6215' },
};
