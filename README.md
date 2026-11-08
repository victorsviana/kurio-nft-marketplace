# Kurio — NFT Marketplace

Solução do [desafio frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge): marketplace de NFTs em React + TypeScript, com API REST e Socket.IO simulados por MSW.

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

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga a camada MSW (REST + Socket.IO), inclusive no build publicado |
| `VITE_API_BASE_URL` | `/api` | Base das chamadas REST |
| `VITE_SOCKET_URL` | `wss://realtime.kurio.mock` | Endereço do servidor Socket.IO (interceptado pelo MSW) |

## Processo

O desenvolvimento segue um SDD leve: [`specs/constitution.md`](specs/constitution.md) (regras), [`specs/requirements.md`](specs/requirements.md) (requisitos com IDs), [`specs/contracts.md`](specs/contracts.md) (contratos) e [`specs/tasks.md`](specs/tasks.md) (tarefas por checkpoint). Os testes E2E levam o ID do requisito no título.

Diagnóstico da simulação: `/status`.
