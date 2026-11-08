# Arquitetura

Este documento cobre contratos, sessão, carrinho, cache, reconciliação REST × Socket.IO, a camada de simulação e os desvios do Figma. Os requisitos citados (`CAT-02`, `RT-05`…) estão em [`specs/requirements.md`](specs/requirements.md).

## Visão geral

```
src/
  app/            QueryClient, router, sincronização de sessão
  routes/         rotas file-based (TanStack Router); cada rota declara staticData de layout e guard
  features/       telas (catalog, nft-detail, auth, …): componentes e hooks de UI
  components/     layout (header, footer, tab bar), ui (shadcn adaptado), nft, feedback
  shared/
    contracts/    schemas zod = especificação executável (cliente + mocks)
    api/          instância Axios, erros normalizados, query keys, queryOptions por recurso
    session/      token da sessão, auth hooks, guards, carrinho do visitante
    realtime/     cliente Socket.IO por sessão, dedupe/versão, sincronização com o cache
    a11y/         região aria-live
  mocks/          servidor simulado: banco, domínio, handlers MSW, hub Socket.IO, cenários, painel
```

Regra de dependência: `features → shared/components`; `mocks → shared/contracts`. Nada fora de `src/mocks` importa mocks; o único ponto de contato é `main.tsx`, que liga o MSW quando `VITE_ENABLE_MOCKS=true` antes do primeiro render.

## Contratos

- `src/shared/contracts/*.ts` (zod 4) é a fonte da verdade; [`specs/contracts.md`](specs/contracts.md) é o desenho legível.
- O cliente valida **toda** resposta na fronteira do Axios (`apiRequest(schema, config)`); um desvio vira `ApiError` com código `CONTRACT_ERROR` em vez de dado malformado na tela.
- Os handlers MSW validam os corpos com os mesmos schemas (`readBody`) e devolvem `422 VALIDATION_ERROR` com `fieldErrors` no mesmo formato que os formulários usam.
- **Busca do catálogo**: o mesmo `catalogSearchSchema` valida a URL (`validateSearch`) e a query do handler. O router guarda search params como strings cruas (`parseSearchWith`/`stringifySearchWith` com identidade), então a URL é legível (`/?category=music,3d-art&page=2`) e a requisição leva exatamente os parâmetros da URL (CAT-06). Valores padrão ficam fora da URL; valores malformados caem no padrão (`.catch`).
- Dinheiro trafega como string decimal e é calculado com `big.js` (no servidor simulado). O cliente só formata strings (`formatEth`), nunca converte para `number` (CART-08).

## HTTP e erros

- Uma instância Axios (`src/shared/api/http.ts`), timeout de 10 s.
- Interceptor de requisição: `Authorization: Bearer <token>` da sessão atual e `X-Guest-Cart-Id`.
- Interceptor de resposta: normaliza tudo em `ApiError { status, code, message, fieldErrors, details, isRetryable }` (rede, timeout, cancelamento, contrato, envelope de erro da API).
- `401` só encerra a sessão se o token enviado **for o token atual**. Isso impede que uma resposta atrasada de uma sessão antiga derrube a sessão do próximo usuário.

## Sessão (AUTH-01..06)

- O cliente persiste apenas `{ token, expiresAt, userId }` em `localStorage["kurio.session"]` (`sessionStore`, `useSyncExternalStore`). Senha nunca é guardada; no banco simulado ela é SHA-256 com salt.
- O usuário vem de `GET /auth/session`, cacheado por token. Refresh restaura a sessão (AUTH-03).
- **Guards**: rotas privadas usam `beforeLoad: requireUser`, que revalida a sessão no servidor a cada navegação privada (no máximo a cada 10 s). Sem sessão → `/login?redirect=<url>`; sessão expirada → `/login?redirect=<url>&reason=expired` (AUTH-04, AUTH-06, CHK-01). `redirect` aceita só caminhos relativos do mesmo site (`safeRedirect`).
- **Fim da sessão** (logout, expiração, token inválido, troca de usuário, logout em outra aba via evento `storage`): `SessionSync` remove todo o cache privado (`['session']`, `['me', …]`, `['cart', …]`); o `RealtimeProvider` fecha o socket da sessão anterior e abre outro com o novo token. Se o usuário estava numa rota privada, volta para o login (expiração) ou para o início (logout) (AUTH-05).

