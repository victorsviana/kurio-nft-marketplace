# Mobile / Início — spec extraída do Figma (node 14:5226)

Fonte: `get_design_context` em 2026-11-07. Referência visual: `../frames/mobile-inicio.png`. Assets: `./assets/`.
Frame de 414 × 896 (raio 40 = moldura do aparelho, não implementar). Fonte: Roboto Mono. As artes são as mesmas 4 do desktop (`../inicio/assets/nft-*.png`).

## Tokens novos (além de `../inicio/spec.md`)

| Token | Hex | Uso |
| --- | --- | --- |
| Color/Surface Raised | `#2F1D15` | Fim do gradiente dos cards; fundo do botão de favorito |
| Color/Gray Light | `#EDEDED` | Só máscara do hero |

Tipos: Body/14 Bold lh16 · Body/14 Regular lh16 · Body/15 Regular lh normal · Body Large/16 Bold lh16 · Caption/12 Regular lh18 · Caption/12 Bold lh14 · Caption/13 Medium lh16.

## Layout

- Fundo Ink, `pt 40 px 24`, colunas com `gap 16`. Conteúdo útil = 366 de largura.
- **Não há header** no mobile: busca no topo e tab bar fixa embaixo substituem a navegação.

## Barra de busca (h 45)

- Campo 313 × 45, bg Surface Card, raio 10, `pl 12 py 12`; ícone `icon-search.svg` 22 + placeholder "Explorar coleções" 14/700 lh16 Color/Secondary, gap 8.
- Botão de filtros 45 × 45 a 8px do campo, raio 14, `p 12`, fundo `linear-gradient(137deg, rgba(210,138,76,.45) 24.6%, #D28A4C 100%)`, ícone `icon-filter.svg` 22. Abre o drawer de filtros.

## Hero (366 × 190, raio 12, `p 16`)

- Fundo `hero-mask.svg` (retângulo raio 30 com gradiente e dois círculos).
- Linha `gap 8`: coluna de texto flex-1 (gap 6): eyebrow "Bem-vindo à Kurio" 12/500 lh16 foreground · título "SEJA DONO DA / CULTURA DIGITAL" 18/700 lh29 foreground (w 190) · descrição "Descubra NFTs selecionados de criadores do mundo todo." 12/400 lh18 Text/Secondary; depois CTA texto "EXPLORAR" 12/700 lh14 Text/Accent + `icon-arrow-right.svg` 16 (gap 8).
- Artes sobrepostas: 138 × 138 raio 16 (emerald-ape) e 58 × 58 raio 16 (sage-nomad) deslocada `ml 14 mt 88`.
- Indicador `hero-dots.svg` 33 × 7 centralizado, gap 16 abaixo da linha.

## Abas (gap 4 entre ativo e demais; demais com gap 16)

- Ativa "Todos os NFTs" 14/700 lh16 Text/Accent com sublinhado 2px Primary (`tab-underline.svg`) 4px abaixo.
- Inativas "Novos lançamentos" · "Em alta" 14/400 lh16 foreground.

## Grade (2 colunas de 175, `justify-between`, gap vertical 24; coluna direita desce 32px = masonry escalonado)

- Card: caixa 175 × 200 raio 20, fundo `linear-gradient(139.5deg, #241612 12%, #2F1D15 106.6%)`, `px 4` e `pt 12 pb 20` (coluna esquerda) ou `pt 20 pb 12` (direita); arte 168 × 168 raio 16.
- Favoritar: botão circular 28 no canto superior direito da arte (8px de margem): `fav-idle.svg` (contorno) e `fav-active.svg` (preenchido).
- Selo "RARO": faixa 68 × 32 Primary no topo esquerdo (top 16, sem raio), texto 13/500 lh16 Ink a 8px.
- Texto (`pl 8`, gap 8 da caixa): nome 15/400 foreground · preço 16/700 lh16 Text/Accent.

## Tab bar (fixa, h 126, sobre o conteúdo)

- Fundo `tabbar-bg.svg` (Surface Card com recorte côncavo central e sombra), largura total.
- Botão central 65 × 65 (`tabbar-fab.svg`, gradiente Primary 40%→100%) com ícone de scan (`scan-1..5.svg`) — ação sem fluxo no enunciado → tratar como "em breve" (GEN-03) ou atalho para busca.
- Ícones 20px (posições por % do frame): Início (`icon-home.svg`, ativo em Primary) · Favoritos (`icon-heart.svg`) · [FAB] · Carrinho (`icon-shop.svg`) · Perfil (`icon-user.svg`). Inativos em foreground.

## Decisões de implementação

- Header desktop some abaixo de `md`; busca + filtros no topo e tab bar fixa aparecem só no mobile. O conteúdo ganha `pb` para não ficar sob a tab bar.
- O masonry escalonado é reproduzido com `grid-cols-2` + `translate-y-8` na segunda coluna (ou `mt-8` no primeiro item da coluna direita).
- O drawer de filtros mobile (não desenhado) usa o Sheet do shadcn com o visual da sidebar desktop.
