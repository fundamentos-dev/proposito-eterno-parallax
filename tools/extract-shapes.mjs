#!/usr/bin/env node
// Alguns objetos do slide não vieram de SVG importado — são formas desenhadas no próprio
// Keynote. Para esses, exporto a página correspondente do PDF como SVG vetorial,
// em src/assets/kn/. O fundo branco de cada slide é ignorado.
import fs from 'fs';
import path from 'path';
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
for (const { slide, page, short } of need.values()) {
  const pdf = path.join(KN, slide, 'assets', `${slide}.pdf`);
  const dest = path.join(OUT, `${short}.svg`);
  execFileSync('pdftocairo', ['-svg', '-f', String(page), '-l', String(page), pdf, dest]);
  console.log(`${short}.svg  <- ${slide.slice(0, 8)} página ${page}`);
}
console.log(`${need.size} formas nativas do Keynote exportadas para ${OUT}/`);
