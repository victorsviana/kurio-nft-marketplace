# Requisitos

Cada requisito tem um ID estável, a seção de origem no enunciado (§) e o critério de aceite. Os testes Playwright usam o ID no título; a matriz de cobertura é gerada a partir deles.

Legenda de prioridade: **E** = eliminatório se ausente · **A** = alta (pontua forte na rubrica) · **M** = média.

## GEN — Geral e navegação

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| GEN-01 | 4 | A | Rota inexistente | URL desconhecida mostra página 404 com link para o início |
| GEN-02 | 4, 12 | E | Acesso direto e refresh | Toda tela prevista abre por URL direta e sobrevive a refresh, inclusive na Vercel |
| GEN-03 | 3 | A | Ações fora do escopo | Links editoriais, suporte, atividade, ofertas e downloads não aparentam sucesso (desabilitados ou aviso "em breve") |
| GEN-04 | 8 | A | Responsividade | Sem overflow horizontal em 390, 768 e 1440 px; frames mobile do Figma respeitados |
| GEN-05 | 8 | A | Skeletons | Catálogo, detalhe e resumo do carrinho exibem skeleton com shimmer com as mesmas dimensões do conteúdo; sem shimmer com `prefers-reduced-motion` |
| GEN-06 | 4 | A | Estados de dados | Toda tela com dados tem carregamento, vazio, erro com "Tentar novamente" e atualização em segundo plano |

## CAT — Catálogo (Início)

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| CAT-01 | 3 | E | Destaques e catálogo | Hero e NFT em destaque; grade paginada vinda da API |
| CAT-02 | 3 | A | Busca na URL | Termo de busca vira `?q=`; sobrevive a refresh e voltar/avançar |
| CAT-03 | 3 | A | Filtros combináveis | Aba (todos/novos/em alta), categorias ("Coleções" no Figma, múltiplas), faixa de preço e rede combinam entre si e ficam na URL; contagens por opção vêm da API |
| CAT-04 | 3 | A | Ordenação | `?sort=` (recentes, preço ↑, preço ↓, nome) refletida na API |
| CAT-05 | 3 | A | Paginação | `?page=`; mudar busca, filtro ou ordenação volta para a página 1 |
| CAT-06 | 3 | A | Parâmetros da API | A requisição enviada contém exatamente os parâmetros da URL |
| CAT-07 | 3 | A | Vazio e falha | Resultado vazio tem mensagem e "Limpar filtros"; falha tem nova tentativa |
| CAT-08 | 3, 4 | A | Respostas fora de ordem | Resposta antiga nunca sobrescreve a busca mais recente (cancelamento por `AbortSignal` + chave por parâmetros) |
| CAT-09 | 3 | M | Navegação para o NFT | Card leva a `/nft/$nftId` |

## NFT — Detalhe

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| NFT-01 | 3 | E | Galeria e informações | Imagens navegáveis, nome, preço, avaliações, atributos, coleção, contrato, abas de detalhes/avaliações |
| NFT-02 | 3 | A | Acesso direto | `/nft/$nftId` abre por URL direta |
| NFT-03 | 3 | A | NFT inexistente | ID inválido mostra estado "NFT não encontrado" com link de volta (HTTP 404 da API) |
| NFT-04 | 3 | A | Edição | Seleção de edição (1/1, 1/10, 1/50, aberta) altera preço e disponibilidade; edição esgotada fica desabilitada com motivo textual |
| NFT-05 | 3 | A | Limite de quantidade | Quantidade de 1 até a disponibilidade da edição (descontando o que já está no carrinho) |
| NFT-06 | 3 | A | Comprar | "Comprar" adiciona ao carrinho via API e informa sucesso/erro de forma acessível |

## FAV — Favoritos

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| FAV-01 | 3, 5 | A | Persistência | Favoritos do usuário autenticado persistem (API) após refresh e novo login |
| FAV-02 | 4 | E | Otimista com rollback | Favoritar atualiza a UI imediatamente; em falha, reverte e avisa |
| FAV-03 | 3 | A | Exige autenticação | Visitante que tenta favoritar vai ao login e retorna ao NFT |