## Carrinho e cotação (CART-01..08)

- **Dono**: visitante pelo `X-Guest-Cart-Id` (uuid no `localStorage`), usuário pelo token. A chave do cache é `['cart', 'guest:<id>' | 'user:<id>']`, então trocar de sessão troca de carrinho sem misturar entradas.
- **Servidor é a autoridade**: o carrinho traz preço unitário, estoque e total da linha calculados no servidor; subtotal, desconto, taxa e total vêm **só** da cotação (`POST /quote`), usada como query em `['cart', dono, 'quote', rede]`. Como a cotação fica sob a chave do carrinho, toda invalidação do carrinho (mutation, `nft.updated`, reconexão) a recalcula.
- **Mutations sem otimismo**: quantidade, remoção e cupom esperam a resposta (o servidor pode recusar com 409) e gravam o carrinho devolvido; um 409/404 recarrega o carrinho. A atualização otimista do projeto fica nos favoritos.
- **Persistência e merge**: o carrinho vive no banco simulado (sobrevive a refresh). No login/cadastro, o cliente chama `/cart/merge` com o token novo **antes** de iniciar a sessão, grava o carrinho mesclado na chave do usuário e troca o id do visitante; assim a primeira leitura autenticada já vê os itens do visitante (CART-04).
- **Precisão**: dinheiro é string decimal de ponta a ponta, calculado com `big.js` no servidor (arredondamento para baixo em 6 casas); o cliente só formata.

## Pedidos, idempotência e revalidação (CHK-05, CHK-06, ORD-01..06)

- **Tentativa** (`src/features/checkout/lib/order-attempt.ts`): uma revisão confirmada = um corpo + uma `Idempotency-Key`. A chave é gravada no `localStorage` por usuário **antes** do primeiro POST. Cliques repetidos são descartados por um guard em `ref` e, se passassem, reusariam a mesma chave. Timeout (4 s, menor que o global) ou falha de rede → repete uma vez com a mesma chave; se ainda falhar, consulta `GET /orders/active` antes de devolver o formulário. Corpo diferente (nova cotação, outra carteira) = nova chave. A chave é descartada quando o pedido chega a um estado terminal.
- **Cotação desatualizada, duas camadas**: (1) no cliente, a revisão congela a cotação revisada; se a cotação viva (recalculada por `nft.updated`) diverge em qualquer valor, o botão de confirmar é bloqueado, as diferenças (`POST /quote { previousQuoteId }`) são listadas e anunciadas, e o usuário precisa aceitar os novos valores; (2) no servidor, `POST /orders` recalcula e compara valores com a cotação revisada e responde 409 `QUOTE_STALE` com a nova cotação — rede de segurança quando o socket está fora. Nunca há reenvio automático depois de um 409.
- **Estados**: `pending` → `confirmed` | `declined` (terminais). A tela `/orders/$orderId` lê o pedido por REST e é atualizada por `order.updated`; se o realtime estiver desconectado, faz polling de 4 s só enquanto o pedido está pendente. A confirmação visual só existe para `confirmed` (ORD-03).
- **Snapshot**: o pedido copia as linhas e os valores da cotação no momento da criação; mudanças posteriores no catálogo não o alteram (ORD-05).
- **Isolamento**: `GET /orders/:id` de outro usuário responde 403 sem dados; `order.updated` só vai para os sockets cujo token pertence ao dono.

## Cache (TanStack Query)

