# Constituição do projeto

Regras inegociáveis. Toda tarefa, revisão e teste deve respeitá-las. A fonte dos requisitos é o enunciado do desafio (`junglegaming/frontend-challenge`, README); os IDs ficam em [`requirements.md`](./requirements.md).

## 1. Stack efetiva (eliminatório)

| Responsabilidade | Tecnologia | Uso obrigatório |
| --- | --- | --- |
| Rotas, search params, guards | TanStack Router (file-based) | Toda navegação e todo estado de URL |
| Estado remoto | TanStack Query | Toda leitura e escrita de dados da API |
| HTTP | Axios (instância única em `src/shared/api`) | Toda chamada REST |
| Tempo real | `socket.io-client` | Todo evento; nunca setters/callbacks diretos |
| Mocks | MSW 2.x + `@mswjs/socket.io-binding` | REST e Socket.IO, inclusive no build de demonstração |
| UI | Tailwind CSS v4 + shadcn/ui adaptado à identidade Kurio | |
| Testes | Playwright (E2E + regressão visual) | |
| Auditoria | Lighthouse CI | |

## 2. Fronteiras

1. **Mocks vivem só em `src/mocks/`.** Componentes, hooks e o cliente Axios não contêm respostas fictícias, `if (mock)` ou caminhos alternativos de negócio.
2. **Eventos nascem no servidor simulado.** O banco simulado muda e então emite pelo binding Socket.IO. Gatilhos de teste e o painel de cenários chamam o servidor simulado, nunca o cache do Query ou setters da UI.
3. **Contratos são a especificação executável.** Schemas zod em `src/shared/contracts/` são importados pelos handlers MSW **e** pelo cliente. Respostas são validadas na fronteira do Axios.
4. **O servidor simulado é a autoridade** de preço, disponibilidade, cupom, taxas, total e estado do pedido. O cliente exibe; não recalcula o total da compra.

## 3. Domínio

- Valores em ETH trafegam como **string decimal** e são calculados com `big.js`. Nunca `number` para dinheiro.
- Quantidades são inteiras e positivas.
- Senhas nunca são guardadas em claro: hash SHA-256 com salt no banco simulado; o cliente não persiste senha.
- Recibo = snapshot imutável do pedido no momento da confirmação.
- Pedidos `confirmed` e `declined` são terminais.

## 4. Sessão e isolamento (eliminatório)

- Toda query privada tem o `userId` na chave.
- Logout ou troca de usuário: limpa o cache privado, desconecta o socket e reconecta com a nova sessão.
- Eventos de uma sessão anterior nunca alteram dados de outro usuário.

## 5. Qualidade

- Estados de carregamento (skeleton com shimmer, respeitando `prefers-reduced-motion`), vazio, erro com nova tentativa, sucesso e atualização em segundo plano em toda tela com dados.
- Acessibilidade: teclado, foco visível, foco preso em diálogos e drawers, labels e erros associados (`aria-describedby`), `aria-live` para mutations e eventos, contraste AA.
- Sem overflow horizontal em 390, 768 e 1440 px.
- TypeScript estrito; sem `any` em contratos.

## 6. Processo

- Cada tarefa cita os IDs de requisito que atende (`tasks.md`).
- Testes Playwright têm o ID no título: `test('CART-04: ...')`.
- Cada checkpoint termina com `typecheck`, `lint`, testes do checkpoint passando, commit e deploy.
- Leituras do Figma (cota limitada) só na thread principal; o resultado é salvo em `design/<tela>/` antes de ser usado.
- Desvios do Figma e decisões de UX são registrados em `ARCHITECTURE.md`.