## CART — Carrinho

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| CART-01 | 3 | E | Itens | Adicionar, alterar quantidade e remover itens via API |
| CART-02 | 3 | A | Disponibilidade | Quantidade limitada pela disponibilidade por NFT e edição (409 da API tratado) |
| CART-03 | 3 | A | Persistência | Carrinho sobrevive a refresh |
| CART-04 | 3 | A | Merge no login | Itens do visitante são preservados ao autenticar |
| CART-05 | 3 | A | Cupom | Aplicar e remover cupom; código inválido e expirado têm mensagens distintas |
| CART-06 | 3 | E | Resumo | Subtotal, desconto, taxa de rede e total exibidos exatamente como a cotação da API |
| CART-07 | 3, 7 | A | Tempo real | Mudança de preço/disponibilidade recebida com o carrinho aberto atualiza o item e o resumo e é anunciada |
| CART-08 | 3 | A | Precisão | Valores em ETH como string decimal; sem erro de ponto flutuante na tela |

## CHK — Pagamento

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| CHK-01 | 3 | E | Exige autenticação | `/checkout` sem sessão redireciona ao login e retorna ao checkout |
| CHK-02 | 3 | A | Validação | Campos do layout validados com mensagens associadas |
| CHK-03 | 3 | A | Carteira e rede | Usa carteiras cadastradas; seleção de rede; simulação de conexão, recusa e desconexão |
| CHK-04 | 3 | A | Revisão | Etapa de revisão antes do envio |
| CHK-05 | 3, 7 | E | Revalidação | Antes de confirmar, nova cotação; mudança de preço, disponibilidade, cupom ou taxa exige nova confirmação do usuário |
| CHK-06 | 3 | E | Sem duplicidade | Clique repetido e reenvio após timeout não criam outro pedido (Idempotency-Key persistida por tentativa) |
| CHK-07 | 3 | A | Preserva itens em falha | Falha ou recusa mantém o carrinho intacto |

## ORD — Pedidos e confirmação

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| ORD-01 | 3 | E | Estados | Pedido pendente, confirmado e recusado têm representação própria |
| ORD-02 | 3, 7 | A | Recuperação | Após refresh ou reconexão com pedido pendente, o usuário vê o mesmo pedido e o estado final |
| ORD-03 | 3 | E | Confirmação real | Tela de confirmação só aparece para pedido `confirmed` pela simulação |
| ORD-04 | 3 | A | Remoção parcial | Após confirmação, remove do carrinho só os itens e quantidades comprados |
| ORD-05 | 3 | A | Recibo snapshot | Recibo mostra transação, itens, taxas e total do snapshot; mudanças posteriores no catálogo não o alteram |
| ORD-06 | 5 | E | Idempotência | Mesma chave + mesmo conteúdo = mesmo pedido; mesma chave + conteúdo diferente = 409 |

## AUTH — Conta e sessão

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| AUTH-01 | 3 | E | Cadastro | Validação de campos; conflito de e-mail/usuário (409) exibido no campo |
| AUTH-02 | 3 | E | Login | Credenciais inválidas tratadas; retorno à rota anterior (`?redirect=`) |
| AUTH-03 | 3 | E | Sessão após refresh | Sessão recuperada via `GET /api/auth/session` |
| AUTH-04 | 3 | A | Expiração | 401 `SESSION_EXPIRED` em navegação ou checkout leva ao login preservando o contexto para retomada |
| AUTH-05 | 3 | E | Logout e troca de usuário | Limpa cache privado e subscriptions; o usuário B nunca vê dados do usuário A |
| AUTH-06 | 3 | A | Rotas privadas | Checkout, perfil, carteiras, favoritos e pedidos exigem sessão |

## PRF — Perfil

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| PRF-01 | 3 | A | Dados | Editar nome de exibição, usuário, e-mail, ENS e apelido; erros da API nos campos; persiste após refresh |
| PRF-02 | 3 | A | Avatar | Alterar e remover avatar; persiste após refresh |
| PRF-03 | 3 | A | Senha | Alterar senha validando a atual, a força e a confirmação |

