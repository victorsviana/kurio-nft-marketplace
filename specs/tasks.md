# Tarefas por checkpoint

Cada tarefa cita os requisitos que atende ([`requirements.md`](./requirements.md)). Um checkpoint só fecha com `typecheck`, `lint`, os testes E2E do checkpoint passando, commit e deploy.

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` feito · **∥** pode rodar em paralelo (subagente) depois que as dependências fecharem.

## Checkpoint 0 — Specs

- [x] T0.1 Constituição — `constitution.md`
- [x] T0.2 Requisitos com IDs — `requirements.md`
- [x] T0.3 Desenho dos contratos — `contracts.md`
- [x] T0.4 Plano de tarefas — este arquivo
- [x] T0.5 Frames do Figma exportados — `../design/frames/*.png` (1 leitura da cota)

## Checkpoint 1 — Fundação e teste de risco

- [x] T1.1 Configuração: Tailwind v4, alias `@/`, shadcn, plugin do Router, oxlint, scripts (`dev`, `build`, `preview`, `typecheck`, `lint`, `test:e2e`, `lhci`) — QA-06
- [x] T1.2 Tokens visuais do Figma (cores, tipografia, raios) em CSS variables; fontes servidas localmente — GEN-04
- [x] T1.3 MSW no bootstrap por `VITE_ENABLE_MOCKS`, inclusive no build de produção — MOCK-01
- [x] T1.4 **Spike**: `socket.io-client` ↔ `@mswjs/socket.io-binding` emitindo um evento no build de produção — RT-01
- [x] T1.5 Árvore de rotas completa (placeholders), 404 e rewrites da Vercel — GEN-01, GEN-02
- [x] T1.6 Playwright (Chromium desktop + mobile, `webServer` no preview, relatório HTML, trace em falha) + smoke test — QA-01, QA-03
- [x] T1.7 Repositório GitHub público + deploy na Vercel — QA-05

## Checkpoint 2 — Dados, catálogo, detalhe e conta

Base (sequencial):
- [ ] T2.1 Contratos zod de todos os recursos, erros e eventos — todos
- [ ] T2.2 Banco simulado: fixtures (catálogo variado, 2 usuários, cupons), persistência versionada no localStorage, reset — MOCK-02, MOCK-03, MOCK-05
- [ ] T2.3 Motor de cenários (latência, falhas por rota, offline, fora de ordem) + API de controle em `src/mocks` + painel de cenários — MOCK-04, MOCK-06
- [ ] T2.4 Cliente Axios: base URL, token, `X-Guest-Cart-Id`, validação zod da resposta, normalização de erros, 401 de sessão — CAT-06, AUTH-04
- [ ] T2.5 Camada realtime: conexão por sessão, dedupe por `eventId`, controle de `version` por recurso, reconciliação na reconexão, limpeza de listeners — RT-01, RT-04..RT-08
- [ ] T2.6 UI base: shadcn com o visual Kurio, Header, Footer, layout, skeleton com shimmer, região `aria-live` — GEN-04, GEN-05, A11Y-04

Telas (∥ depois da base):
- [ ] T2.7 ∥ Início: hero, destaque, abas, sidebar de filtros/drawer mobile, ordenação, grade, paginação, estados — CAT-01..CAT-09, GEN-05, GEN-06
- [ ] T2.8 ∥ Detalhe: galeria, edições, quantidade, abas, relacionados, 404 — NFT-01..NFT-06
- [ ] T2.9 ∥ Conta: login e cadastro (modal no desktop, tela no mobile), sessão, guard, `?redirect=`, logout — AUTH-01..AUTH-06
- [ ] T2.10 E2E: CAT, NFT, AUTH (cenários 1, 2, 3 do §9)

## Checkpoint 3 — Compra e tempo real

- [ ] T3.1 ∥ Favoritos com atualização otimista e rollback — FAV-01..FAV-03
- [ ] T3.2 ∥ Carrinho: itens, quantidades, remoção, cupom, merge do visitante, persistência — CART-01..CART-06, CART-08
- [ ] T3.3 Cotação e checkout: dados do colecionador, carteira e rede, conexão/recusa, revisão, revalidação — CHK-01..CHK-05, CHK-07, WAL-03
- [ ] T3.4 Pedidos: Idempotency-Key persistida, pendente/confirmado/recusado, recuperação após refresh e reconexão, recibo snapshot, remoção parcial do carrinho — CHK-06, ORD-01..ORD-06
- [ ] T3.5 `nft.updated` no catálogo, detalhe e carrinho + cenário de checkout desatualizado — RT-02, RT-03, RT-09, CART-07
- [ ] T3.6 E2E: favoritos, carrinho, compra completa, falhas de pagamento, Socket.IO, eventos duplicados (cenários 4, 5, 6, 7, 9, 10 do §9)

## Checkpoint 4 — Perfil, carteiras e acabamento

- [ ] T4.1 ∥ Perfil: dados, avatar, senha — PRF-01..PRF-03
- [ ] T4.2 ∥ Carteiras: principal e secundária — WAL-01, WAL-02
- [ ] T4.3 Revisão responsiva em 390, 768 e 1440 px — GEN-04
- [ ] T4.4 Revisão de acessibilidade (teclado, foco, diálogos, formulários) — A11Y-01..A11Y-05
- [ ] T4.5 E2E restantes (cenários 8, 11, 12 do §9) + regressão visual — QA-01, QA-02
- [ ] T4.6 ∥ Lighthouse CI: 3 execuções × 2 perfis × 2 páginas, mediana, relatórios — QA-04
- [ ] T4.7 README, ARCHITECTURE e matriz de cobertura requisito → teste — QA-06
