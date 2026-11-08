# Kurio — NFT Marketplace

Solução do [desafio frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge): marketplace de NFTs em React + TypeScript, com API REST e Socket.IO simulados por MSW.

**Aplicação publicada:** https://kurio-nft-marketplace-omega-six.vercel.app

> Em desenvolvimento. Este README será completado ao fim do projeto com credenciais, cenários, contratos e instruções de reprodução das falhas.

## Stack

React 19 · TypeScript · Vite · TanStack Router · TanStack Query · Axios · Socket.IO client · Tailwind CSS v4 · shadcn/ui (Radix) · MSW 2 + `@mswjs/socket.io-binding` · Playwright · Lighthouse CI

## Como rodar

Requisitos: Node 22+ e npm.

```bash
npm ci
npx playwright install chromium   # apenas para os testes E2E
npm run dev                       # http://localhost:5173 (mocks ligados)
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` | Verificação de tipos + build otimizado |
| `npm run preview` | Serve o build em http://localhost:4173 |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | Lint (oxlint) |
| `npm run test:e2e` | Testes Playwright (gera build e sobe o preview) |
| `npm run test:e2e:report` | Abre o relatório HTML dos testes |
| `E2E_BASE_URL=<url> npm run test:e2e` | Roda a suíte contra um deploy (sem subir servidor local) |

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga a camada MSW (REST + Socket.IO), inclusive no build publicado |
| `VITE_API_BASE_URL` | `/api` | Base das chamadas REST |
| `VITE_SOCKET_URL` | `wss://realtime.kurio.mock` | Endereço do servidor Socket.IO (interceptado pelo MSW) |

## Credenciais fictícias

| Usuário | E-mail | Senha | Diferenças no seed |
| --- | --- | --- | --- |
| Ana Ribeiro | `ana@kurio.dev` | `kurio2026` | 2 favoritos, carteira principal MetaMask (Ethereum), ENS `anaribeiro.eth` |
| Bruno Costa | `bruno@kurio.dev` | `kurio2026` | 1 favorito, carteiras principal (Coinbase, Polygon) e secundária (WalletConnect, Ethereum) |

Cupons: `KURIO10` (10%), `BEMVINDO5` (5%), `BLACKFRIDAY` (expirado). Qualquer outro código é inválido.
As senhas ficam no banco simulado apenas como hash SHA-256 com salt; o cliente guarda só o token da sessão.

## Simulação (MSW)

Toda a API REST (`/api/*`) e o servidor Socket.IO (`wss://realtime.kurio.mock`) são simulados no navegador pelo MSW, inclusive no deploy. O banco simulado é determinístico (72 NFTs, 2 usuários, cupons) e fica no `localStorage` (`kurio.mockdb.v1`), então sobrevive a refresh.

### Painel de cenários

O botão **"Simulação · …"** no canto inferior esquerdo abre o painel:

- **Cenário da API** (persistido em `localStorage["kurio.mock.scenario"]`):

| Cenário | Efeito |
| --- | --- |
| Padrão | Tudo funciona, 120 ms de latência |
| Catálogo vazio | A listagem não retorna resultados |
| Rede lenta | Toda resposta demora 2,5 s (mostra os skeletons) |
| Latência variável | 200 ms a 2,5 s, sequência reproduzível (PRNG com semente) |
| Respostas fora de ordem | No catálogo, requisições ímpares demoram 1,6 s e pares 250 ms |
| Sem conexão | Toda chamada falha na rede e o Socket.IO não reconecta |
| Erro 503 | Catálogo e detalhe respondem `503 SERVICE_UNAVAILABLE` |
| Pagamento recusado | Novos pedidos terminam recusados |
| Timeout no pedido | O pedido é criado, mas a resposta chega depois do timeout do cliente |
| Carteira recusa conexão | `422 WALLET_REJECTED` ao conectar a carteira |

- **Ações no servidor** (mudam o banco e então emitem o evento Socket.IO correspondente): alterar o preço de um NFT, esgotar a edição padrão, expirar todas as sessões, reenviar o último evento (duplicado), enviar um evento antigo (versão menor) e derrubar as conexões Socket.IO.
- **Restaurar dados e cenário padrão**: recria o seed, volta ao cenário padrão e limpa a sessão local.

### API de controle (testes e console)

`window.__kurioMocks` expõe as mesmas operações: `setScenario(id)`, `failNext('PUT /favorites/*', { status: 500, code: 'INTERNAL_ERROR', times: 1 })`, `reset()`, `expireSessions()`, `nft.setPrice(id, '1.49')`, `nft.setAvailability(id, editionId, n)`, `nft.sellOut(id)`, `realtime.replayLastEvent()`, `realtime.emitStaleNftEvent(id)`, `realtime.dropAllConnections()`. Os helpers do Playwright ficam em [`e2e/support/mocks.ts`](e2e/support/mocks.ts).

## Processo

O desenvolvimento segue um SDD leve: [`specs/constitution.md`](specs/constitution.md) (regras), [`specs/requirements.md`](specs/requirements.md) (requisitos com IDs), [`specs/contracts.md`](specs/contracts.md) (contratos) e [`specs/tasks.md`](specs/tasks.md) (tarefas por checkpoint). Os testes E2E levam o ID do requisito no título.

Diagnóstico da simulação: `/status`.
