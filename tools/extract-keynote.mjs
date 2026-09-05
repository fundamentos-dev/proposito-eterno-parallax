#!/usr/bin/env node
// Lê o export HTML do Keynote (branch feature/keynote-version) e produz src/scene/scene.json.
// Cada objeto sai com: SVG de origem, retângulo absoluto no palco, ordem de camada,
// em que passo do build entra e qual efeito o Keynote usava.
//
// Duas fontes se cruzam aqui:
//  - events[].effects[].baseLayer -> árvore de camadas (ordem = z-order, transformações CoreAnimation)
//  - events[].accessibility[]     -> {text: "arquivo.svg", targetRectangle} acumulado por evento
import fs from 'fs';
import path from 'path';

const KN = process.argv[2];
if (!KN) { console.error('uso: extract-keynote.mjs <dir do export/assets>'); process.exit(1); }

const header = JSON.parse(fs.readFileSync(path.join(KN, 'header.json'), 'utf8'));

// CoreAnimation: origem do frame = position - anchorPoint * (width,height); filhos vivem no espaço do pai.
function walk(layer, parent, out, assets) {
  const st = layer.initialState || {};
  const w = st.width ?? 0, h = st.height ?? 0;
  const p = st.position || { pointX: 0, pointY: 0 };
  const a = st.anchorPoint || { pointX: 0.5, pointY: 0.5 };
  const o = { x: parent.x + p.pointX - a.pointX * w, y: parent.y + p.pointY - a.pointY * h };
  if (layer.texture) {
    const a = assets[layer.texture];
    out.push({ x: o.x, y: o.y, w, h, rotation: st.rotation || 0, opacity: st.opacity ?? 1,
               pdfPage: a && a.index != null ? a.index + 1 : null });
  }
  for (const c of layer.layers || []) walk(c, o, out, assets);
  return out;
}
const layersOf = (ev, assets) => (ev.effects || []).flatMap(e => e.baseLayer ? walk(e.baseLayer, { x: 0, y: 0 }, [], assets) : []);
const key = (r) => `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width ?? r.w)}`;

let mismatches = 0;
const slides = header.slideList.map((id, si) => {
  const d = JSON.parse(fs.readFileSync(path.join(KN, id, `${id}.json`), 'utf8'));
  const events = d.events;

  // passo em que cada objeto (nome+retângulo) aparece pela primeira vez
  const firstStep = new Map();
  events.forEach((e, ei) => {
    for (const a of e.accessibility || []) {
      const k = `${a.text}|${key(a.targetRectangle)}`;
      if (!firstStep.has(k)) firstStep.set(k, ei);
    }
  });
  // catálogo nome+retângulo do último evento (estado final)
  const cat = (events[events.length - 1].accessibility || []).map(a => ({
    svg: a.text.replace(/\.svg$/, ''), r: a.targetRectangle,
  }));

  // O retângulo de acessibilidade é a caixa de tinta: ~1,6px menor de cada lado que o frame.
  // O casamento é global e guloso — pares mais próximos primeiro — porque casar na ordem das
  // camadas deixa uma camada roubar a entrada que pertencia a outra.
  const brutas = layersOf(events[events.length - 1], d.assets);
  const pares = [];
  brutas.forEach((l, li) => cat.forEach((c, ci) => {
    const dist = Math.abs(c.r.x - l.x) + Math.abs(c.r.y - l.y) + Math.abs(c.r.width - l.w) + Math.abs(c.r.height - l.h);
    if (dist <= 24) pares.push({ li, ci, dist });
  }));
  pares.sort((a, b) => a.dist - b.dist);
  const paraCamada = new Map(), usados = new Set();
  for (const p of pares) {
    if (paraCamada.has(p.li) || usados.has(p.ci)) continue;
    paraCamada.set(p.li, p); usados.add(p.ci);
  }

  const layers = brutas.map((l, z) => {
    const m = paraCamada.get(z);
    if (!m) mismatches++;
    const best = m ? cat[m.ci] : null;
    const k = best ? `${best.svg}.svg|${key(best.r)}` : null;
    const step = k != null && firstStep.has(k) ? firstStep.get(k) : null;
    return {
      svg: best ? best.svg : null, z,
      x: +l.x.toFixed(2), y: +l.y.toFixed(2), w: +l.w.toFixed(2), h: +l.h.toFixed(2),
      rotation: +l.rotation.toFixed(4), opacity: +l.opacity.toFixed(3), pdfPage: l.pdfPage,
      step: step === events.length - 1 ? null : step,
      fit: m ? +m.dist.toFixed(2) : null,
    };
  });
  return { id, index: si, buildCount: events.length - 1, layers };
});

fs.mkdirSync('src/scene', { recursive: true });
fs.writeFileSync('src/scene/scene.json', JSON.stringify({ stage: { width: header.slideWidth, height: header.slideHeight }, title: header.title, slides }, null, 1));

for (const s of slides) {
  const named = s.layers.filter(l => l.svg).length;
  const steps = s.layers.filter(l => l.step !== null).length;
  console.log(`slide ${s.index + 1}: ${s.layers.length} camadas, ${named} identificadas, ${steps} com passo de build, ${s.buildCount} passos`);
}
console.log(mismatches ? `AVISO: ${mismatches} camadas sem retângulo correspondente` : 'todas as camadas casaram com um retângulo');
