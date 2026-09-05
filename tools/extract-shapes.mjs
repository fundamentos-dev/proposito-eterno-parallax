#!/usr/bin/env node
// Alguns objetos do slide não vieram de SVG importado — são formas desenhadas no próprio
// Keynote. Para esses, exporto a página correspondente do PDF como SVG vetorial,
// em src/assets/kn/. O fundo branco de cada slide é ignorado.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

const KN = process.argv[2];
const scene = JSON.parse(fs.readFileSync('src/scene/scene.json', 'utf8'));
const OUT = 'src/assets/kn';
fs.mkdirSync(OUT, { recursive: true });

const need = new Map();
for (const s of scene.slides) {
  for (const l of s.layers) {
    if (l.svg || !l.pdfPage) continue;
    if (l.w >= scene.stage.width && l.h >= scene.stage.height) continue; // fundo do slide
    need.set(`${s.id}#${l.pdfPage}`, { slide: s.id, page: l.pdfPage, short: `${s.id.slice(0, 8)}-p${l.pdfPage}` });
  }
}
// A mesma forma costuma reaparecer em vários slides, exportada em páginas diferentes.
// Sem unificar por conteúdo o mesmo objeto vira dois — e é assim que a seta vermelha da
// queda acabava desenhada duas vezes, uma delas atrás do globo.
const tmp = fs.mkdtempSync('/tmp/pe-formas-');
const porHash = new Map();
const apelido = {};
for (const { slide, page, short } of need.values()) {
  const pdf = path.join(KN, slide, 'assets', `${slide}.pdf`);
  const bruto = path.join(tmp, `${short}.svg`);
  execFileSync('pdftocairo', ['-svg', '-f', String(page), '-l', String(page), pdf, bruto]);
  const conteudo = fs.readFileSync(bruto);
  const hash = crypto.createHash('sha1').update(conteudo).digest('hex').slice(0, 6);
  if (!porHash.has(hash)) {
    // nome legível: o tamanho identifica a forma de relance em src/ajustes.js
    const vb = conteudo.toString('utf8').match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/);
    const nome = vb ? `forma-${Math.round(+vb[1])}x${Math.round(+vb[2])}` : `forma-${hash}`;
    const unico = fs.existsSync(path.join(OUT, `${nome}.svg`)) ? `${nome}-${hash}` : nome;
    fs.writeFileSync(path.join(OUT, `${unico}.svg`), conteudo);
    porHash.set(hash, unico);
  }
  apelido[short] = porHash.get(hash);
}
fs.rmSync(tmp, { recursive: true, force: true });
const mantidos = new Set([...porHash.values()].map((n) => `${n}.svg`));
for (const f of fs.readdirSync(OUT)) if (!mantidos.has(f)) fs.rmSync(path.join(OUT, f));
fs.mkdirSync('src/scene', { recursive: true });
fs.writeFileSync('src/scene/formas.json', JSON.stringify(apelido, null, 1));

const repetidas = need.size - porHash.size;
console.log(`${porHash.size} formas nativas do Keynote em ${OUT}/` +
  (repetidas ? ` (${repetidas} eram repetição da mesma forma em outro slide)` : ''));
