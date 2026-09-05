// Correções manuais sobre os dados extraídos. Fica separado de src/scene/*.json porque
// aqueles são gerados: reextrair sobrescreve lá, não aqui.

// Geometria de texto: sobrescreve campos de src/scene/text.json.
export const geometria = {
  // afasta "Mt 25:41" da borda vermelha da Geena
  text6327: { r: 54 },
};

// Passo de entrada: sobrescreve quando a ordem do deck não é a desejada.
export const passos = {
  // Espírito, Alma e Corpo entram junto com Justificação · Santificação · Redenção
  flowRoot6067: 'flowRoot6020',
  flowRoot6140: 'flowRoot6020',
  flowRoot6175: 'flowRoot6020',
};

// Ordem de camadas: joga um asset para trás de outro.
export const ordem = {
  // o círculo branco existe só para delimitar o fogo; as colunas roxas o cobrem
  circle5578: { atrasDe: '973229BA-p3' },
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
