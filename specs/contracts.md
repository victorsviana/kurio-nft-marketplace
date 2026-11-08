# Contratos REST e eventos

Fonte executável: `src/shared/contracts/*.ts` (zod). Este documento é o desenho; em caso de divergência, o código vence e este arquivo deve ser corrigido.

## Convenções

- Base: `/api`. JSON. Datas em ISO 8601 (UTC).
- Dinheiro: `string` decimal em ETH (`"1.19"`, `"26.846"`). Quantidade: inteiro.
- Autenticação: `Authorization: Bearer <token>`. Visitante identifica o carrinho com `X-Guest-Cart-Id: <uuid>` (gerado e guardado pelo cliente).
- Recursos versionados (`version: number`) para ordenar eventos e detectar cotação desatualizada.
- Erro padrão:

```json
{ "error": { "code": "COUPON_EXPIRED", "message": "Este cupom expirou.", "fieldErrors": { "code": "..." }, "details": {} } }
```

| HTTP | `code` | Uso |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Parâmetro malformado |
| 401 | `UNAUTHENTICATED` / `SESSION_EXPIRED` / `INVALID_CREDENTIALS` | Sem sessão, sessão expirada, login inválido |
| 403 | `FORBIDDEN` | Recurso de outro usuário |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 409 | `EMAIL_TAKEN` / `USERNAME_TAKEN` / `INSUFFICIENT_AVAILABILITY` / `QUOTE_STALE` / `IDEMPOTENCY_CONFLICT` / `ORDER_IN_PROGRESS` | Conflitos |
| 422 | `VALIDATION_ERROR` / `COUPON_INVALID` / `COUPON_EXPIRED` / `WRONG_PASSWORD` / `WALLET_REJECTED` / `WALLET_DISCONNECTED` | Validação de negócio |
| 500 | `INTERNAL_ERROR` | Falha inesperada (cenários de erro) |
| 503 | `SERVICE_UNAVAILABLE` | Falha transitória (pode repetir) |

## Sessão e conta

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ username, email, password, displayName? }` (sem nome no Figma → padrão = username) | `201 { user, session }` · 409 (`fieldErrors` por campo) · 422 |
| POST | `/auth/login` | `{ email, password }` | `200 { user, session }` · 401 |
| GET | `/auth/session` | — | `200 { user, session }` · 401 |
| POST | `/auth/logout` | — | `204` |

`session = { token, expiresAt }` · `user = { id, displayName, username, email, avatarUrl }`

## NFTs

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/nfts?q&tab&category&network&minPrice&maxPrice&sort&page&pageSize` | `{ items: NftSummary[], page, pageSize, total, totalPages, facets }` |
| GET | `/nfts/featured` | `{ hero: NftSummary, spotlight: NftSummary }` (arte do hero e card "NFT em destaque") |
| GET | `/nfts/:nftId/related` | `{ items: NftSummary[] }` ("Mais desta coleção", até 15) · 404 |
| GET | `/nfts/:nftId` | `NftDetail` · 404 |

- Os parâmetros são **os mesmos da URL** (`catalogSearchSchema`, validado pelo router e pelo handler): `q` · `tab`: `all` \| `new` \| `trending` · `category`: slugs separados por vírgula em ordem canônica (`digital-art,music`) · `network`: `ethereum` \| `polygon` \| `solana` (vírgula) · `minPrice`/`maxPrice`: string decimal · `sort`: `recent` \| `price-asc` \| `price-desc` \| `name` · `page`. Valores padrão ficam fora da URL e da requisição. Valor malformado cai no padrão. `pageSize` é fixo no servidor (9).
- Facetas: cada contagem aplica todos os filtros ativos menos a própria dimensão. `priceRange` é o mínimo/máximo do catálogo inteiro.
- `facets = { categories: { slug, label, count }[], networks: { slug, label, count }[], priceRange: { min, max } }` (contagens da sidebar)
- `NftSummary = { id, name, image, category, collection, collectionSlug, network, price, compareAtPrice, available, isNew, isTrending, rarity, createdAt, version }` (`price` = edição padrão; `available` = soma das edições; `compareAtPrice` = preço riscado, como "2.29 ETH" no Figma; `image` segue `/images/nft/<arte>-512.webp`, com variantes 256/960)
- `NftDetail = NftSummary + { tokenId, creator, description, longDescription: string[], images: { url, alt }[], rating, reviewsCount, reviews[], attributes: { trait, value }[], contractAddress, tokenStandard, royaltyPercent, networkNote, defaultEditionId, editions: Edition[] }`
- `Edition = { id, kind: unique \| limited-10 \| limited-50 \| open, label: "1/1" \| "1/10" \| "1/50" \| "ABERTA", supply (null = aberta), available, price }`