| Política | Valor | Motivo |
| --- | --- | --- |
| `staleTime` padrão | 30 s | O catálogo é corrigido em tempo real pelos eventos; refetch frequente seria desperdício |
| `refetchOnWindowFocus` | ligado | Abas paradas por muito tempo se atualizam ao voltar |
| `retry` (queries) | até 2, só para falhas transitórias (rede, timeout, 5xx), backoff 600 ms → 4 s | 4xx nunca se resolve repetindo |
| `retry` (mutations) | desligado | Escritas não idempotentes não podem ser repetidas às cegas; pedidos usam `Idempotency-Key` |
| Lista do catálogo | chave = objeto exato dos parâmetros + `AbortSignal` + `keepPreviousData` | Resposta antiga nunca sobrescreve a busca atual (CAT-08); a página anterior fica visível durante a troca |
| Isolamento | tudo que é privado fica sob `['me', userId, …]`; o carrinho sob `['cart', 'user:<id>' \| 'guest:<id>']` | Logout = uma remoção; o usuário B nunca acerta a entrada do usuário A |

## Tempo real (RT-01..08)

- **Transporte**: `socket.io-client` com `transports: ['websocket']`, interceptado pelo MSW (`ws.link`) e codificado por `@mswjs/socket.io-binding`. A UI recebe frames Socket.IO reais no cliente real; nenhum evento é simulado na UI.
- **Um cliente por sessão** (`RealtimeClient`): trocar o token fecha o socket anterior, descarta listeners e o estado de dedupe e abre outro. Eventos privados (`order.updated`) são roteados no servidor pelo token do handshake, revalidado no momento do envio (RT-07).
- **Envelope**: `{ eventId, type, resource: { type, id }, version, occurredAt, data }` validado por zod (RT-04).
- **Duplicados e antigos**: o cliente ignora `eventId` já visto (janela de 500) e `version` ≤ última aplicada para o recurso; ao escrever no cache, compara de novo com a `version` do dado em cache, então um evento mais velho que a resposta REST não regride a tela (RT-05).
- **Aplicação no cache**: `nft.updated` corrige detalhe, listas, destaque e relacionados (preço, disponibilidade, edições, versão) e invalida os carrinhos que contêm o NFT — o servidor recalcula as linhas; o cliente não recalcula totais. `order.updated` corrige o pedido e invalida as queries de pedidos do usuário.
- **Reconexão**: no `connect` seguinte ao primeiro, invalida catálogo, carrinho e pedidos ativos (refetch só das queries montadas) (RT-06).
- **Ciclo de vida**: listeners por componente via `useRealtimeEvent` (removidos no unmount); o provider fecha o socket ao trocar de sessão (RT-08).

## Camada de simulação (MSW)

- **Banco** (`src/mocks/db`): estado único em memória persistido em `localStorage["kurio.mockdb.v2"]` após cada mutação; chave versionada (mudança de schema descarta dados antigos); reset recria o seed. Abas diferentes sincronizam pelo evento `storage`.
- **Seed determinístico**: PRNG com semente, ids em slug e datas fixas (`CATALOG_NOW`), então dois resets geram dados idênticos — base para os testes e as baselines visuais. Os 9 primeiros NFTs reproduzem a grade do Figma.
- **Cenários** (`src/mocks/scenarios/engine.ts`): um handler `http.all('/api/*')` roda antes de todos e aplica latência (PRNG com semente reiniciada a cada troca de cenário), modo offline (`HttpResponse.error()`), respostas fora de ordem no catálogo e falhas por rota (permanentes do cenário ou pontuais via `failNext`). Situações de negócio (preço alterado, edição esgotada, sessão expirada, eventos duplicados/antigos) são **ações** que mudam o banco e então emitem o evento (MOCK-06).
- **Pedidos**: o servidor simulado vive na página; os timers de liquidação morrem no refresh, então pedidos pendentes são reagendados no boot e liquidados na leitura. `orders.hold(true)` (persistido) mantém pedidos pendentes até `orders.settle(id?, desfecho?)`, o que dá aos testes controle do momento do evento. O cenário `order-timeout` cria e persiste o pedido e só depois atrasa a resposta (uma vez por chave).
- **Carteiras**: conexão simulada por `POST /wallets/:id/connect` (recusada no cenário `wallet-rejected`); `wallets.disconnectAll()` derruba as conexões no servidor e o próximo pedido recebe 422 `WALLET_DISCONNECTED`.
- **Controle**: `window.__kurioMocks` e o painel de cenários (raiz React separada dentro de `src/mocks/panel`) só falam com o servidor simulado.
- Rotas não implementadas respondem `404 NOT_FOUND` (catch-all), nunca vazam para o host estático.

