#!/usr/bin/env node
// Funde os 4 slides do Keynote numa cena única com uma linha do tempo contínua.
// Como 48 dos 50 objetos ocupam a mesma posição em todos os slides, os slides são
// estágios de revelação do mesmo desenho — não cenas diferentes.
// Também gera src/conteudo.js, o arquivo editável de textos.
import fs from 'fs';

const scene = JSON.parse(fs.readFileSync('src/scene/scene.json', 'utf8'));

// Dois textos em curva o Keynote redesenhou como forma própria, então chegam como vetor
// e não como texto. Aqui eles voltam a apontar para o bloco de texto do Inkscape
// correspondente — conferido por proporção do quadro e pela posição relativa entre os dois.
const APELIDOS = {
  '973229BA-p62': 'text6005',   // A ESTRATÉGIA · A IGREJA
  '973229BA-p61': 'text6387',   // Ef 4:11-16 · Cl 2:19
};
const text = JSON.parse(fs.readFileSync('src/scene/text.json', 'utf8'));

const offsets = [];
let acc = 0;
for (const s of scene.slides) { offsets.push(acc); acc += Math.max(s.buildCount, 1); }
const totalSteps = acc;

// Unificação dos objetos. Um mesmo objeto pode aparecer em vários slides em posições
// diferentes — é o "magic move" do Keynote movendo a MESMA peça, não peças diferentes.
// Tratar cada posição como um objeto novo empilharia cópias desalinhadas (era o que
// acontecia com a faixa verde). Então, ao encontrar uma transição, o objeto passa a ser
// procurado no slide seguinte já na posição de destino.
const TOLERANCIA = 14;
const objs = new Map();          // chave estável -> objeto
const vivos = [];                // { id, x, y, w, h, obj } com a posição corrente
let seq = 0;

const idDoAsset = (s, l) => {
  const bruto = l.svg || `${s.id.slice(0, 8)}-p${l.pdfPage}`;
  return APELIDOS[bruto] || bruto;
};

for (const s of scene.slides) {
  const tocados = new Set();
  for (const l of s.layers) {
    if (!l.svg && l.w >= scene.stage.width && l.h >= scene.stage.height) continue; // fundo branco
    const id = idDoAsset(s, l);
    const step = offsets[s.index] + (l.step ?? 0);

    let alvo = null, dist = Infinity;
    for (const v of vivos) {
      if (v.id !== id || tocados.has(v)) continue;
      const d = Math.abs(v.x - l.x) + Math.abs(v.y - l.y) + Math.abs(v.w - l.w) + Math.abs(v.h - l.h);
      if (d < dist) { dist = d; alvo = v; }
    }
    if (!alvo || dist > TOLERANCIA) {
      const obj = {
        chave: `o${seq++}`,
        asset: { tipo: l.svg || APELIDOS[l.svg || ''] ? 'inkscape' : 'keynote', id },
        step, z: l.z, slide: s.index,
        x: l.x, y: l.y, w: l.w, h: l.h,
        rotation: l.rotation || undefined,
        opacity: l.opacity === 1 ? undefined : l.opacity,
        texto: text[id] ? true : undefined,
        entrada: l.entrada || undefined,
        transicoes: [],
      };
      objs.set(obj.chave, obj);
      alvo = { id, x: l.x, y: l.y, w: l.w, h: l.h, obj };
      vivos.push(alvo);
    } else {
      alvo.obj.step = Math.min(alvo.obj.step, step);
      alvo.obj.z = l.z;
      alvo.obj.slide = s.index;
      if (!alvo.obj.entrada && l.entrada) alvo.obj.entrada = l.entrada;
    }
    tocados.add(alvo);

    if (l.transicao) {
      const t = { ...l.transicao, passo: offsets[s.index] + Math.max(s.buildCount, 1) };
      alvo.obj.transicoes.push(t);
      // o objeto passa a viver no destino, para casar com o slide seguinte
      const sx = t.sx ?? 1, sy = t.sy ?? t.sx ?? 1;
      const cx = alvo.x + alvo.w / 2 + (t.dx || 0);
      const cy = alvo.y + alvo.h / 2 + (t.dy || 0);
      alvo.w *= sx; alvo.h *= sy;
      alvo.x = cx - alvo.w / 2; alvo.y = cy - alvo.h / 2;
    }
  }
}

// Ordem de camadas: a referência é o slide mais completo, porque só nele a pilha inteira
// existe. Os objetos que não aparecem lá são intercalados logo após o último vizinho já
// posicionado no slide em que ocorrem — assim a ordem relativa de cada slide é respeitada.
// A ordem de camadas é a do último slide em que cada objeto aparece — é lá que a pilha
// está completa. O que só existe nos primeiros slides fica atrás, que é onde estava.
const layers = [...objs.values()].sort((a, b) => (a.slide - b.slide) || (a.z - b.z));
layers.forEach((l, i) => { l.z = i; });

const comMove = layers.filter(l => l.transicoes.length).length;
for (const l of layers) if (!l.transicoes.length) delete l.transicoes;
fs.writeFileSync('src/scene/cena.json', JSON.stringify({
  palco: scene.stage, titulo: scene.title, passos: totalSteps, camadas: layers,
}, null, 1));

// arquivo editável de conteúdo — gerado uma vez, depois é seu
if (!fs.existsSync('src/conteudo.js')) {
  const linhas = [];
  for (const [id, t] of Object.entries(text)) {
    const val = t.tipo === 'curvo' ? JSON.stringify(t.texto) : JSON.stringify(t.linhas.map(l => l.texto));
    linhas.push(`  // ${t.tipo === 'curvo' ? 'texto em caminho circular' : t.linhas.length + ' linha(s)'}\n  ${id}: ${val},`);
  }
  fs.writeFileSync('src/conteudo.js',
`// Os textos da cena. Edite aqui — a geometria (posição, corpo, curva) fica em
// src/scene/text.json e é gerada pelo tools/extract-text.mjs; este arquivo não é sobrescrito.
//
// Bloco reto: array com uma string por linha (mesma quantidade de linhas da geometria).
// Bloco curvo: uma string só.
export const textos = {
${linhas.join('\n')}
};

// Links opcionais: id do bloco -> URL. O bloco vira link, abrindo em outra aba.
export const links = {
  // flowRoot5943: 'https://exemplo.com/pregacao-a-queda',
};
`);
  console.log('src/conteudo.js criado (editável)');
}

console.log(`cena unificada: ${layers.length} camadas, ${totalSteps} passos de revelação`);
console.log(`  ${layers.filter(l => l.texto).length} camadas de texto, ${layers.filter(l => l.asset.tipo === 'keynote').length} formas nativas do Keynote`);
const tipos = {};
for (const l of layers) if (l.entrada) tipos[l.entrada.tipo] = (tipos[l.entrada.tipo] || 0) + 1;
console.log(`  entradas: ${Object.entries(tipos).map(([k, v]) => `${v} ${k}`).join(', ') || 'nenhuma'}`);
console.log(`  objetos com magic move: ${comMove}`);
