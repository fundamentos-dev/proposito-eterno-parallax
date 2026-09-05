// Traduz as animações do Keynote para transformações SVG.
//
// O deck usa quatro formas de entrada, e cada uma tem um desenho de movimento próprio —
// é isso que dá o ritmo da narrativa. Os valores-chave vêm direto do arquivo do Keynote:
//
//   fade   opacidade 0 -> 1
//   pop    escala [0,001 · 1,125 · 0,952 · 1] — cresce passando do alvo e assenta
//   queda  deslocamento vertical [-816 · 0 · -190 · 0] — cai, bate, quica e assenta
//   giro   rotação em Y [-1,571 · 0,233 · -0,05 · 0] rad — vira como uma placa
//
// Além disso, na virada de slide o Keynote faz "magic move": objetos deslizam ou crescem.
// É assim que a ponte verde se parte (a peça do meio desliza 510px) e que o círculo
// da igreja cresce 15,4x de um ponto até o tamanho cheio.

// Interpola uma lista de valores-chave igualmente espaçados, suavizando cada trecho.
export function chave(valores, t) {
  if (!valores || !valores.length) return 0;
  if (valores.length === 1) return valores[0];
  const n = valores.length - 1;
  const p = Math.min(Math.max(t, 0), 1) * n;
  const i = Math.min(Math.floor(p), n - 1);
  const f = p - i;
  const suave = f * f * (3 - 2 * f);
  return valores[i] + (valores[i + 1] - valores[i]) * suave;
}

export const suavizar = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Estado visual de uma camada num dado ponto da narrativa.
// `avanco` é 0 antes de entrar e 1 quando a entrada terminou.
export function estado(camada, avanco, cursor) {
  const cx = camada.x + camada.w / 2;
  const cy = camada.y + camada.h / 2;
  const partes = [];
  let opacidade = 1;

  const tipo = camada.entrada ? camada.entrada.tipo : 'fade';
  const ch = camada.entrada && camada.entrada.chaves;

  if (avanco <= 0) return { opacidade: 0, transform: '' };

  if (tipo === 'pop') {
    const s = chave(ch || [0.001, 1.125, 0.952, 1], avanco);
    partes.push(`translate(${cx},${cy}) scale(${s.toFixed(4)}) translate(${-cx},${-cy})`);
    opacidade = Math.min(1, avanco * 2.5);
  } else if (tipo === 'queda') {
    const dy = chave(ch || [-816, 0, -190, 0], avanco);
    partes.push(`translate(0,${dy.toFixed(2)})`);
  } else if (tipo === 'giro') {
    // rotação em Y não existe em SVG 2D; a projeção de uma placa girando é o cosseno
    const ang = chave(ch || [-Math.PI / 2, 0.233, -0.05, 0], avanco);
    const s = Math.max(Math.abs(Math.cos(ang)), 0.02);
    partes.push(`translate(${cx},${cy}) scale(${s.toFixed(4)},1) translate(${-cx},${-cy})`);
    opacidade = Math.min(1, avanco / 0.52);
  } else {
    opacidade = suavizar(avanco);
  }

  // magic move das viradas de slide — um objeto pode passar por mais de uma
  for (const t of camada.transicoes || []) {
    const f = suavizar(Math.min(Math.max(cursor - t.passo + 1, 0), 1));
    if (f <= 0) continue;
    const sx = 1 + ((t.sx ?? 1) - 1) * f;
    const sy = 1 + ((t.sy ?? t.sx ?? 1) - 1) * f;
    partes.push(`translate(${((t.dx || 0) * f).toFixed(2)},${((t.dy || 0) * f).toFixed(2)})`);
    if (sx !== 1 || sy !== 1) {
      partes.push(`translate(${cx},${cy}) scale(${sx.toFixed(4)},${sy.toFixed(4)}) translate(${-cx},${-cy})`);
    }
  }

  return { opacidade, transform: partes.join(' ') };
}
