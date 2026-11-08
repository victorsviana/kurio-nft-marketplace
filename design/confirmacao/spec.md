# Modal de Confirmação de pedido — spec extraída do Figma (node 70376:239)

Fonte: `get_design_context` em 2026-11-08. Referência: `../frames/desktop-confirmacao-de-pedido.png`. Assets: `./assets/`.
No frame desktop o modal (578 de largura, ≈ 821 de altura) fica centralizado (top ≈ 166) sobre um scrim que cobre a página de Pagamento. Rota real: `/orders/$orderId` (acesso direto/refresh); no mobile o mesmo conteúdo ocupa a tela (sem frame específico).

## Estrutura (bg Surface Card `#241612`, sem raio)
- Fechar: `icon-close.svg` 18×17 no canto superior direito (≈ 14px da direita, 17px do topo). Fecha → volta ao início (ou "Continuar explorando").
- Header h 156, coluna centralizada gap 16: ilustração `thank-you.svg` (65×80 dentro de caixa 80×80) + "Seus NFTs agora estão na sua carteira" 16/700 lh16 Text/Secondary `#CFB28C`.
- Regra 1px Primary sólida.
- Meta h 65, `px 36 py 4`, `justify-between`, 4 colunas separadas por divisores verticais 31px Primary (`meta-divider.svg` rotacionado 90°): rótulo 14 lh16 + valor 15 lh normal, tudo Text/Secondary. Rótulos "ID da transação" (700) · "Data" (400) · "Total" (400) · "Carteira" (700). Valores: hash abreviado `0xA91F…E82C`, data "29 Jul, 2026", total "26.846 ETH", "MetaMask".
- Regra 1px Primary.
- Detalhes `pt 20 pb 48 px 44`, gap 12:
  - "Detalhes da transação" 15/700 lh16 foreground.
  - Cabeçalho "NFTs" 16/700 | "Edições" 16/700 + "Subtotal" 16/500 (gap 48) + regra 0.3px Primary (`table-rule.svg`).
  - Itens (gap 12) h 70 bg Surface Card: arte 65–70 raio 8 + nome 16/700 + "ID do token" 14/400 `#B39463` (gap 12/6) | "(x 2)" 14/400 Text/Secondary + valor 18/700 Text/Accent (gap 48, alinhados à direita).
  - Totais alinhados à direita (w 321, gap 12): "Taxa de rede" 15/400 | 18/400 foreground · "Total" 16/700 | 18/700 Text/Accent.
  - Regra 0.3px.
  - Nota 14/400 lh22 Text/Secondary centralizada: "Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira conectada e registrada na rede." (rede vem do pedido).
  - Botão "Ver no Etherscan" `p 16` Primary raio 5, 16/700 lh16 Ink → `explorerUrl` simulado (link externo; Polygon → "Ver no Polygonscan").
- Faixa inferior 10px Primary.

## Estados não desenhados
- **Pendente**: mesma moldura, ilustração substituída por spinner/ícone de relógio, título "Aguardando confirmação da rede", meta com "Pedido" (id) e status textual; sem botão de explorer. Atualiza por `order.updated` e por refetch.
- **Recusado**: título "Pagamento recusado" com motivo (`declineReason`), itens preservados no carrinho, CTA "Voltar ao carrinho"/"Tentar novamente".
- Desconto aparece como linha extra quando > 0 (o recibo reproduz o snapshot: subtotal, desconto, taxa, total).
