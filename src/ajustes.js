// Correções manuais sobre os dados extraídos. Fica separado de src/scene/*.json porque
// aqueles são gerados: reextrair sobrescreve lá, não aqui.

// Título da cena: sobrescreve scene.json (usado como aria-label do SVG). O extraído do
// Keynote tem erro de digitação e o sufixo "- Animação", que não fazem sentido fora do deck.
export const titulo = 'Propósito Eterno de Deus';

// Geometria de texto: sobrescreve campos de src/scene/text.json.
export const geometria = {
  // afasta "Mt 25:41" da borda vermelha da Geena
  text6327: { r: 54 },
  // no SVG do Inkscape este texto é preto, quase ilegível sobre o vermelho escuro;
  // no deck do Keynote (e no site em produção) ele é branco
  text6040: { fill: '#ffffff' },
};

// Passo de entrada: sobrescreve quando a ordem do deck não é a desejada.
//
// A numeração aqui é a da rolagem (0 é o primeiro passo). O deck tinha um passo morto
// entre a 1ª morte e a Geena — nada entrava nele —, então tudo o que vinha depois subiu
// uma casa e a narrativa terminou em 16 (ver `passosTotais`).
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

// Passos da narrativa. O deck vinha com 18; um passo morto saiu do meio.
export const passosTotais = 17;

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
  // nuvens dentro da eternidade futura; o círculo interno as recorta (ver `recortes`)
  { asset: 'nuvens', apos: 'circle6215', passo: 16, x: 2247, y: 322, w: 587, h: 587 },
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
