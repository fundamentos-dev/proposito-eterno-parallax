# Propósito Eterno

- Qual o propósito de Deus hoje?
Deus quer uma família de muitos filhos semelhantes à Ele!

E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.
Porque os que dantes conheceu, também os predestinou para serem conformes à imagem de seu Filho, a fim de que ele seja o primogênito entre muitos irmãos;

Rm 8:28-29

## Sobre

Versão web da apresentação que estava no ar em https://propositoeterno.filipelopes.me/,
que era um export HTML do Keynote (branch `feature/keynote-version`).

Aqui a cena é **HTML + SVG**, dirigida pela rolagem: uma única ilustração revelada em
18 passos. Nada de player do Keynote, nada de PDF — e, principalmente, **todo texto é
texto de verdade**: selecionável, pesquisável, traduzível e editável, inclusive o hebraico
e os que seguem caminho circular.

## Rodando

```bash
pnpm install
pnpm dev
```

Rolar a página avança a narrativa. Setas, espaço e Home/End também navegam.

## Editando os textos

Abra [`src/conteudo.js`](src/conteudo.js). É um arquivo só, com uma entrada por bloco:

```js
export const textos = {
  flowRoot58: ['Propósito Eterno', 'de Deus'],   // bloco reto: uma string por linha
  text6203: 'ETERNIDADE FUTURA',                  // bloco em curva: uma string
};
```

Para transformar um bloco em link para uma pregação, use o mesmo id:

```js
export const links = {
  flowRoot5943: 'https://exemplo.com/pregacao-a-queda',
};
```

`src/conteudo.js` nunca é sobrescrito pelas ferramentas. A **geometria** (posição, corpo da
fonte, raio da curva) fica em `src/scene/text.json`, que é gerado — mexa nele se quiser
ajustar tamanho ou posição, sabendo que uma reextração o refaz.

## De onde vêm os dados

O desenho nasceu no Inkscape, foi fatiado em ~70 SVGs, montado e animado no Keynote, e
exportado como HTML. Os dados da cena são reconstruídos desses dois lados:

| Fonte | O que dá |
|---|---|
| `assets/*/**.json` do export do Keynote | ordem das camadas, retângulo de cada objeto no palco 3058×1560, em que clique cada um entra |
| `src/assets/*.svg` (Inkscape) | as formas, e o texto real — cada bloco vetorizado guardou a string no `aria-label`, com 1 glifo por caractere |
| páginas do PDF do Keynote | as poucas formas desenhadas no próprio Keynote, exportadas como SVG |

Para regerar tudo, com o export do Keynote em algum diretório:

```bash
git worktree add /tmp/kn origin/feature/keynote-version
KEYNOTE=/tmp/kn/assets pnpm cena
```

As quatro etapas ([`tools/`](tools/)):

1. `extract-keynote.mjs` — lê o grafo de animação, compõe as transformações e casa cada
   camada com o SVG que a originou.
2. `extract-shapes.mjs` — exporta como SVG as formas que não vieram do Inkscape.
3. `extract-text.mjs` — recupera texto, quebra de linha, corpo da fonte e curvatura dos
   blocos vetorizados.
4. `build-scene.mjs` — funde os 4 slides numa cena só com linha do tempo contínua.

## Tipografia

O original usa **Bitstream Charter**. A web recebe **Charis SIL** (Google Fonts), que é a
derivada livre — as larguras foram conferidas contra os vetores originais e batem dentro de
1%. Libre Baskerville, que parecia candidata, é 15% mais larga e quebraria o layout.

## Diferenças conhecidas em relação ao Keynote

- O círculo amarelo da igreja aparece como um ponto de ~33px. Isso vem do próprio deck: a
  acessibilidade do Keynote registra o objeto com 32,6×32,6. No desenho original do Inkscape
  ele tem 155,9mm. Provavelmente foi encolhido sem querer.
- "A ESTRATÉGIA · A IGREJA" e "Ef 4:11-16 · Cl 2:19" foram redesenhados dentro do Keynote.
  Aqui eles voltaram a ser texto editável, ligados aos blocos originais, e por isso o corpo
  da fonte ficou um pouco menor que no deck. Ajuste em `src/scene/text.json` se quiser.
- O corpo da fonte de cada linha é medido pela altura das maiúsculas, não lido de um campo —
  pode variar alguns décimos de milímetro em relação ao original.
