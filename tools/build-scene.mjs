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

const objs = new Map();   // chave: asset + retângulo arredondado
for (const s of scene.slides) {
  for (const l of s.layers) {
    if (!l.svg && l.w >= scene.stage.width && l.h >= scene.stage.height) continue; // fundo branco
    const bruto = l.svg || `${s.id.slice(0, 8)}-p${l.pdfPage}`;
    const alvo = APELIDOS[bruto] || bruto;
    const asset = { tipo: l.svg || APELIDOS[bruto] ? 'inkscape' : 'keynote', id: alvo };
    const key = `${asset.id}|${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.w)}x${Math.round(l.h)}`;
    const step = offsets[s.index] + (l.step ?? 0);
    const prev = objs.get(key);
    if (prev) { prev.step = Math.min(prev.step, step); prev.z = Math.max(prev.z, l.z); continue; }
    objs.set(key, {
      asset, step, z: l.z, slide: s.index,
      x: l.x, y: l.y, w: l.w, h: l.h,
      rotation: l.rotation || undefined,
      opacity: l.opacity === 1 ? undefined : l.opacity,
      texto: text[alvo] ? true : undefined,
    });
  }
}

// Ordem de camadas: a referência é o slide mais completo, porque só nele a pilha inteira
// existe. Os objetos que não aparecem lá são intercalados logo após o último vizinho já
// posicionado no slide em que ocorrem — assim a ordem relativa de cada slide é respeitada.
const chaveDe = (id, l) => `${id}|${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.w)}x${Math.round(l.h)}`;
const idDe = (s, l) => { const b = l.svg || `${s.id.slice(0, 8)}-p${l.pdfPage}`; return APELIDOS[b] || b; };
const ehFundo = (l) => !l.svg && l.w >= scene.stage.width && l.h >= scene.stage.height;

const porSlide = scene.slides.map(s => ({
  s, chaves: s.layers.filter(l => !ehFundo(l)).map(l => chaveDe(idDe(s, l), l)),
}));
const ordemSlides = [...porSlide].sort((a, b) => b.chaves.length - a.chaves.length);

const ordem = [...ordemSlides[0].chaves];
for (const { chaves } of ordemSlides.slice(1)) {
  let ancora = -1;
  for (const k of chaves) {
    const at = ordem.indexOf(k);
    if (at >= 0) { ancora = at; continue; }
    ordem.splice(++ancora, 0, k);
  }
}
const posicao = new Map(ordem.map((k, i) => [k, i]));

const layers = [...objs.entries()]
  .sort((a, b) => (posicao.get(a[0]) ?? 1e9) - (posicao.get(b[0]) ?? 1e9))
  .map(([, v]) => v);
layers.forEach((l, i) => { l.z = i; });

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
