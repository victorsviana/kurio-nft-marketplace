# Mobile / Pagamento — spec extraída do Figma (node 16:748)

Fonte: `get_design_context` em 2026-11-08. Referência: `../frames/mobile-pagamento.png`. Assets: `./assets/`.
Frame 414, fundo Ink, `px 28 py 32`, conteúdo em coluna `justify-between` (CTA colado embaixo). Sem header global / tab bar / footer abaixo de 768.

## Conteúdo (gap 16)
- Screen header h 44: voltar 35 (`back-circle.svg` + `icon-arrow-left.svg`, igual ao carrinho mobile) · título "Pagamento com carteira" 20/700 lh16 foreground (left 59, top 9).
- Linha `justify-between`: "Carteira conectada" 16/700 lh16 foreground | "Trocar carteira" 14/700 lh16 Text/Accent (ação → leva a `/account/wallets`).
- Cartões das carteiras cadastradas (gap 20), 358×93 bg Surface Card raio 14 (o selecionado com sombra `0 20px 20px rgba(10,6,4,.45)`):
  - radio 16 em left 19 / top 39 (`radio-on.svg` anel 1.2 Primary + miolo r4; `radio-off.svg` anel `#55321F`).
  - Nome do slot 16/700 lh16 foreground (left 54, top 15): "Reserva" (secundária) / "Principal".
  - Duas linhas 14/400 lh22 Text/Secondary: identificador (ENS `nova.kurio.eth` ou endereço curto `0xA91F…E82C`) · "Rede Polygon" / "Rede principal Ethereum".
  - Kebab `icon-kebab.svg` 3×15 à direita (left 336) → menu com "Editar carteira" (vai para `/account/wallets`).
- "Carteira e rede" 16/700 lh16 (gap 16 até as opções).
- Opções de conector (gap 16), 359×65 bg Surface Card raio 15 sombra `0 0 20px rgba(10,6,4,.45)`:
  - Círculo 40 (`option-circle.svg`: Surface Raised + borda `#3F2319`) em left 14 / top 13 com letra 14/700 Text/Accent ("W", "M") ou ícone `icon-wallet.svg` (Coinbase).
  - Rótulo 14/400 lh16 foreground (left 65) "WalletConnect" / "MetaMask" / "Coinbase Wallet".
  - radio 16 à direita (left 326).
- Linha total alinhada à direita (gap 28): "Total:" 16/700 foreground · valor 18/700 Text/Accent.
- CTA 358×60 raio 40 gradiente `linear-gradient(108deg, #D28A4C 4%, rgba(210,138,76,.8) 122%)`, "Confirmar compra" 15/700 lh16 Ink.

## Interpretação
- O frame mobile não tem os campos do colecionador do desktop; o enunciado exige validar "os campos do layout". No mobile o formulário do colecionador fica num bloco recolhível "Dados do colecionador" pré-preenchido do perfil (validado igual ao desktop), acima de "Carteira conectada". Registrar o desvio.