## WAL — Carteiras

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| WAL-01 | 3 | A | Principal | Cadastrar e editar a carteira principal com validação (endereço 0x, rede, tipo) |
| WAL-02 | 3 | A | Secundária | Cadastrar e editar a secundária; opção "igual à principal"; estado vazio |
| WAL-03 | 3 | A | Uso no pagamento | Carteiras cadastradas aparecem no checkout |

## RT — Tempo real

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| RT-01 | 7 | E | Transporte | Eventos chegam por `socket.io-client` interceptado pelo MSW |
| RT-02 | 7 | A | `nft.updated` | Atualiza preço e disponibilidade no catálogo, no detalhe e no carrinho |
| RT-03 | 7 | A | `order.updated` | Atualiza o estado do pedido e apresenta confirmação ou recusa |
| RT-04 | 7 | A | Envelope | Evento tem `eventId`, recurso afetado (`type`, `id`) e `version` |
| RT-05 | 7 | A | Duplicados e antigos | Evento repetido ou com versão menor é ignorado; efeitos não são reaplicados |
| RT-06 | 7 | A | Reconexão | Ao reconectar, recursos ativos são reconciliados com a API REST |
| RT-07 | 7 | E | Isolamento | Eventos de sessão anterior não afetam outro usuário |
| RT-08 | 7 | A | Ciclo de vida | Listeners e subscriptions liberados ao desmontar/encerrar a sessão |
| RT-09 | 7 | A | Cenário de checkout | NFT no carrinho muda → UI informa e atualiza o resumo → checkout bloqueia cotação desatualizada |

## MOCK — Simulação

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| MOCK-01 | 6 | E | Camada de rede | Mocks só no MSW; ativados por `VITE_ENABLE_MOCKS`, inclusive no build da Vercel |
| MOCK-02 | 6 | A | Estado consistente | Catálogo, favoritos, carrinho, perfil, carteiras e pedidos compartilham o mesmo banco simulado persistido |
| MOCK-03 | 6 | A | Reset | Reset restaura integralmente o cenário conhecido |
| MOCK-04 | 6 | A | Cenários | Selecionáveis e reproduzíveis: sucesso, vazio, latência variável, fora de ordem, offline, 4xx/5xx, sessão expirada, conflito de cadastro, cupom inválido/expirado, preço alterado, edição esgotada, timeout pós-pedido, pagamento confirmado/recusado |
| MOCK-05 | 6 | A | Fixtures | Variedade para filtros e paginação; pelo menos dois usuários |
| MOCK-06 | 6 | A | REST + eventos coerentes | Mudança no banco reflete em REST e no evento correspondente |

## A11Y — Acessibilidade

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| A11Y-01 | 8 | A | Teclado e foco | Todas as ações operáveis por teclado com foco visível |
| A11Y-02 | 8 | A | Diálogos | Foco preso e devolvido em diálogos e drawers; `Esc` fecha |
| A11Y-03 | 8 | A | Formulários | Labels, `aria-invalid` e erros ligados por `aria-describedby` |
| A11Y-04 | 8 | A | Feedback | Mutations e eventos anunciados em região `aria-live` |
| A11Y-05 | 8 | M | Imagens e contraste | `alt` descritivo; estados não dependem só de cor |

## QA — Testes, performance e entrega

| ID | § | P | Requisito | Critério de aceite |
| --- | --- | --- | --- | --- |
| QA-01 | 9 | E | E2E executável | `npm run test:e2e` roda com mocks em Chromium, desktop e mobile, com estado isolado por teste |
| QA-02 | 9 | A | Regressão visual | Baselines versionadas de início, detalhe, carrinho e pagamento |
| QA-03 | 9 | A | Relatórios | Relatório HTML e traces de falha |
| QA-04 | 10 | A | Lighthouse | Início e detalhe, mobile e desktop, 3 execuções, mediana; LCP, CLS e TBT registrados |
| QA-05 | 12 | E | Deploy | URL pública na Vercel com mocks e tempo real funcionando |
| QA-06 | 12 | A | Documentação | README (setup, env, credenciais, cenários, comandos) e ARCHITECTURE (contratos, sessão, carrinho, cache, reconciliação, desvios do Figma) |
