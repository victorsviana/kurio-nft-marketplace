# Desktop / Detalhes do NFT — spec extraída do Figma (node 10:244)

Fonte: `get_design_context` em 2026-11-08. Referência visual: `../frames/desktop-detalhes-do-nft.png`. Assets: `./assets/`.
Medidas em px no frame de 1440 (conteúdo 1200, `px 120 py 24`, `gap 96` entre seções). Fonte Roboto Mono. Header e Footer = componentes globais (`src/components/layout`), header **sem divisor** e com "Mercado" ativo (já configurado no `staticData` da rota).

## Seção Top (gap 32 abaixo do header)

### Main (`gap 12`)
- Breadcrumb "Início / Mercado" 15/700 lh16 foreground (links: Início → `/`, Mercado → `/#catalogo`).
- Product: linha `gap 32` = imagens (573 × 448) + detalhes (flex-1, `justify-between`, altura igual à das imagens).

### Imagens (573 × 448, `gap 28`)
- Thumbnails: coluna de 4 × (100 × 100, raio 8, `gap 16`) sobre fundo Surface Card raio 6; selecionada com borda 1px Primary. São botões (galeria navegável, NFT-01).
- Imagem principal: caixa 444 × 444 bg Surface Card raio 6 `p 16`, arte 404 × 404 raio 24.
- Botão de zoom `icon-zoom.svg` 30 no canto superior direito da caixa (left 530, top 15 → 14px da borda direita, 15px do topo). Abre a arte ampliada num Dialog.

### Detalhes (coluna, `justify-between`)
1. Título: nome 28/700 foreground (h1) · gap 12 · linha `justify-between`: preço 22/700 lh16 Text/Accent | estrelas (5 × 15px, gap 4; `icon-star.svg` cheia em Primary, `icon-star-last.svg` em Text/Secondary para a parte não preenchida) + "19 avaliações de colecionadores" 15/400 foreground. Abaixo: regra 0.3px Primary (`title-rule.svg`, 573) gap 12.
2. "Sobre este NFT:" 15/700 lh16 · gap 12 · descrição 14/400 lh24 Text/Secondary (w 574).
3. "Edição:" 15/700 lh16 · gap 12 · pills `gap 6`, altura 28, totalmente arredondadas, borda 1px Color/Border `#3F2319` (inativa) ou Primary (ativa); texto 14 lh16 Text/Secondary (inativa, 400) ou Text/Accent 500 (ativa). Larguras: 1/1 36 · 1/10 42 · 1/50 46 · ABERTA 66 (`px 4..8`). Esgotada: desabilitada + motivo textual (não desenhado; ex. riscado + "esgotada" em sr/tooltip e texto abaixo).
4. Linha `justify-between`: stepper (botão 33 × 49.5 raio 33 Primary, borda 1px Ink, sombra `0 6.6px 9.9px rgba(20,13,10,.15)`, ícone `icon-minus.svg`/`icon-plus.svg` 26.4; número 20/400 lh28 foreground; gap 12) | ações `gap 8`: "COMPRAR" 130 × 40 Primary raio 6, 14/700 lh20 Ink · "Favoritar" 130 × 40 borda 1px Primary raio 6, `icon-heart.svg` 20 + 14/500 lh20 Text/Accent (gap 8).
5. Metadados (w 308, gap 12): "ID do token: #0042" · "Coleção: Kurio Apes" · "Atributos: Óculos, Esmeralda, Raro" — 15/400 Color/Secondary `#B39463`. Depois "Compartilhar este NFT:" 15/700 lh16 + ícones `share-linkedin.svg` 15 · `share-message.svg` 18 · `share-twitter.svg` 16 (gap 8) → links externos de compartilhamento (LinkedIn/Twitter `share` URLs + `mailto:`), comportamento real e coerente.

## Seção Description (abas)
- Abas `gap 32`: ativa "Detalhes do NFT" 17/700 lh16 Text/Accent com sublinhado 3px Primary (`tab-underline.svg`, largura da aba 161) 12px abaixo; inativa "Avaliações de colecionadores (19)" 17/400 lh16 foreground. Regra 0.3px Primary de 1200 abaixo das abas (`section-rule.svg`). Gap 12 até o conteúdo.
- Painel "Detalhes": parágrafos 14/400 lh24 Text/Secondary (linha em branco entre eles) · "Rede:" 14/700 lh24 foreground + texto · "Contrato:" + texto · "Direitos autorais:" + texto.
  - No Figma os rótulos "Contrato" e "Direitos autorais" estão trocados em relação ao conteúdo (o endereço aparece sob "Direitos autorais"). Implementar com o conteúdo correto: **Contrato:** `0x7A42...19E8 • Contrato inteligente ERC-721 verificado.` · **Direitos autorais:** `Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.` (registrar em ARCHITECTURE como desvio).
- Painel "Avaliações" (não desenhado): lista de reviews no mesmo estilo (autor 14/700, estrelas, comentário 14/400 lh24 Text/Secondary, data).

## Seção Related Products — "Mais desta coleção"
- Cabeçalho: 17/700 lh16 Text/Accent + regra 0.3px Primary de 1200, gap 12. Gap 32 até o carrossel.
- 5 cards (≈ 219 × 255 de caixa) `justify-between` em 1200: caixa bg Surface Card com arte ~212 raio 13 (`pt 20 pb 24 px 4`); gap 12; nome 15/400 foreground; preço 16/700 lh16 Text/Accent. Card inteiro = link para `/nft/$id`.
- Indicador `carousel-dots.svg` 52 × 12 centralizado, gap 32 abaixo (3 páginas de 5; dots clicáveis / setas por teclado).

## Mobile / Detalhe
Ver `../detalhe-mobile/spec.md`.
