# Desktop / Início — spec extraída do Figma (node 2:2)

Fonte: `get_design_context` em 2026-11-07. Referência visual: `../frames/desktop-inicio.png`. Assets: `./assets/`.
Todas as medidas em px no frame de 1440. A fonte inteira do layout é **Roboto Mono** (400/500/700).

## Tokens (variáveis do Figma)

| Token Figma | Hex | Uso |
| --- | --- | --- |
| Color/Ink | `#140D0A` | Fundo da página; texto sobre botão primário |
| Color/Surface Card | `#241612` | Cards, painel de filtros, footer |
| Color/Surface Dark | `#38220F` | Faixa da marca no footer, input da newsletter |
| Color/Primary | `#D28A4C` | Botões, paginação ativa, medalhões |
| Text/Accent | `#E89B55` | Preços, item ativo, links "Ler mais" |
| Color/Foreground | `#F5F1EB` | Texto principal |
| Color/Text Primary | `#F7F3EC` | Títulos do blog |
| Text/Secondary | `#CFB28C` | Texto de apoio |
| Color/Secondary | `#B39463` | Preço riscado, placeholder |
| Color/Border | `#3F2319` | Bordas (paginação) |
| Color/Border Soft | `#55321F` | Chip de carteiras |

Tipografia (tamanho/peso/line-height): Display 43/700/70 · Heading 28/700 · Heading 24/700/32 · 22/700 · 18/700/16 e 18/700/24 · 17/700/16 · 16/400,500,700 · 15/400,500/16 e 15/400,700/40 · 14/400/22,24,30 · 14/500/16 com tracking 1.4 · 13/400/22 · 12/500/16 e 12/700/14 · 10/500 · 9/700.

Raios: botão 6 · paginação 4 · card de blog/promo 8 · arte no card 15 · hero 24 · destaque 22.

## Layout da página

- Fundo Ink; conteúdo de 1200 centralizado (`px 120` em 1440), `py 24`, `gap 96` entre seções.
- Ordem: Top (header + hero, gap 32) → Products → Promos → Blog → Footer.

## Header (componente "Header Row" + divisor)

- Linha `justify-between`, altura ~35. Divisor de 1px (`header-divider.svg`) logo abaixo. Telas do fluxo Mercado usam o header **sem** divisor.
- Logo: "KURIO" 14/700, tracking 1.4, foreground (caixa 160×34).
- Nav (`gap 40`): Início · Mercado · Criadores · Aprenda — 16/400 foreground; ativo 16/700 Text/Accent com sublinhado (`nav-active-underline.svg`) 24px abaixo do texto, alinhado ao divisor. Ativo = "Início" na Home, Perfil, Carteiras e Auth; "Mercado" nas telas de detalhe/carrinho/pagamento.
- Ações (`gap 28`): busca (`icon-search.svg` 20) · carrinho (`icon-cart.svg` 24 + badge 16 circular Primary com número 10/500 Ink, deslocado 15px à direita) · botão "Entrar" 100×35 Primary, raio 6, ícone `icon-login.svg` 20 + texto 16/500 Ink, gap 4.

## Hero

- Caixa 1200×450 com fundo `hero-bg.svg` (retângulo arredondado), `pl 40`; conteúdo 1160 `justify-between`.
- Coluna de texto 600: eyebrow "Bem-vindo à Kurio" 14/500 tracking 1.4 · título "SEJA DONO DO FUTURO / DA ARTE DIGITAL" 43/700 lh 70 · descrição 14/400 lh 24 Text/Secondary (w 557) · CTA "EXPLORAR" 140×40 Primary raio 6, 16/700 Ink. Gaps: 8 (eyebrow→título), 4 (→descrição), 32 (→CTA), 44 (→indicador `hero-dots.svg` 40×8 alinhado à direita).
- Imagem 450×450 raio 24 (`nft-emerald-ape.png`).

## Products (gap 48)

### Sidebar (310, gap 24)

**Filters** (componente; bg Surface Card, `p 20`, seções com gap 40):
- Título de seção 18/700 lh 16 foreground, gap 12 até a lista.
- "Coleções": lista `px 12`, linhas 15/400 lh 40 Text/Secondary com contagem 15/700 à direita "(33)". Item ativo em Text/Accent. Itens: Arte digital 33 · Fotografia 12 · Música 65 · Arte 3D 39 · Colecionáveis 23 · Generativa 17 · Jogos 19 · Assinaturas 13 · Utilidade 18. (A descrição do componente diz "collection checkboxes".)
- "Faixa de preço": slider de duas alças (alças 15px `slider-thumb.svg`, trilha `slider-line*.svg`), texto "Preço: 0,02 - 12,30 ETH" 15/400, botão "Aplicar" Primary `px 12 py 8` raio 6, 16/700 Ink.
- "Rede": Ethereum (119) · Polygon (78) · Solana (86), mesmo estilo das coleções (`pl 12`).

