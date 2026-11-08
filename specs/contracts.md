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
| 409 | `EMAIL_TAKEN` / `USERNAME_TAKEN` / `INSUFFICIENT_AVAILABILITY` / `QUOTE_STALE` / `IDEMPOTENCY_CONFLICT` | Conflitos |
| 422 | `VALIDATION_ERROR` / `COUPON_INVALID` / `COUPON_EXPIRED` / `WRONG_PASSWORD` | Validação de negócio |
| 503 | `SERVICE_UNAVAILABLE` | Falha transitória (pode repetir) |

## Sessão e conta

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ displayName, username, email, password }` | `201 { user, session }` · 409 · 422 |
| POST | `/auth/login` | `{ email, password }` | `200 { user, session }` · 401 |
| GET | `/auth/session` | — | `200 { user, session }` · 401 |
| POST | `/auth/logout` | — | `204` |

`session = { token, expiresAt }` · `user = { id, displayName, username, email, avatarUrl }`

## NFTs

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/nfts?q&tab&category&network&minPrice&maxPrice&sort&page&pageSize` | `{ items: NftSummary[], page, pageSize, total, totalPages, facets }` |
| GET | `/nfts/featured` | `NftSummary` (hero e card "NFT em destaque") |
| GET | `/nfts/:nftId` | `NftDetail` · 404 |

- `tab`: `all` \| `new` \| `trending` · `category`: slugs separados por vírgula (`digital-art,music`) · `network`: `ethereum` \| `polygon` \| `solana` (múltiplos) · `minPrice`/`maxPrice`: string decimal · `sort`: `recent` \| `price-asc` \| `price-desc` \| `name`
- `facets = { categories: { slug, label, count }[], networks: { slug, label, count }[], priceRange: { min, max } }` (contagens da sidebar)
- `NftSummary = { id, name, image, category, collection, network, price, compareAtPrice, available, isNew, isTrending, rarity, version }` (`compareAtPrice` = preço riscado, como "2.29 ETH" no Figma)
- `NftDetail = NftSummary + { tokenId, description, longDescription, images[], rating, reviewsCount, reviews[], attributes[], network, contractAddress, royaltyPercent, editions: Edition[] }`
- `Edition = { id, kind, label, supply, available, price }`

## Favoritos (autenticado)

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/favorites` | `{ nftIds: string[] }` |
| PUT | `/favorites/:nftId` | `{ nftIds }` |
| DELETE | `/favorites/:nftId` | `{ nftIds }` |

## Carrinho (visitante ou autenticado)

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/cart` | — | `Cart` |
| POST | `/cart/items` | `{ nftId, editionId, quantity }` | `Cart` · 409 `INSUFFICIENT_AVAILABILITY` |
| PATCH | `/cart/items/:itemId` | `{ quantity }` | `Cart` · 409 |
| DELETE | `/cart/items/:itemId` | — | `Cart` |
| PUT | `/cart/coupon` | `{ code }` | `Cart` · 422 `COUPON_INVALID` / `COUPON_EXPIRED` |
| DELETE | `/cart/coupon` | — | `Cart` |
| POST | `/cart/merge` | `{ guestCartId }` | `Cart` (autenticado) |

`Cart = { id, items: CartItem[], couponCode, version }` · `CartItem = { id, nftId, editionId, name, image, tokenId, editionLabel, unitPrice, quantity, available, lineTotal }`

## Cotação

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/quote` | `{ network? }` | `Quote` |

`Quote = { id, cartVersion, items: QuoteLine[], subtotal, discount, networkFee, total, coupon: { code, status } \| null, network, issues: QuoteIssue[], createdAt }`
`QuoteIssue = { type: PRICE_CHANGED \| AVAILABILITY_CHANGED \| SOLD_OUT, itemId, previous, current }`

## Pedidos (autenticado)

| Método | Rota | Cabeçalhos / corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/orders` | `Idempotency-Key: <uuid>` · `{ quoteId, walletId, network, buyer: { fullName, email } }` | `201 Order` (novo) · `200 Order` (mesma chave + mesmo corpo) · 409 `IDEMPOTENCY_CONFLICT` · 409 `QUOTE_STALE` (+ `details.quote`) |
| GET | `/orders/:orderId` | — | `Order` · 404 · 403 |
| GET | `/orders/active` | — | `Order \| null` (pedido pendente do usuário) |

`Order = { id, status: pending \| confirmed \| declined, txHash, explorerUrl, createdAt, confirmedAt, declineReason, wallet, network, items (snapshot), subtotal, discount, networkFee, total, version }`

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
| POST | `/wallets/:walletId/connect` | `{ network }` | `{ status: "connected" }` · 422 `WALLET_REJECTED` |

## Eventos Socket.IO

Conexão: `io(VITE_SOCKET_URL, { transports: ['websocket'], auth: { token } })`. Sem token, o socket recebe apenas eventos públicos.

Envelope comum:

```ts
{ eventId: string; type: 'nft.updated' | 'order.updated'; resource: { type: 'nft' | 'order'; id: string }; version: number; occurredAt: string; data: ... }
```

| Evento | Destinatário | `data` |
| --- | --- | --- |
| `nft.updated` | Todos | `{ nftId, price, available, editions: Edition[] }` |
| `order.updated` | Somente o dono (pelo token do handshake) | `{ orderId, status, txHash, declineReason }` |

Regras do cliente: ignora `eventId` já processado e `version` menor ou igual à última aplicada no recurso; ao reconectar, invalida as queries ativas de catálogo, detalhe, carrinho e pedido pendente.
