// Monta a cena como um único SVG em coordenadas de palco (3058x1560).
// Formas vêm dos SVGs originais; texto é <text>/<textPath> de verdade, nunca vetorizado.

const brutos = import.meta.glob('./assets/**/*.svg', { query: '?raw', import: 'default', eager: true });

const svgPorId = {};
for (const [caminho, conteudo] of Object.entries(brutos)) {
  svgPorId[caminho.replace(/^.*\//, '').replace(/\.svg$/, '')] = conteudo;
}

const NS = 'http://www.w3.org/2000/svg';
const el = (nome, attrs = {}) => {
  const n = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  return n;
};

// Tamanho do quadro de cada asset, nas unidades em que seu conteúdo foi desenhado.
function caixa(bruto) {
  const vb = bruto.match(/viewBox="([-\d.\s]+)"/);
  if (vb) { const p = vb[1].trim().split(/\s+/).map(Number); return { w: p[2], h: p[3] }; }
  const w = bruto.match(/\swidth="([\d.]+)/), h = bruto.match(/\sheight="([\d.]+)/);
  return { w: w ? +w[1] : 1, h: h ? +h[1] : 1 };
}

// Conteúdo desenhável, sem o invólucro <svg>, sem metadados e sem os glifos vetorizados
// (esses viram texto de verdade).
//
// Os ids são prefixados com o nome do asset: vários SVGs vindos do PDF declaram "clip-0",
// "clip-1"... e, juntos num único documento, o primeiro venceria e recortaria os outros.
function miolo(bruto, prefixo) {
  const corpo = bruto
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
    .replace(/<g\s+aria-label="[^"]*"[^>]*>[\s\S]*?<\/g>/g, '')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');
  const ns = `${prefixo}__`;
  return corpo
    .replace(/\bid="([^"]+)"/g, (_, v) => `id="${ns}${v}"`)
    .replace(/url\(#([^)]+)\)/g, (_, v) => `url(#${ns}${v})`)
    .replace(/\b(xlink:href|href)="#([^"]+)"/g, (_, a, v) => `${a}="#${ns}${v}"`);
}

const FONTE_SERIF = "'Charis SIL', Charter, 'Bitstream Charter', Georgia, serif";
const FONTE_SANS = "'DejaVu Sans', system-ui, sans-serif";
const FONTE_HEBRAICO = "'Frank Ruhl Libre', 'Times New Roman', serif";

function desenhaTexto(grupo, geo, linhas, id, fatia) {
  const fonte = geo.serif ? FONTE_SERIF : FONTE_SANS;
  const comum = {
    fill: geo.fill,
    'font-family': fonte,
    'font-weight': geo.bold ? 'bold' : 'normal',
    'font-style': geo.italic ? 'italic' : 'normal',
  };

  if (geo.tipo === 'curvo') {
    // O arco é estendido além do trecho medido para o texto não ser cortado na ponta.
    const raio = geo.r - geo.size * 0.24;
    const arco = geo.arco * 1.6;
    const ponto = (g) => {
      const t = g * Math.PI / 180;
      return `${(geo.cx + raio * Math.cos(t)).toFixed(3)},${(geo.cy + raio * Math.sin(t)).toFixed(3)}`;
    };
    const idPath = `arco-${id}`;
    const defs = el('defs');
    defs.appendChild(el('path', {
      id: idPath, fill: 'none',
      d: `M ${ponto(geo.a0)} A ${raio},${raio} 0 ${Math.abs(arco) > 180 ? 1 : 0} ${arco > 0 ? 1 : 0} ${ponto(geo.a0 + arco)}`,
    }));
    grupo.appendChild(defs);
    const t = el('text', { ...comum, 'font-size': geo.size });
    const tp = el('textPath', { href: `#${idPath}` });
    tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${idPath}`);
    tp.textContent = typeof linhas === 'string' ? linhas : geo.texto;
    t.appendChild(tp);
    grupo.appendChild(t);
    return;
  }

  geo.linhas.forEach((ln, i) => {
    if (fatia && fatia.linhas && !fatia.linhas.includes(i)) return;
    const conteudo = Array.isArray(linhas) && linhas[i] != null ? linhas[i] : ln.texto;
    const t = el('text', {
      ...comum,
      'font-size': ln.size,
      'font-family': ln.rtl ? FONTE_HEBRAICO : fonte,
      direction: ln.rtl ? 'rtl' : null,
      transform: `translate(${ln.x},${ln.y})${geo.rot ? ` rotate(${geo.rot})` : ''}`,
      'xml:space': 'preserve',
    });
    t.textContent = conteudo;
    grupo.appendChild(t);
  });
}

export function montaCena(cena, geometria, textos, links, continuas = {}, recortes = {}, contornos = {}) {
  const svg = el('svg', {
    viewBox: `0 0 ${cena.palco.width} ${cena.palco.height}`,
    xmlns: NS, id: 'palco',
    'aria-label': cena.titulo,
  });

  // recortes declarados em src/ajustes.js: o disco de outra camada limita esta
  const defsGlobais = el('defs');
  svg.appendChild(defsGlobais);
  const clipDe = {};
  for (const [alvo, regra] of Object.entries(recortes)) {
    const fonte = cena.camadas.find((l) => l.asset.id === regra.disco);
    if (!fonte) continue;
    const id = `recorte-${alvo}`;
    const cp = el('clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
    cp.appendChild(el('circle', {
      cx: fonte.x + fonte.w / 2, cy: fonte.y + fonte.h / 2,
      r: Math.min(fonte.w, fonte.h) / 2,
    }));
    defsGlobais.appendChild(cp);
    clipDe[alvo] = id;
  }

  const faltando = new Set();
  cena.camadas.forEach((c) => {
    const bruto = svgPorId[c.asset.id];
    if (!bruto) { faltando.add(c.asset.id); return; }
    const cx = caixa(bruto);

    // Dois níveis: o de fora é do controlador (animação, em coordenadas de palco); o de
    // dentro encaixa o asset, desenhado no seu próprio quadro, dentro do retângulo do palco.
    const g = el('g', { class: 'camada', 'data-passo': c.step, 'data-asset': c.asset.id });
    if (continuas[c.asset.id]) g.classList.add(`anima-${continuas[c.asset.id]}`);
    if (clipDe[c.asset.id]) g.setAttribute('clip-path', `url(#${clipDe[c.asset.id]})`);
    const dentro = el('g', {
      transform: `translate(${c.x},${c.y}) scale(${(c.w / cx.w).toFixed(6)},${(c.h / cx.h).toFixed(6)})`
        + (c.rotation ? ` rotate(${c.rotation * 180 / Math.PI},${cx.w / 2},${cx.h / 2})` : ''),
      opacity: c.opacity,
    });
    g.appendChild(dentro);

    const contorno = contornos[c.asset.id];
    if (contorno) {
      // a largura vem em unidades de palco; aqui ela volta para o quadro do asset
      dentro.setAttribute('stroke', contorno.cor);
      dentro.setAttribute('stroke-width', (contorno.largura / (c.w / cx.w)).toFixed(3));
    }


    const geo = geometria[c.asset.id];
    if (geo) desenhaTexto(dentro, geo, textos[c.asset.id], `${c.asset.id}-${c.z}`, c.fatia);
    else {
      dentro.innerHTML = miolo(bruto, `${c.asset.id}-${c.z}`);
      // fatia por grupo: o asset traz vários desenhos independentes (as três faixas roxas,
      // por exemplo) e cada fatia mostra só os seus, para entrarem em passos diferentes
      if (c.fatia && c.fatia.grupos) {
        [...dentro.children]
          .filter((n) => n.tagName !== 'defs')
          .forEach((n, k) => { if (!c.fatia.grupos.includes(k)) n.remove(); });
      }
    }

    const url = links[c.asset.id];
    if (url) {
      const a = el('a', { href: url, target: '_blank', rel: 'noopener' });
      a.appendChild(g);
      svg.appendChild(a);
    } else {
      svg.appendChild(g);
    }
  });

  if (faltando.size) console.warn('assets ausentes:', [...faltando]);
  return svg;
}
