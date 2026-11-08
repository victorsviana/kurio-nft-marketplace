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
| 422 | `VALIDATION_ERROR` / `COUPON_INVALID` / `COUPON_EXPIRED` / `WRONG_PASSWORD` / `WALLET_REJECTED` | Validação de negócio |
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

`Order = { id, status: pending \| confirmed \| declined, txHash, explorerUrl, createdAt, confirmedAt, declineReason, wallet: { id, address, kind, label }, network, buyer, items: QuoteLine[] (snapshot), subtotal, discount, networkFee, total, couponCode, version }`

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
