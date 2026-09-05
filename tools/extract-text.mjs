#!/usr/bin/env node
// Recupera o texto real dos SVGs vetorizados do Inkscape e escreve src/scene/text.json.
//
// Cada bloco de texto no Inkscape virou <path> por glifo, mas o grupo guardou a string
// no aria-label e a contagem de glifos bate 1:1 com os caracteres não-espaço. Isso permite
// mapear glifo->caractere e, com as caixas medidas pelo Inkscape, reconstruir linha,
// posição de baseline e corpo da fonte.
//
// Coordenadas ficam LOCAIS ao viewBox de cada asset (mm), para o site posicionar o asset
// pelo retângulo que vem do Keynote e o texto acompanhar junto.
import fs from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const SRC = 'src/assets';
const TMP = fs.mkdtempSync('/tmp/pe-text-');
const CAP_RATIO = 0.681;  // altura de caixa-alta / em, medido no Charter
const X_RATIO = 0.481;
const DESC = /[gjpqyç,]/;
const CAPS = /[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ0-9]/;
const XH = /[acemnorsuvwxz]/;

// O Inkscape responde em px de usuário. Nos assets (documento em mm) isso é mm*3,779528;
// no quadro temporário, que declaro em px puros, o fator é 1 mas há o deslocamento do viewBox.
const PX_PER_MM = 96 / 25.4;
const query = (file, div = 1, off = 0) => {
  const out = execFileSync('inkscape', ['--query-all', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const bb = {};
  for (const line of out.trim().split('\n')) {
    const p = line.split(',');
    if (p.length === 5) bb[p[0]] = { x: +p[1] / div - off, y: +p[2] / div - off, w: +p[3] / div, h: +p[4] / div };
  }
  return bb;
};

const median = (a) => a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null;

function solve3(A, B) {
  const M = A.map((r, i) => [...r, B[i]]);
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let k = i + 1; k < 3; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    for (let k = i + 1; k < 3; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j]; }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) { let s = M[i][3]; for (let j = i + 1; j < 3; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
  return x;
}

const out = {};
for (const f of fs.readdirSync(SRC).filter(f => f.endsWith('.svg'))) {
  const name = f.slice(0, -4);
  const svg = fs.readFileSync(path.join(SRC, f), 'utf8');
  const groups = [...svg.matchAll(/<g\s+aria-label="([^"]*)"([^>]*)>([\s\S]*?)<\/g>/g)];
  if (!groups.length) continue;
  const vbW = +(svg.match(/\swidth="([\d.]+)mm"/) || [])[1];
  const vbH = +(svg.match(/\sheight="([\d.]+)mm"/) || [])[1];
  const bbLocal = query(path.join(SRC, f), PX_PER_MM);
  // o quadro desgirado não carrega o translate da layer1; guardo para reaplicar nas linhas retas
  const lt = svg.match(/id="layer1"[^>]*transform="translate\(([-\d.]+),([-\d.]+)\)"/);
  const LT = { x: lt ? +lt[1] : 0, y: lt ? +lt[2] : 0 };

  for (const [, label, attrs, inner] of groups) {
    const style = (attrs.match(/style="([^"]*)"/) || [])[1] || '';
    const tr = (attrs.match(/transform="([^"]*)"/) || [])[1] || '';
    const mm = tr.match(/matrix\(([-\d.e,]+)\)/), rr = tr.match(/rotate\(([-\d.]+)/);
    let rot = 0, scale = 1;
    if (mm) { const v = mm[1].split(',').map(Number); rot = Math.atan2(v[1], v[0]) * 180 / Math.PI; scale = Math.hypot(v[0], v[1]); }
    else if (rr) rot = +rr[1];
    const nominalEm = (+((style.match(/font-size:([\d.]+)px/) || [])[1] || 0)) * scale;

    // mede também num quadro desgirado, para texto rotacionado virar eixo-alinhado
    const OFF = 500;
    const unrot = `${TMP}/${name}-u.svg`;
    fs.writeFileSync(unrot, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-OFF} ${-OFF} ${OFF * 2} ${OFF * 2}" width="${OFF * 2}" height="${OFF * 2}"><g transform="rotate(${-rot})"><g transform="${tr}">${inner}</g></g></svg>`);
    const bbU = query(unrot, 1, OFF);

    const ids = [...inner.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
    const chars = [...label].filter(c => !/\s/.test(c));
    if (ids.length !== chars.length) { console.error(`  ${name}: ${ids.length} glifos vs ${chars.length} caracteres — pulando`); continue; }
    const gl = ids.map((id, i) => ({ c: chars[i], L: bbLocal[id], U: bbU[id] })).filter(g => g.L && g.U);
    if (!gl.length) continue;

    const common = {
      fill: (style.match(/fill:(#[0-9a-fA-F]{6})/) || [])[1] || '#000000',
      bold: /font-weight:bold/.test(style),
      italic: /font-style:italic/.test(style),
      serif: !/sans-serif/.test(style),
      viewBox: [+vbW.toFixed(3), +vbH.toFixed(3)],
    };

    // curvo? ajusta círculo aos centros dos glifos e testa se a baseline é reta no quadro desgirado
    const P = gl.map(g => ({ x: g.L.x + g.L.w / 2, y: g.L.y + g.L.h / 2 }));
    let curved = false, fit = null;
    if (P.length > 3) {
      let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
      for (const p of P) { const z = p.x * p.x + p.y * p.y; sx += p.x; sy += p.y; sxx += p.x * p.x; syy += p.y * p.y; sxy += p.x * p.y; sxz += p.x * z; syz += p.y * z; sz += z; }
      const [a, b, c] = solve3([[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, P.length]], [sxz, syz, sz]);
      const cx = a / 2, cy = b / 2, R = Math.sqrt(Math.max(c + cx * cx + cy * cy, 0));
      const res = P.map(p => Math.abs(Math.hypot(p.x - cx, p.y - cy) - R));
      const rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / P.length);
      const Q = gl.filter(g => !DESC.test(g.c)).map(g => ({ x: g.U.x + g.U.w / 2, y: g.U.y + g.U.h }));
      let lineRms = Infinity;
      if (Q.length > 2) {
        const n = Q.length, mx = Q.reduce((s, q) => s + q.x, 0) / n, my = Q.reduce((s, q) => s + q.y, 0) / n;
        const sl = Q.reduce((s, q) => s + (q.x - mx) * (q.y - my), 0) / (Q.reduce((s, q) => s + (q.x - mx) ** 2, 0) || 1);
        lineRms = Math.sqrt(Q.reduce((s, q) => s + (q.y - (my + sl * (q.x - mx))) ** 2, 0) / n);
      }
      const ang = (p) => Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
      let arc = ang(P[P.length - 1]) - ang(P[0]);
      while (arc > 180) arc -= 360; while (arc < -180) arc += 360;
      curved = lineRms > 0.06 * nominalEm && rms / R < 0.02 && R < 300 && Math.abs(arc) > 25;
      fit = { cx: +cx.toFixed(2), cy: +cy.toFixed(2), r: +R.toFixed(2), a0: +ang(P[0]).toFixed(2), arco: +arc.toFixed(2) };
    }

    if (curved) {
      out[name] = { tipo: 'curvo', texto: label, ...fit, size: +nominalEm.toFixed(2), ...common };
      continue;
    }

    // reto: agrupa glifos em linhas pela baseline no quadro desgirado
    const lines = [];
    for (const g of [...gl].sort((a, b) => (a.U.y + a.U.h) - (b.U.y + b.U.h))) {
      const base = g.U.y + g.U.h - (DESC.test(g.c) ? g.U.h * 0.22 : 0);
      let L = lines.find(l => Math.abs(l.base - base) < nominalEm * 0.4);
      if (!L) { L = { base, items: [] }; lines.push(L); }
      L.items.push(g);
      L.base = (L.base * (L.items.length - 1) + base) / L.items.length;
    }
    lines.sort((a, b) => a.base - b.base);
    for (const L of lines) L.items.sort((a, b) => a.U.x - b.U.x);

    // reinsere os espaços consumindo o aria-label na ordem das linhas
    const all = [...label];
    let ci = 0;
    const th = rot * Math.PI / 180;
    const linhas = lines.map(L => {
      let need = L.items.length, s = '';
      while (ci < all.length && /\s/.test(all[ci])) ci++;
      while (need > 0 && ci < all.length) { const ch = all[ci++]; s += ch; if (!/\s/.test(ch)) need--; }
      const caps = L.items.filter(i => CAPS.test(i.c)).map(i => i.U.h);
      const xhs = L.items.filter(i => XH.test(i.c)).map(i => i.U.h);
      const em = caps.length ? median(caps) / CAP_RATIO : (xhs.length ? median(xhs) / X_RATIO : nominalEm);
      // âncora: canto esquerdo da baseline, medido desgirado e trazido de volta ao quadro local
      const ux = L.items[0].U.x, uy = L.base;
      return {
        texto: s,
        x: +(ux * Math.cos(th) - uy * Math.sin(th) + LT.x).toFixed(2),
        y: +(ux * Math.sin(th) + uy * Math.cos(th) + LT.y).toFixed(2),
        size: +em.toFixed(2),
      };
    });
    out[name] = { tipo: 'linhas', rot: +rot.toFixed(2), linhas, ...common };
  }
}

// image132 é um bitmap embutido, não vetor: o hebraico de Gn 1:26 com transliteração.
// As três linhas foram medidas nas bandas de tinta do PNG (193x84 -> 51,065 x 22,225 mm).
// Corpo estimado a partir da altura das letras — ajuste fino é bem-vindo.
out.image132 = {
  tipo: 'linhas', rot: 0, fill: '#000000', bold: false, italic: false, serif: true,
  viewBox: [51.065, 22.225],
  linhas: [
    { texto: 'כִּדְמוּתֵנוּ', x: 3.44, y: 6.88, size: 8.5, rtl: true },
    { texto: 'kidemutenu', x: 3.44, y: 13.23, size: 5.3 },
    { texto: 'à-nossa-semelhança', x: 3.44, y: 19.58, size: 5.3 },
  ],
};

fs.mkdirSync('src/scene', { recursive: true });
fs.writeFileSync('src/scene/text.json', JSON.stringify(out, null, 1));
fs.rmSync(TMP, { recursive: true, force: true });
const r = Object.values(out).filter(o => o.tipo === 'linhas').length;
console.log(`${Object.keys(out).length} blocos de texto: ${r} retos, ${Object.keys(out).length - r} em caminho circular`);
