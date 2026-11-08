# Desktop / Pagamento — spec extraída do Figma (instância "Checkout Page" 70522:3321 do frame 11:2862)

Fonte: `get_design_context` em 2026-11-08. Referência visual: `../frames/desktop-pagamento.png`. Assets: `./assets/`.
Frame 1440, conteúdo 1200. Header global com "Mercado" ativo (sem divisor), gap 32 até o conteúdo. Footer global. O mesmo componente fica atrás do modal de Confirmação.

## Conteúdo (gap 32)
- Breadcrumb "Início / Mercado / Pagamento" 15/700 lh16 foreground.
- Linha `gap 32`: formulário (flex-1 ≈ 763) | coluna direita (w 405).

### Formulário "Perfil do colecionador" (título 17/700 lh16, gap 12; corpo gap 24)
- Duas colunas `gap 24`, cada uma com campos `gap 12`.
- Campo: rótulo 15/400 lh15 foreground + asterisco 22/400 lh29 Text/Coral `#F0805F` (obrigatório); controle h 40 borda 1px Color/Border `#3F2319` raio 3, sem fundo; placeholder 14/400 lh15 Color/Secondary `#B39463`, `pl 12`.
- Selects: mesmo controle, `pl 12 pr 8`, seta `icon-arrow-down.svg` 18 (fill `#B39463`) à direita.
- Coluna esquerda: Nome de exibição* · Rede* (select "Selecione uma rede") · Endereço da carteira* (placeholder "Endereço 0x da carteira") · Tipo de carteira* (select "Selecione uma carteira") · E-mail*.
- Coluna direita: Nome de usuário* · Nome do perfil* · (sem rótulo, alinhado ao endereço) "ENS ou carteira secundária (opcional)" · Código de indicação* · Nome ENS* = select compacto 78×40 com ".eth" 15/400 foreground + `icon-arrow-down-ens.svg` (fill foreground).
- Abaixo: radio 15 (`radio-15.svg`, anel 2px Primary) + "Usar outra carteira?" 15/400 (gap 8).
- "Observação do colecionador (opcional)" 15/400 lh15 + textarea 350×152 borda `#3F2319` raio 3 (gap 12).

### Coluna direita (w 405, gap 12)
- "Seus NFTs" 17/700 lh16.
- Cabeçalho "NFTs" 16/700 | "Subtotal" 16/500 (lh16) + regra 0.3px Primary (`table-rule.svg`).
- Linhas h 70 bg Surface Card `pl 4 pr 16`: arte 66–70 raio 8 · nome 16/700 lh16 + "ID do token: #0042" 14/400 `#B39463` (gap 6) · "(x 2)" 14/400 Text/Secondary `#CFB28C` + valor 18/700 Text/Accent (gap 6–20).
- Resumo (gap 12, centralizado): "Tem um código promocional? Aplique aqui" 14/400 lh16 centro · Subtotal 15 | 18 · Desconto 15 | "(-) 00.00" 15 · Taxa de rede 15 | 18 · "Taxa estimada" 12 Text/Accent centro · regra 0.3px (`total-rule.svg`) · Total 16/700 | 18/700 Text/Accent.
- "Carteira e rede" 17/700 lh16 centralizado (gap 20).
- Opções (gap 16), cada uma h 45 borda 1px `#3F2319` raio 3 `pl 12`: radio 16 (`radio-16.svg`, anel 1.2px Primary) + rótulo 15/400 foreground (gap 10). Opção 1 usa o chip "METAMASK • WALLETCONNECT • COINBASE" (224×26 bg Surface Dark `#38220F`, borda Border Soft `#55321F` raio 6, 9/700 Text/Accent tracking .1) como rótulo; opção 2 "MetaMask"; opção 3 selecionada "Coinbase Wallet" com borda Primary e radio preenchido (`radio-selected-frame.svg`: anel + miolo 5px Primary), `pl 16`, gap 12.
- CTA "Confirmar compra" h 45 Primary raio 8, 15/700 lh16 Ink centralizado (gap 24 depois das opções).

## Interpretação funcional (estados não desenhados)
- O formulário é preenchido com o perfil e a carteira principal cadastrada (WAL-03); "Usar outra carteira?" troca para a secundária. Rede e tipo vêm da carteira e podem ser trocados.
- As opções de "Carteira e rede" são os conectores; o escolhido é conectado (simulação: conecta / recusa / desconecta).
- "Confirmar compra" → validação → conexão → revisão com cotação revalidada → envio idempotente → pendente → confirmação.