## Favoritos (autenticado)

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/favorites` | `{ nftIds: string[], items: NftSummary[] }` |
| PUT | `/favorites/:nftId` | idem · 404 |
| DELETE | `/favorites/:nftId` | idem |

O cliente aplica a mudança de forma otimista e, em falha, reverte só o NFT afetado (FAV-02).

## Carrinho (visitante ou autenticado)

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/cart` | — | `Cart` |
| POST | `/cart/items` | `{ nftId, editionId, quantity }` | `Cart` · 409 `INSUFFICIENT_AVAILABILITY` |
| PATCH | `/cart/items/:itemId` | `{ quantity }` | `Cart` · 409 |
| DELETE | `/cart/items/:itemId` | — | `Cart` |
| PUT | `/cart/coupon` | `{ code }` | `Cart` · 422 `COUPON_INVALID` / `COUPON_EXPIRED` |
| DELETE | `/cart/coupon` | — | `Cart` |
| POST | `/cart/merge` | `{ guestCartId }` | `Cart` (autenticado; repetir é inócuo) |

`Cart = { id, items: CartItem[], couponCode, version }` · `CartItem = { id, nftId, editionId, name, image, tokenId, editionLabel, unitPrice, quantity, available, lineTotal }`

- O carrinho não traz totais: o resumo vem sempre da cotação (CART-06).
- Merge: o login/cadastro chama `/cart/merge` com o **token novo antes** de iniciar a sessão no cliente; quantidades da mesma edição somam e são limitadas ao estoque; o carrinho do visitante é apagado e o `X-Guest-Cart-Id` é trocado.

## Cotação

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/quote` | `{ network?, previousQuoteId? }` | `Quote` (visitante ou autenticado) · 403 (cotação de outro carrinho) |

`Quote = { id, cartVersion, items: QuoteLine[], subtotal, discount, networkFee, total, coupon: { code, status: applied \| invalid \| expired } \| null, network, issues: QuoteIssue[], purchasable, createdAt }`
`QuoteLine = { itemId, nftId, editionId, name, image, tokenId, editionLabel, unitPrice, quantity, available, lineTotal }` (também é o snapshot do pedido)
`QuoteIssue = { type: PRICE_CHANGED \| AVAILABILITY_CHANGED \| SOLD_OUT \| ITEM_REMOVED \| COUPON_CHANGED \| FEE_CHANGED, itemId \| null, label, previous, current }`

- Desconto = subtotal × % do cupom; taxa por rede (`ethereum 0.016`, `polygon 0.002`, `solana 0.0005`, alterável pelo controle); total = subtotal − desconto + taxa. Arredondamento para baixo em 6 casas, sempre com `big.js` no servidor.
- Com `previousQuoteId`, `issues` descreve o que mudou desde a cotação revisada; sem ele, só problemas de estoque. `purchasable = false` quando uma linha excede o estoque ou esgotou.
- O cliente usa a cotação como query (chave `['cart', dono, 'quote', rede]`), então qualquer invalidação do carrinho (mutation, `nft.updated`, reconexão) a recalcula.

## Pedidos (autenticado)

| Método | Rota | Cabeçalhos / corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/orders` | `Idempotency-Key: <uuid>` · `{ quoteId, walletId, network, buyer }` | `201 Order` (novo) · `200 Order` (mesma chave + mesmo corpo) · 400 sem chave · 409 `IDEMPOTENCY_CONFLICT` · 409 `QUOTE_STALE` (+ `details.quote` com `issues`) · 409 `ORDER_IN_PROGRESS` (+ `details.orderId`) · 422 `WALLET_DISCONNECTED` · 422 `VALIDATION_ERROR` |
| GET | `/orders/:orderId` | — | `Order` · 404 · 403 (pedido de outro usuário, sem dados) |
| GET | `/orders/active` | — | `{ order: Order \| null }` (pedido pendente do usuário) |