### Limitações do transporte simulado

- O MSW intercepta WebSocket, não long-polling HTTP: o cliente força `transports: ['websocket']`.
- O `WebSocketHandler` do MSW remove o prefixo `/socket.io/` da URL antes de comparar, então o `ws.link` usa a origem pura (`wss://realtime.kurio.mock`).
- O binding confirma o namespace mas ignora o `auth` do handshake: o hub lê o pacote CONNECT (`40{...}`) para saber o token. Só o namespace `/` é suportado.
- O binding não envia pings, e o `socket.io-client` derruba a conexão após `pingInterval + pingTimeout` (30 s) sem eles: o hub envia o ping Engine.IO (`"2"`) a cada 20 s (teste `RT-01` de keepalive).
- O `engine.io-client` captura `globalThis.WebSocket` quando o módulo é avaliado. Por isso `socket.io-client` é importado sob demanda (`createSocket` é assíncrono), depois que o MSW instalou o patch; no bundle inicial ele pegaria o WebSocket nativo e nunca chegaria ao servidor simulado.

## Assets

- As 4 artes do Figma (PNG 1254 px, ~2 MB) viram WebP de 256/512/960 px (`npm run images`, `sharp`), servidas com `srcset`/`sizes`. O catálogo de 72 NFTs reutiliza essas 4 artes: o Figma não tem mais artes distintas (substituição documentada).
- Ícones são os SVGs exportados do Figma; quando precisam mudar de cor por estado, são renderizados como máscara CSS (`MaskIcon`) preenchida com `currentColor`. Os ícones compostos por várias camadas no Figma (scan da tab bar, logo do Google) foram montados num SVG único mantendo as posições originais.

## Desvios do Figma e decisões de UX

| Tela | Desvio | Motivo |
| --- | --- | --- |
| Global | Labels de formulário visualmente ocultos onde o Figma só tem placeholder | Acessibilidade (A11Y-03) sem mudar o visual |
| Global | Itens fora do escopo (Criadores, Aprenda, links de ajuda, redes sociais, newsletter, login social, "Esqueceu a senha?", scan da tab bar) mostram aviso "em breve" | GEN-03: não aparentar sucesso |
| Global | Footer empilha em colunas abaixo de 1024 px | Não há footer nos frames mobile |
| Mobile | Header compacto (logo, busca, carrinho, entrar) nas telas sem frame mobile; Início, Detalhe e Auth seguem o próprio frame (sem header) | Navegação consistente nas telas que o Figma não desenhou |
| Cadastro | Sem campo de nome de exibição; o servidor usa o username | O formulário do Figma não tem o campo |
| Detalhe | Rótulos "Contrato" e "Direitos autorais" corrigidos (no Figma estão trocados em relação ao conteúdo) | Coerência do conteúdo |