**Featured NFT Banner** (310×470): gradiente vertical `rgba(210,138,76,.10)` → `rgba(210,138,76,.03)`, `pt 24 pb 4`; "NFT EM DESTAQUE" 24/700 lh 32 Text/Accent (`px 20`); "OFERTA LIMITADA" 22/700 foreground centralizado; arte 310×368 raio 22 (`nft-sage-nomad.png`). Decorações: quadrado 22px borda 2px `#46A358` opacidade .2; círculos com gradiente Primary 30%→0.

### Grade (flex-1 ≈ 842)

- Toolbar `justify-between`: abas (`gap 20`, 15/500 lh 16) "Todos os NFTs" (ativo Text/Accent + sublinhado 101×2 `tab-underline.svg`, 23px abaixo) · "Novos lançamentos" · "Em alta"; ordenação "Ordenar por:" + "Listados recentemente" 15/400 + `icon-arrow-down.svg` 16.
- Gap 32 → linhas da grade com gap 72; 3 colunas de 258 `justify-between`.
- Card: caixa da arte 258×300 bg Surface Card com arte 250×250 raio 15 centralizada (padding ~4 / 24); gap 12; nome 16/400 lh 16 foreground; preço 18/700 lh 16 Text/Accent; preço anterior opcional 18/400 Color/Secondary ao lado (gap 12).
- Paginação (gap 88 abaixo da grade, alinhada à direita): botões 35×35 raio 4, gap 8; ativo Primary com 18/700 Ink; demais borda Color/Border com 18/400 foreground; próximo com `icon-chevron-right.svg` 18.

## Promos

- Dois cards 586×250 raio 8 bg Surface Card, `justify-between`.
- Arte à esquerda ~290×250 raio 18; texto alinhado à direita a 30px da borda: título 18/700 lh 24 (2 linhas) · descrição 14/400 lh 24 Text/Secondary (w ~260) · botão "Explorar" 140×40 Primary raio 6, 14/500 Ink + `icon-arrow-right.svg` 18. Máscara `promo-mask.svg` por cima.
- Card 1: "Lançamentos gênesis / de edição limitada" — "Colecione edições escassas diretamente dos criadores antes da revelação pública." (arte emerald-ape)
- Card 2: "Arte digital selecionada / e muito mais" — "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura." (arte neon-vessel)

## Blog — "Diário da Cunhagem" (fora do escopo funcional)

- Cabeçalho centralizado: título 28/700 Text Primary, subtítulo 14/400 Text/Secondary, gap 12; gap 40 até os cards.
- 4 cards 268 (gap 24), raio 8, bg Surface Card; imagem h 195; conteúdo `px 16 pt 12 pb 16 gap 8`: meta 12/500 Text/Secondary ("12 de setembro  |  Leitura de 6 min") · título 16/700 · resumo 12/500 Text/Secondary · "Ler mais →" 12/700 Text/Accent.

## Footer (componente, idêntico em todas as telas)

1. Faixa de destaques (bg Surface Card, h 250, `p 32`): três medalhões (círculo 74 Primary com letra 24/700 Ink "W", "C", "D"; título 17/700; texto 14/400 lh 22 Text/Secondary w 204) separados por linhas verticais de 1px Primary; coluna newsletter w 357: "Antecipe-se ao próximo lançamento" 18/700 · input h 40 raio 6 bg Surface Dark, sombra `0 0 10px rgba(10,6,4,.45)`, placeholder "digite seu e-mail..." 14 Color/Secondary, botão "Enviar" 85 Primary 18/700 Ink · nota 13/400 lh 22 Text/Secondary.
2. Faixa da marca (bg Surface Dark, h 88, `p 32`, gap 92): "KURIO" 14/700 tracking 1.4 · "Feito para colecionadores, / criadores e cultura" 14 lh 22 · "contato@email.com" (mailto) · "+55 11 4002 8922".
3. Links (bg Surface Card, h 236, `p 32`, gap 124): colunas "Meu perfil" (Meu perfil, Minha coleção, Atividade, Estúdio do criador, Lista de interesse), "Central de ajuda" (Central de ajuda, Como comprar NFTs, Carteira e segurança, Política do mercado, Denunciar item), "Coleções" (Arte digital, Fotografia, Música, Arte 3D, Utilidade) — título 18/700, links 14/400 lh 30; coluna 228: "Redes sociais" + 5 ícones 30 (gap 10; `social-*.svg`) e "Carteiras compatíveis" + chip h 26 bg Surface Dark borda Border Soft raio 6 com "METAMASK  •  WALLETCONNECT  •  COINBASE" 9/700 Text/Accent.
4. "© 2026 Kurio. Propriedade digital para todos." 14 lh 30 centralizado.

## Observações de implementação

- A Home desktop usa só 4 artes distintas; as fixtures reaproveitam essas artes (ver ARCHITECTURE).
- Itens que são só editoriais (Blog, Criadores, Aprenda, links de ajuda, newsletter) não podem aparentar sucesso funcional (GEN-03).
