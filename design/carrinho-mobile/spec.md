# Mobile / Carrinho de NFTs — spec extraída do Figma (node 16:360)

Fonte: `get_design_context` em 2026-11-08. Referência: `../frames/mobile-carrinho-de-nfts.png`. Assets: `./assets/`.
Frame 414 (raio 40 do aparelho, ignorar). Fundo Ink. Sem header global nem tab bar (o frame não tem): rota com `mobileHeader: false`, `mobileTabBar: false`, `mobileFooter: false` abaixo de 768.

## Conteúdo (`pt 32`, `px 28`, gap 12)
- Screen header h 44: botão voltar 35 (círculo `back-circle.svg`: bg Surface Raised `#2F1D15`, borda `#3F2319`) com `icon-arrow-left.svg` (seta stroke `#B39463`, girada para apontar à esquerda) · título "Carrinho de NFTs" 20/700 lh16 foreground centralizado (left 96, top 9).
- Itens (gap 20), cada um 358×100 bg `#241612` raio 14, sombra `0 6px 20px rgba(10,6,4,.45)`:
  - Arte 100×100 à esquerda, raio só à esquerda 14.
  - Texto (left 109): nome 15/700 lh16 foreground (top 13) · "Edição: 1/50" 14/400 lh16 Text/Secondary (top 35) · total da linha 18/700 lh16 Text/Accent (top 69). (No frame o valor é o total da linha: 1.79 × 2 = 3.58.)
  - Stepper (left 261, top 38): "−" 24 (`minus-active.svg`; `minus-disabled.svg` com traço `#55321F` quando quantidade = 1) · quantidade 16/400 lh22 foreground (centro ≈ left 298) · "+" 24 círculo Surface Raised borda `#3F2319` com "+" 21/400 foreground.
  - Remover: o frame mostra `icon-delete.svg` (stroke Primary) sobreposto ao "+" num item (estado de arraste / erro do frame). Implementação: quando a quantidade é 1, o "−" vira lixeira (remove); sempre há um botão de remover acessível. Registrar em ARCHITECTURE.
- Painel de resumo (bg Surface Card, raio só no topo 40, `pt 24 pb 36 px 24`, `justify-between`, fixo embaixo/flex-1):
  - Cupom h 50 raio 40 borda `#3F2319` bg Surface Card, drop-shadow `0 6px 10px rgba(10,6,4,.45)`, `pl 16`, placeholder 13/400 lh22 `#B39463`; botão "Aplicar" 97×50 raio 40 gradiente `linear-gradient(96deg, rgba(210,138,76,.54) 0.9%, #D28A4C 105%)`, 15/700 lh16 foreground.
  - Linhas (gap 12): Subtotal 15 | 16 lh16 · Desconto 15 | "(-) 00.00" 15 · Taxa de rede 15 | 16 + "Taxa estimada" 12 Text/Accent à direita · Total 16/700 | 18/700 Text/Accent.
  - CTA h 60 raio 40 gradiente `linear-gradient(109deg, #D28A4C 4%, rgba(210,138,76,.8) 122%)`, "Conectar e finalizar" 16/700 lh16 Ink.
