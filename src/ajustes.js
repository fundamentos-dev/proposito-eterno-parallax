// Correções manuais sobre os dados extraídos. Fica separado de src/scene/*.json porque
// aqueles são gerados: reextrair sobrescreve lá, não aqui.

// Geometria de texto: sobrescreve campos de src/scene/text.json.
export const geometria = {
  // afasta "Mt 25:41" da borda vermelha da Geena
  text6327: { r: 54 },
  // no SVG do Inkscape este texto é preto, quase ilegível sobre o vermelho escuro;
  // no deck do Keynote (e no site em produção) ele é branco
  text6040: { fill: '#ffffff' },
};

// Passo de entrada: sobrescreve quando a ordem do deck não é a desejada.
export const passos = {
  // Espírito, Alma e Corpo entram junto com Justificação · Santificação · Redenção
  flowRoot6067: 'flowRoot6020',
  flowRoot6140: 'flowRoot6020',
  flowRoot6175: 'flowRoot6020',
  // path6060 é o remendo roxo que existe só para cobrir o círculo branco da Geena — o
  // branco delimita o fogo e não deve ficar à mostra. Ele entrava dois passos depois das
  // colunas; agora entra junto com elas.
  path6060: 'forma-1155x1681',
  // as chamas não têm animação própria no deck (quem anima é o grupo), então herdaram um
  // passo cedo demais e o fogo aparecia antes do círculo da Geena
  g5929: 'circle4539',
};

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
};

// Camadas com animação contínua (não ligada à rolagem).
export const continuas = {
  g5929: 'fogo',   // as chamas da Geena
};

// Recortes: uma camada é limitada pelo disco de outra. As chamas se moviam para fora da
// borda da Geena; o círculo vermelho passa a contê-las.
export const recortes = {
  g5929: { disco: 'circle4539' },
};