| Início | Selo RARO/LENDÁRIO também nos cards desktop; `compareAtPrice` riscado | O frame mobile tem o selo; o enunciado pede preço anterior coerente |
| Início | Filtro marcado ganha cor de destaque **e** ícone de check; contagens vêm da API | Estado não depende só de cor (A11Y-05); facetas reais |
| Início | Abaixo de 1024 px os filtros abrem num Sheet; ordenação fica dentro do Sheet no mobile; banner de destaque vai para depois da grade | Frames só existem em 1440 e 414 |
| Início | Paginação com janela de 4 páginas + botão "anterior" a partir da página 2 | O Figma só mostra a página 1 |
| Início | Imagens do blog e dos promos reutilizam as artes de NFT | Essas imagens não foram exportadas do Figma |
| Detalhe | Edição esgotada fica desabilitada, riscada e com legenda "1/1 esgotada"; se esgota em tempo real, continua selecionada e desabilitada (sem trocar preço sozinha) | Estado não desenhado; nunca mudar preço sem ação do usuário |
| Detalhe | Botões −/+ esmaecem nos limites; barra de compra mobile é `sticky` | Limites visíveis (NFT-05); a barra não cobre conteúdo |
| Detalhe | Aba "Avaliações (19)" abreviada no mobile; layout lado a lado só a partir de 1280 px | Caber em 390 px sem overflow |
| Detalhe | O frame mobile repete "1/10" nas edições; implementadas as edições reais | Erro do frame |
| Conta | Fundo neutro atrás do modal desktop (no Figma é a Home) | `/login` e `/signup` são rotas reais com acesso direto |
| Conta | Estados de erro, aviso de sessão expirada e alerta do formulário em vermelho com texto | Não desenhados |
| Conta | Validação no envio (não no blur); no desktop o olho revela as duas senhas, no mobile há um por campo | Evitar que a mensagem desloque o botão no clique; segue cada frame |
| Carrinho | Tabela e resumo lado a lado só a partir de 1280 px; entre 768 e 1279 o resumo vai para baixo (máx. 420 px) | 782 + 332 não cabem sem overflow horizontal |
| Carrinho | Título "Carrinho de NFTs" só para leitores de tela no desktop | O Figma mostra apenas o breadcrumb |
| Carrinho mobile | Em quantidade 1 o "−" vira remover; acima de 1 há uma lixeira no canto do card; sem carrossel nem "Continuar explorando" | O frame sobrepõe a lixeira ao "+" e não tem esses elementos |
| Carrinho | Cupom aplicado troca o input pelo código + "Remover cupom"; avisos de erro, estoque e tempo real aparecem sob a linha | Estados não desenhados |
| Favoritos | Grade do catálogo (4 colunas a partir de 1024 px) com coração também no desktop | Não há frame; o coração do card é só mobile |
| Pagamento | Código de indicação opcional (sem asterisco) | Exigir código de indicação bloquearia quem não tem um |
| Pagamento mobile | Os campos do colecionador ficam numa seção recolhível "Dados do colecionador" | O frame mobile não tem campos, mas o enunciado exige validar os campos do layout |
| Pagamento | Etapa de revisão em diálogo (com região `aria-live` própria); status de conexão, cupom inline e avisos (pedido pendente, itens indisponíveis, valores alterados) | Revisão obrigatória (CHK-04) e estados não desenhados |
| Pagamento | Linha extra "Edição 1/50" no resumo; desconto como "(-) 0.00 ETH" e "Desconto (CÓDIGO)" com cupom | O mesmo NFT pode estar em edições diferentes; valores sempre da cotação |
| Pagamento mobile | Cards das carteiras mostram o endereço curto (não ENS); cartão de conector escolhido ganha anel | As carteiras não têm ENS; escolha não depende só do rádio pequeno |
| Pagamento | Entre 768 e 1023 px o formulário e a coluna direita empilham | Duas colunas não cabem |
| Confirmação | Rota real `/orders/$orderId` com o cartão centralizado (não um modal Radix); header e footer globais visíveis no desktop, footer oculto no mobile | Acesso direto/refresh e regiões `aria-live` globais intactas |
| Confirmação | Estados "Aguardando confirmação da rede" e "Pagamento recusado" no mesmo cartão; linhas Subtotal/Desconto só quando há desconto; mobile com meta em grade 2×2 | Estados e frame mobile não desenhados |

## Correções de sessão encontradas na integração

- O interceptor adia o fim da sessão para a próxima tarefa (`setTimeout`). Encerrar de forma síncrona trocava a chave dos observers da sessão; o TanStack Query cancelava a query em voo com `revert` e o `fetchQuery` resolvia com o usuário antigo, deixando o guard aceitar uma sessão expirada.
- `ensureUser` (guards) faz uma requisição direta e só confia em cache bem-sucedido com menos de 2 s.
- Links para rotas privadas não fazem preload por intenção: um hover rodaria o guard e encerraria a sessão antes do clique, perdendo a URL de destino.
- O router usa um parser de search params sem coerção (o padrão transformava `"0.5"` em número e o filtro de preço caía no padrão).