`buyer = { displayName, username, profileName, ensSuffix: ".eth", email, walletAddress, walletKind, secondaryReference, referralCode, note }` (campos do formulário do Figma; o mesmo schema valida o formulário e o corpo).
`Order = { id, status: pending \| confirmed \| declined, txHash, explorerUrl, createdAt, confirmedAt, declineReason, wallet: { id, address, kind, label }, network, buyer: { displayName, username, email }, items: QuoteLine[] (snapshot), subtotal, discount, networkFee, total, couponCode, version }`

Regras do servidor simulado:
1. **Idempotência** (ORD-06): o registro chave → pedido só é gravado quando um pedido é criado. Mesma chave + mesmo corpo (impressão digital com chaves ordenadas) = mesmo pedido; corpo diferente = 409.
2. **Revalidação** (CHK-05): antes de criar, o servidor recalcula o carrinho e compara **valores** (preço por linha, quantidade, estoque, cupom/desconto, taxa, rede) com a cotação revisada — não a `cartVersion`, porque mudar o preço não muda o carrinho. Qualquer diferença → 409 `QUOTE_STALE` com a cotação nova e as diferenças.
3. **Carteira**: o endereço do `buyer` precisa ser o da carteira cadastrada escolhida, e a carteira precisa estar conectada para aquela rede (`/wallets/:id/connect`).
4. **Ciclo de vida**: criado `pending`; liquida em ~2 s com o resultado do cenário (`payment-declined` → recusado). Confirmar consome o estoque (emite `nft.updated`), remove do carrinho só as quantidades compradas (ORD-04) e gera `txHash`/`explorerUrl` simulados; se o estoque acabou antes, o pedido é recusado. Toda liquidação incrementa `version` e emite `order.updated` só para o dono. `confirmed` e `declined` são terminais.
5. **Timeout** (cenário `order-timeout`): o pedido é criado e persistido e só depois a resposta atrasa 6 s (uma vez por chave); o cliente desiste em 4 s e repete com a mesma chave, recebendo o mesmo pedido em 200.
6. **Recuperação após refresh**: o servidor simulado vive na página, então os timers morrem no refresh; pedidos pendentes são reagendados no boot e liquidados na leitura (`GET /orders/:id`, `/orders/active`).

## Perfil e carteiras (autenticado)

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/profile` | — | `Profile` |
| PATCH | `/profile` | `{ displayName, username, email, ensName, walletNickname }` | `Profile` · 409 · 422 |
| PUT | `/profile/avatar` | `{ dataUrl }` | `Profile` |
| DELETE | `/profile/avatar` | — | `Profile` |
| POST | `/profile/password` | `{ currentPassword, newPassword }` | `204` · 422 `WRONG_PASSWORD` |
| GET | `/wallets` | — | `{ primary: Wallet \| null, secondary: Wallet \| null }` |
| PUT | `/wallets/:slot` | `WalletInput` | `Wallet` · 422 |
| POST | `/wallets/:walletId/connect` | `{ network, kind }` | `{ status: "connected" }` · 422 `WALLET_REJECTED` (cenário `wallet-rejected`) |
| DELETE | `/wallets/:walletId/connect` | — | `204` (desconectar) |

## Eventos Socket.IO

Conexão: `io(VITE_SOCKET_URL, { transports: ['websocket'], auth: { token } })`. Sem token, o socket recebe apenas eventos públicos. Um cliente por sessão: trocar de token fecha o socket anterior e abre outro. `socket.io-client` é importado sob demanda, depois do boot do MSW (o engine.io captura `globalThis.WebSocket` ao ser avaliado).

Envelope comum:

```ts
{ eventId: string; type: 'nft.updated' | 'order.updated'; resource: { type: 'nft' | 'order'; id: string }; version: number; occurredAt: string; data: ... }
```

| Evento | Destinatário | `data` |
| --- | --- | --- |
| `nft.updated` | Todos | `{ nftId, price, compareAtPrice, available, editions: Edition[] }` |
| `order.updated` | Somente o dono (pelo token do handshake) | `{ orderId, status, txHash, declineReason }` |

Regras do cliente: ignora `eventId` já processado e `version` menor ou igual à última aplicada no recurso; ao reconectar, invalida as queries ativas de catálogo, detalhe, carrinho e pedido pendente.
