# Desktop / Carrinho de NFTs — spec extraída do Figma (node 11:1278)

Fonte: `get_design_context` em 2026-11-08. Referência visual: `../frames/desktop-carrinho-de-nfts.png`. Assets: `./assets/`.
Frame 1440, conteúdo 1200 (`px 120 py 24`), `gap 96` entre seções. Header global com "Mercado" ativo, **sem divisor**. Footer global.

## Top (gap 32 abaixo do header) → bloco Cart (w 1200, gap 12)
- Breadcrumb "Início / Mercado / Carrinho" 15/700 lh16 foreground.
- Cart Body: linha `justify-between` = Tabela (≈782) | Resumo (w 332).

### Tabela (gap 12)
- Cabeçalho (`pr 24`, `justify-between`): "NFTs" (w 250, 16/700) · "Preço" (w 77, 16/500) · "Edições" (w 75, 16/700) · "Total" (w 87, 16/500) · espaçador 24. Todos lh16 foreground.
- Regra 0.3px Primary (`table-rule.svg`) largura total.
- Itens (gap 12): linha h 70, bg Surface Card `#241612`, `pr 24`, `justify-between`, sem raio:
  - Coluna NFT (w 250, gap 16): arte 70×70 raio 6 (cola na borda esquerda) · nome 16/700 lh16 foreground + "ID do token: #0042" 14/400 lh16 Color/Secondary `#B39463` (gap 6, w ~154).
  - Preço unitário 16/700 lh16 Text/Secondary `#CFB28C`.
  - Stepper (gap 12): botões 20×30 raio 20 Primary, borda 1px Ink, drop-shadow `0 4px 6px rgba(20,13,10,.15)`, ícones `icon-minus.svg`/`icon-plus.svg` 16 (fill preto); número 17/400 lh24 foreground.
  - Total da linha (w 87) 16/700 lh16 Text/Accent `#E89B55`.
  - Remover: `icon-delete.svg` 24 (stroke `#B39463`).

### Resumo "Resumo da carteira" (w 332, gap 24)
- Título 18/700 lh16 foreground + regra 0.3px Primary (`summary-rule.svg`), gap 12.
- Código promocional (gap 8): rótulo 14/700 lh16; input h 40 borda 1px Primary raio 3 `pl 8`, placeholder "Digite o código promocional..." 12/400 lh16 `#B39463`; botão "Aplicar" 102×40 Primary (raio só à direita 3) 15/700 Ink.
- Taxas (gap 12, 400): Subtotal 15 lh normal | valor 18 lh16 right · "Desconto do lançamento" 15 | "(-) 00.00" 15 · Taxa de rede 15 | "0.016 ETH" 18; abaixo, alinhado à direita, "Taxa estimada" 12 lh16 Text/Accent.
- Total: "Total" 16/700 foreground | "26.846 ETH" 18/700 Text/Accent.
- CTA (gap 12, centralizado): botão h 40 largura total Primary raio 3 "Conectar e finalizar" 15/700 Ink · link "Continuar explorando" 15/400 Text/Accent.

## Related "Colecionadores também viram"
- Cabeçalho 17/700 lh16 Text/Accent + regra 0.3px (`section-rule.svg`), gap 12; gap 32 até os cards.
- 5 cards (219×255 bg Surface Card, arte ~212 raio 17 centralizada), gap 8: nome 15/400 foreground, preço 16/700 lh16 Text/Accent. `carousel-dots.svg` 52×12 abaixo (gap 32). Mesmo padrão do "Mais desta coleção" do Detalhe → reutilizar o carrossel de relacionados.

## Estados não desenhados (seguir o mesmo padrão)
- Carrinho vazio, skeleton (linhas 70 px + resumo), erro com "Tentar novamente", item com preço alterado / disponibilidade reduzida / esgotado (texto + ícone, não só cor), cupom aplicado (código + "Remover"), erros do cupom (inválido / expirado) abaixo do input.
