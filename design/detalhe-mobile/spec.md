# Mobile / Detalhes do NFT — spec extraída do Figma (node 15:5536)

Fonte: `get_design_context` em 2026-11-08. Referência: `../frames/mobile-detalhes-do-nft.png`. Assets: `./assets/` (arte = `../inicio/assets/nft-*.png`, servida como `/images/nft/*.webp`).
Frame 414 × 896 (raio 40 = moldura do aparelho, ignorar). **Sem header global e sem tab bar** (rota já configurada com `mobileHeader: false`). Abaixo de `md` esta composição substitui a desktop.

## Hero (414 × 506, sobreposto em 114px pela folha de detalhes)
- Fundo `linear-gradient(137.6deg, #241612 12%, #2F1D15 106.6%)`.
- Linha superior (left 28, top 23, w 361, `justify-between`): botão Voltar e botão Favoritar, ambos 35 × 35 circulares bg Surface Raised `#2F1D15` borda 1px Color/Border `#3F2319`.
  - Voltar: `icon-back.svg` (chevron de 13.2 × 7.3 traçado em Text/Secondary) **rotacionado 90°** para apontar à esquerda, dentro de 20px. Volta no histórico (`router.history.back()`), com fallback para `/` em acesso direto.
  - Favoritar: `icon-heart.svg` 16 × 14.2 em Text/Accent (contorno; estado ativo preenchido/`aria-pressed`).
- Arte 361 × 356 raio 24, 8px abaixo da linha. Galeria navegável por swipe/scroll-snap entre as imagens.
- Indicador `gallery-dots.svg` 56 × 7 centralizado em top 365 (sobre a arte, perto da borda inferior).

## Folha de detalhes (bg Surface Card, raio superior 31, `pt 32 px 24 pb 24`, `gap 12`)
- Linha do título `justify-between`: nome 20/700 lh16 foreground (h1) | selo de avaliação: pill 80 × 27 borda 1px Primary raio 32 com `icon-star.svg` 14 (Primary) + "4.8" 14/500 foreground + "(19)" 14/400 Text/Secondary.
- Descrição 14/400 lh24 Text/Secondary.
- "Edição:" 15/700 lh16 · gap 8 · pills `gap 12` (mesmo estilo do desktop: altura 28, borda 1px `#3F2319`, ativa Primary com texto Text/Accent 500). Obs.: o frame repete "1/10" duas vezes por engano; implementar as edições reais (1/1, 1/10, 1/50, ABERTA).
- Token info `gap 12`: "ID do token: #0042" · "Coleção: Kurio Apes" · "Atributos: …" 15/400 Color/Secondary.
- As abas de detalhes/avaliações e "Mais desta coleção" não estão no frame mobile: empilhar abaixo da folha com o mesmo visual do desktop (ver `../detalhe/spec.md`).

## Barra de compra (fixa no rodapé, h 164, bg Surface Card, raio superior 40, sombra `0 0 10px rgba(10,6,4,.45)`, `pt 20 px 24 pb 36`, gap 20)
- Linha `justify-between`: "Qtd." 15/500 Text/Secondary + stepper (botões 20 × 30 raio 20 Primary borda 1px Ink, sombra `0 4px 6px rgba(20,13,10,.15)`, ícones `icon-minus.svg`/`icon-plus.svg` 16; número 18/500 lh25 foreground; gap 12) | preço 20/700 lh16 Text/Accent (preço da edição selecionada).
- Linha `gap 12`: "Comprar NFT" 196 × 60 raio 40, fundo `linear-gradient(100.4deg, #D28A4C 4%, rgba(210,138,76,.8) 122%)`, 16/700 lh20 Ink · botão carrinho 60 × 60 circular bg Surface Raised borda 1px Color/Border com `icon-shop.svg` 20 (Color/Secondary) → link para `/cart`.
- O conteúdo da página precisa de `padding-bottom` ≥ 164px para não ficar sob a barra.
