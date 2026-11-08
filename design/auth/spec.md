# Entrar / Criar conta — spec extraída do Figma (Sign In Modal 70381:239, Sign Up Modal 70383:239)

Fonte: `get_design_context` em 2026-11-08. Referências: `../frames/desktop-login.png`, `../frames/desktop-cadastro.png`, `../frames/mobile-login.png`, `../frames/mobile-cadastro.png` (os frames mobile não foram lidos via MCP; derivar dos modais + PNG). Assets: `./assets/` (`icon-close.svg`, `icon-google.svg` já composto, `icon-facebook.svg`, `icon-hide.svg`, `divider-line.svg`; `google-parts/` são as peças originais).

## Desktop: modal sobre a Home
- No Figma o modal aparece sobre a Home (header com divisor, "Início" ativo), com scrim. O Footer fica **abaixo** do scrim.
- Implementação: as rotas `/login` e `/signup` continuam sendo URLs reais (acesso direto e refresh, GEN-02). Em `md+` a página renderiza a Home ao fundo (ou fundo neutro) e o conteúdo num `Dialog` do shadcn aberto; fechar (X, Esc, clique no scrim) navega para `redirect` ou `/`. Em `< md` renderiza como tela cheia (frame mobile).

## Modal (500 de largura; Sign In ≈ 600 de altura, Sign Up ≈ 656; bg Surface Card; raio 8 no Sign Up, 0 no Sign In → usar 8 em ambos)
- Botão fechar `icon-close.svg` 18 (Primary) no canto superior direito (≈ 12px do topo, 13px da direita).
- Faixa decorativa Primary de 10px de altura colada na borda inferior (largura total).
- Cabeçalho (`pt 48 px 48`, gap 40): alternador "Entrar | Criar conta" 20/500 lh16, separados por barra vertical 1px Text/Coral `#F0805F` (gap 8). Aba ativa em Text/Accent, inativa em foreground. São links entre `/login` e `/signup` preservando `redirect` (role tablist não é necessário; são navegação).
  - Subtítulo 13/400 lh16 foreground centralizado: Login "Entre para gerenciar sua carteira, coleção e perfil de criador." · Cadastro "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
- Formulário (`pt 24 px 80`, gap 12): inputs 340 × 40, borda 1px Color/Border `#3F2319` (foco/ativo: Primary), raio 5, `px 16`, texto 14 lh16 (valor foreground 16 no campo de senha), placeholder Color/Secondary `#B39463`.
  - Login: e-mail (placeholder "contato@email.com") · senha com botão mostrar/ocultar `icon-hide.svg` (19 × 14.6, traço Color/Secondary) a 12px da direita · link "Esqueceu a senha?" 14/400 Text/Accent alinhado à direita → fora do escopo: aviso "em breve" (GEN-03).
  - Cadastro: "Nome de usuário" · "Digite seu e-mail" · "Senha" (com mostrar/ocultar) · "Confirmar senha". **Não há campo de nome de exibição**: o contrato aceita `displayName` opcional e o servidor usa o username.
  - Labels visíveis não existem no Figma: usar `<Label className="sr-only">` + placeholder, e mensagens de erro abaixo de cada campo (13/400 Text/Coral ou `--color-danger`), ligadas por `aria-describedby`, com `aria-invalid` e borda vermelha (desvio documentado: estados de erro não desenhados).
- CTA (`pt 24 px 80`): botão 340 × 45 Primary raio 5, 16/700 lh16 Ink ("Entrar" / "Criar conta"). Estado de envio: desabilitado + "Entrando…"/"Criando conta…".
- Social (`pt 24`, gap 12 no login / 16 no cadastro): divisor de largura total — linhas 1px Color/Border + "Ou continue com" 13/400 foreground (gap 12); botões "Continuar com Google" / "Continuar com Facebook" 340 × 40 borda 1px Color/Border raio 5, ícone 20 + texto 13/500 lh16 Text/Secondary (gap 12) → fora do escopo: aviso "em breve" (GEN-03).

## Mobile (frames `mobile-login.png` / `mobile-cadastro.png`)
- Tela cheia bg Ink, sem header global e sem tab bar. "KURIO" grande centralizado (~32/700 tracking) no topo (~120px), título "Entrar"/"Criar conta" 20/700 centralizado, formulário com `px 28` (inputs largura total, h 50, raio 10, borda `#3F2319`; senha ativa com borda Primary), "Esqueceu a senha?" à direita, CTA largura total h 60 raio 10 Primary 16/700 Ink, divisor "Ou continue com", botões sociais largura total h 40, e no rodapé o link "Novo na Kurio? Crie uma conta" (14/400 Text/Secondary) — no cadastro, o inverso ("Já tem conta? Entrar").

## Comportamento (AUTH-01..AUTH-05)
- Validação no cliente com os schemas de `@/shared/contracts` (`loginInputSchema`, `registerInputSchema` + confirmação de senha); erros da API (`fieldErrors` de 409/422) aparecem no campo correspondente; 401 `INVALID_CREDENTIALS` mostra erro de formulário (`role="alert"`).
- Sucesso: navega para `safeRedirect(search.redirect)`; anuncia via `useAnnounce`.
- `?reason=expired` mostra aviso "Sua sessão expirou. Entre novamente para continuar." no topo do formulário.
