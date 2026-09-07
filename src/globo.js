// Esfera ortográfica desenhada na GPU com um único quadrado, sem motor 3D.
// A textura é local; só redesenhamos quando o ângulo ou a resolução mudam.
import mapaUrl from './assets/mapa-terra.svg?url';

const VERTEX = `
attribute vec2 posicao;
varying vec2 ponto;
void main() {
  ponto = posicao;
  gl_Position = vec4(posicao, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
varying vec2 ponto;
uniform sampler2D mapa;
uniform float angulo;
uniform float pixel;
const float PI = 3.14159265359;
void main() {
  float raio = length(ponto);
  float alfa = 1.0 - smoothstep(1.0 - pixel, 1.0, raio);
  if (alfa <= 0.0) discard;
  vec3 normal = vec3(ponto, sqrt(max(0.0, 1.0 - dot(ponto, ponto))));
  // Inclinação discreta do eixo; longitude gira sobre a superfície esférica.
  float inclinacao = 0.12;
  vec3 n = vec3(normal.x,
    normal.y * cos(inclinacao) + normal.z * sin(inclinacao),
    normal.z * cos(inclinacao) - normal.y * sin(inclinacao));
  vec2 uv = vec2(fract((atan(n.x, n.z) + angulo) / (2.0 * PI) + 0.5),
    0.5 - asin(clamp(n.y, -1.0, 1.0)) / PI);
  vec3 cor = texture2D(mapa, uv).rgb;
  float luz = 0.77 + 0.23 * max(dot(normal, normalize(vec3(-0.4, 0.5, 1.0))), 0.0);
  gl_FragColor = vec4(cor * luz * alfa, alfa);
}`;

export function montaGlobo(palco, cena, agenda) {
  const disco = palco.querySelector('[data-asset="circle18"]');
  const continentes = palco.querySelector('[data-asset="g4676"]');
  const dados = cena.camadas.find((c) => c.asset.id === 'circle18');
  if (!disco || !continentes || !dados) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'globo-3d';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;

  const objeto = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  for (const [nome, valor] of Object.entries({ x: dados.x, y: dados.y, width: dados.w, height: dados.h })) {
    objeto.setAttribute(nome, valor);
  }
  objeto.style.pointerEvents = 'none';
  objeto.style.display = 'none';
  objeto.appendChild(canvas);
  disco.appendChild(objeto);

  const original = disco.firstElementChild;
  const mapa = new Image();
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)');
  let pronto = false;
  let programa, buffer, textura, uAngulo, uPixel;
  let ultimoAngulo = null;

  function fallback() {
    pronto = false;
    objeto.style.display = 'none';
    original.style.display = '';
    continentes.firstElementChild.style.display = '';
    agenda();
  }

  function prepara() {
    const shaders = [];
    try {
      programa = gl.createProgram();
      for (const [tipo, fonte] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]]) {
        const shader = gl.createShader(tipo);
        shaders.push(shader);
        gl.shaderSource(shader, fonte);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        gl.attachShader(programa, shader);
      }
      gl.linkProgram(programa);
      if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programa));
      gl.useProgram(programa);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const posicao = gl.getAttribLocation(programa, 'posicao');
      gl.enableVertexAttribArray(posicao);
      gl.vertexAttribPointer(posicao, 2, gl.FLOAT, false, 0, 0);
      textura = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, textura);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mapa);
      gl.uniform1i(gl.getUniformLocation(programa, 'mapa'), 0);
      uAngulo = gl.getUniformLocation(programa, 'angulo');
      uPixel = gl.getUniformLocation(programa, 'pixel');
      ultimoAngulo = null;
      pronto = true;
      agenda();
    } catch (erro) {
      console.warn('Globo 3D indisponível; mantendo o SVG.', erro);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(textura);
      gl.deleteProgram(programa);
      fallback();
    } finally {
      shaders.forEach((shader) => gl.deleteShader(shader));
    }
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fallback(); });
  canvas.addEventListener('webglcontextrestored', prepara);
  reduzir.addEventListener('change', agenda);
  mapa.onload = prepara;
  mapa.onerror = fallback;
  mapa.src = mapaUrl;

  return {
    get ativo() { return pronto; },
    atualiza(cursor) {
      if (!pronto || cursor <= dados.step - 1 || document.hidden) return;
      const progresso = Math.min(Math.max((cursor - dados.step + 1) / (cena.passos - dados.step + 1), 0), 1);
      const angulo = -0.65 + (reduzir.matches ? 0 : progresso * Math.PI * 2);
      const escala = palco.querySelector('#palco').getScreenCTM();
      if (!escala) return;
      const tamanho = Math.min(1536, Math.max(64, Math.round(dados.w * Math.hypot(escala.a, escala.b) * Math.min(devicePixelRatio || 1, 2))));
      if (canvas.width === tamanho && ultimoAngulo === angulo) return;
      if (canvas.width !== tamanho || canvas.height !== tamanho) canvas.width = canvas.height = tamanho;
      gl.viewport(0, 0, tamanho, tamanho);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uAngulo, angulo);
      gl.uniform1f(uPixel, 3 / tamanho);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      ultimoAngulo = angulo;
      original.style.display = 'none';
      continentes.firstElementChild.style.display = 'none';
      objeto.style.display = '';
    },
  };
}
