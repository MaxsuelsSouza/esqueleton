# 📋 Relatório Completo de QA — Esqueleton Admin & Electronic Store

Este relatório consolida a análise sistemática e os testes de ponta a ponta realizados em todas as seções do ecossistema (Dashboard, Produtos, Categorias, Promoções, Cupons, Destaques, Notificações, Perfil, Catálogo, Sacola e Loja Pública).

---

## 📊 Resumo Geral dos Bugs

| Prioridade | Quantidade | Exemplos de Impacto |
| :--- | :---: | :--- |
| 🔴 **Críticos (Alta)** | 8 | Preço negativo aceito, categorias duplicadas, variantes obrigatórias ignoradas, filtros quebrados. |
| 🟠 **Graves / Importantes (Média-Alta)** | 11 | Mensagens de erro genéricas, validações apenas no backend, falhas de navegação (typeahead/header). |
| 🟡 **Moderados / UX (Média)** | 8 | Inputs sem máscara, imagens desalinhadas com variantes, problemas de paginação na URL. |
| 🟢 **Menores / Melhorias (Baixa)** | 4 | Typos textuais, placeholders confusos, dados de teste visíveis em produção. |
| **Total** | **31** | **Bugs identificados e catalogados.** |

---

## 🔴 Bugs Críticos (Alta Prioridade)

### BUG #01 — Preço negativo aceito no produto (sem validação frontend)
* **Onde:** Admin → Produtos → Novo/Editar produto
* **Como reproduzir:** Digitar um valor negativo como `-150` no campo "Preço (R$)" e clicar em Salvar.
* **Resultado:** O sistema retorna apenas uma mensagem de erro genérica: `"Erro ao salvar o produto. Tente novamente."` sem explicar a causa.
* **Esperado:** Validação impeditiva no frontend com mensagem clara: `"O preço não pode ser negativo"`.

### BUG #02 — Nome de produto muito longo causa erro genérico
* **Onde:** Admin → Produtos → Novo produto
* **Como reproduzir:** Digitar um nome com mais de 250 caracteres e clicar em Salvar.
* **Resultado:** Ocorre erro genérico `"Erro ao salvar o produto. Tente novamente."` sem indicar o limite estourado.
* **Esperado:** Mensagem indicando o limite de caracteres ou aplicação do atributo `maxlength` diretamente no campo do formulário.

### BUG #03 — Categorias duplicadas permitidas
* **Onde:** Admin → Categorias → Nova categoria
* **Como reproduzir:** Criar uma categoria com o mesmo nome exato de uma já existente (ex: *"Acessórios para Celular"*).
* **Resultado:** O sistema aceita e gera duplicidade no banco de dados sem alertar o usuário.
* **Esperado:** Validação de unicidade (*Unique Constraint*) com a mensagem: `"Já existe uma categoria com esse nome"`.

### BUG #04 — Filtro de categoria quebra em busca combinada
* **Onde:** Admin → Produtos → Busca + Filtro de categoria
* **Como reproduzir:** Buscar por *"Samsung"* e selecionar simultaneamente a categoria *"Smartphones"*.
* **Resultado:** O sistema retorna produtos fora do escopo selecionado (ex: exibe *Smart TV* porque é da marca Samsung, ignorando o filtro de categoria).
* **Esperado:** O cruzamento de busca de texto + categoria deve aplicar uma condicional lógica `AND` (Marca **E** Categoria).

### BUG #05 — "Limpar filtros" possui comportamento inconsistente
* **Onde:** Admin → Produtos
* **Como reproduzir:** Aplicar uma busca combinada e depois clicar em `"Limpar filtros"`.
* **Resultado:** O visual dos inputs é resetado, mas a listagem continua filtrada (ex: exibindo 2 itens ao invés dos 52 totais cadastrados).
* **Esperado:** O reset visual deve disparar obrigatoriamente o recarregamento do estado completo da lista.

### BUG #06 — Produto adicionado à sacola sem variante obrigatória selecionada
* **Onde:** Loja Pública → Página de Produto (ex.: MX Master 3S, Alienware m16 R2)
* **Como reproduzir:** Clicar em `"Adicionar à sacola"` sem escolher opções de Cor/RAM/Armazenamento.
* **Resultado:** O item é inserido na sacola sem metadados. Na sacola, o produto aparece sem nenhuma indicação da variante comprada.
* **Esperado:** Bloqueio da ação com foco visual (*scroll/highlight*) indicando que as opções são obrigatórias.

### BUG #07 — Validação de telefone no modal WhatsApp aceita texto puro
* **Onde:** Loja Pública → Modal "Identificação" (Botão "Comprar agora")
* **Como reproduzir:** Inserir letras aleatórias (ex.: `"abcdefghij"`) no campo destinado ao telefone e clicar em confirmar.
* **Resultado:** O sistema aceita a string inválida e tenta abrir a API do WhatsApp gerando uma URL corrompida.
* **Esperado:** Máscara de input e validação via Regex rejeitando strings que fujam do padrão telefônico brasileiro.

### BUG #08 — Botão "Limpar" da sacola remove todo o conteúdo sem confirmação
* **Onde:** Loja Pública → Página da Sacola
* **Como reproduzir:** Adicionar múltiplos itens à sacola e clicar no botão `"Limpar"`.
* **Resultado:** Todo o carrinho é esvaziado instantaneamente, sem chance de reversão pelo usuário.
* **Esperado:** Exibição de um modal (*Dialog*) de confirmação: `"Deseja remover todos os itens da sacola?"`.

---

## 🟠 Bugs Graves / Importantes (Média-Alta Prioridade)

### BUG #09 — Busca com texto especial fica presa ao voltar de modais
* **Onde:** Admin → Produtos
* **Como reproduzir:** Inserir uma string de teste (ex: `<script>alert('XSS')</script>`), abrir o modal "Novo produto" e fechá-lo em seguida.
* **Resultado:** A listagem permanece permanentemente travada em 0 resultados até o refresh forçado da página.
* **Esperado:** Fechar ou cancelar ações em modais não deve congelar o estado dos filtros da tabela pai.

### BUG #10 — Mensagem de erro de validação persiste após correção do input
* **Onde:** Admin → Promoções → Nova promoção
* **Como reproduzir:** Clicar em "Salvar" com o campo nome vazio para disparar o aviso de erro. Preencher o nome e rolar a página.
* **Resultado:** A mensagem de erro visual de campo obrigatório continua ativa na tela, mesmo com o dado já inserido.
* **Esperado:** O evento `onChange` ou a perda de foco (`onBlur`) do campo válido deve limpar o estado de erro associado.

### BUG #11 — Desconto acima de 100% aceito no formulário frontend
* **Onde:** Admin → Promoções → Nova promoção
* **Como reproduzir:** Digitar o valor `200` no campo "Desconto %".
* **Resultado:** O frontend não barra a inserção. O backend rejeita a requisição mas expõe apenas a mensagem genérica: `"Erro ao salvar. Tente novamente."`.
* **Esperado:** Validação nativa no HTML/JS limitando o intervalo numérico estritamente entre `0` e `100`.

### BUG #12 — Código do cupom aceita espaços indevidos
* **Onde:** Admin → Cupons → Novo cupom
* **Como reproduzir:** Tentar cadastrar a string `"CUPOM TESTE"` (com espaço intermediário).
* **Resultado:** Permite a digitação e falha apenas ao enviar o formulário com a resposta genérica `"Dados inválidos"`.
* **Esperado:** Filtro no input para impedir a tecla de espaço ou tratamento automático com `.replace(/\s+/g, '')` antes do submit.

<!-- ### BUG #13 — Clique no resultado da busca rápida (Typeahead) não navega
* **Onde:** Loja pública → Barra de pesquisa superior
* **Como reproduzir:** Digitar parte do nome de um produto, aguardar o menu flutuante aparecer e clicar em uma das sugestões.
* **Resultado:** O dropdown fecha, mas o usuário não é redirecionado para a página de detalhes do produto clicado.
* **Esperado:** O clique no elemento da lista suspensa deve disparar o redirecionamento imediato para a URL interna do produto. -->

### BUG #14 — Botão "Adicionar" no carrossel de destaques é inoperante
* **Onde:** Loja pública → Carrossel de Destaques da Home
* **Como reproduzir:** Clicar diretamente no botão `"Adicionar"` fixado em um card dentro do carrossel.
* **Resultado:** A ação roda sem erros visíveis, mas o produto não é injetado na sacola de compras.
* **Esperado:** Sincronização com o estado global do carrinho para adicionar o item (e selecionar a variante padrão automaticamente caso não haja escolha prévia).

<!-- ### BUG #15 — Botões do Header ("Favoritos" e "Sacola") não navegam
* **Onde:** Loja Pública → Header global (e página interna de produto)
* **Como reproduzir:** Clicar no ícone de Coração (Favoritos) no topo da página ou clicar no ícone de Sacola estando dentro de uma página de item.
* **Resultado:** O cursor muda para pointer, mas nenhuma ação de rota/navegação acontece.
* **Esperado:** Redirecionar corretamente para as respectivas rotas `/loja/eletrc-store/favoritos` e `/loja/eletrc-store/sacola`. -->

### BUG #16 — Filtro de preço inconsistente (Mínimo > Máximo) não gera aviso
* **Onde:** Loja Pública → Painel de filtros lateral
* **Como reproduzir:** Setar o preço `Mínimo = 5000` e `Máximo = 100` e acionar a filtragem.
* **Resultado:** Tela exibe `"0 produtos encontrados"`, ocultando o erro lógico do input.
* **Esperado:** Alerta visual indicando que *"O valor mínimo não pode superar o valor máximo"*.

### BUG #17 — Botão "Limpar" dos filtros da loja ignora os campos de preço
* **Onde:** Loja Pública → Painel de filtros lateral
* **Como reproduzir:** Digitar valores nos campos Mín/Máx, selecionar categorias e clicar em `"Limpar"`.
* **Resultado:** Os checkboxes de categoria limpam, mas os inputs numéricos de preço mantêm os valores digitados ativos.
* **Esperado:** Reset total de todos os parâmetros de filtragem da tela (combos, inputs e checks).

### BUG #18 — Cupom em branco gera mensagem incorreta de erro
* **Onde:** Loja Pública → Sacola → Input de Cupom
* **Como reproduzir:** Clicar no botão `"Aplicar"` mantendo o campo totalmente vazio.
* **Resultado:** Exibe o alerta impeditivo `"Cupom não encontrado"`.
* **Esperado:** Desabilitar o botão enquanto o input for nulo, ou exibir a instrução `"Por favor, digite um código de cupom"`.

---

## 🟡 Bugs Moderados / UX (Média Prioridade)

### BUG #19 — Exibição de limite de usos do cupom está incompleta
* **Onde:** Admin → Cupons
* **Como reproduzir:** Observar a listagem de um cupom configurado com uso ilimitado (ex: *"APPLE20"*).
* **Resultado:** A coluna de métricas exibe a string `"0 /"`, deixando um caractere órfão.
* **Sugestão:** Formatar o texto para exibir `"0 / ilimitado"` ou `"0 / sem limite"`.

### BUG #20 — Inconsistência de dados entre as métricas do Dashboard e Cupons
* **Onde:** Dashboard principal vs Tela de gerenciamento de Cupons
* **Causa Provável:** O contador do Dashboard parece ignorar cupons salvos sem limite de uso explícito (*Ilimitados*).
* **Resultado:** O Dashboard reporta `"0 cupons ativos"`, enquanto a tela de cupons lista `1` cupom ativo em andamento.
* **Sugestão:** Ajustar a query de contagem para englobar cupons válidos por data, independentemente de possuírem teto de uso ou não.

### BUG #21 — Troca de variante de cor não altera a imagem principal do card
* **Onde:** Loja pública → Página de Produto (ex.: iPhone 15)
* **Como reproduzir:** Mudar a seleção de variantes de cor para "Rosa".
* **Resultado:** O bloco de mídia central continua exibindo as fotos associadas à cor padrão (Preta).
* **Esperado:** O seletor deve atualizar o índice do array de imagens para exibir a galeria correspondente à variação cromática escolhida.

### BUG #22 — Paginação do catálogo não persiste via parâmetros de URL
* **Onde:** Loja pública → Catálogo Geral
* **Como reproduzir:** Avançar para a página 2 ou 3 utilizando o componente de paginação inferior.
* **Resultado:** Os itens mudam na tela, mas a URL continua estática como `.../loja/eletrc-store` (sem parâmetros `?page=2`).
* **Impacto:** Perda de estado. Se o usuário der refresh ou compartilhar o link, ele será jogado de volta para a página 1.
* **Esperado:** Atualizar a query string da URL a cada navegação de página.

### BUG #23 — Reduzir quantidade na sacola para zero deleta o produto sumariamente
* **Onde:** Loja Pública → Sacola de compras
* **Como reproduzir:** Clicar no botão de subtração `[ − ]` em um item que possui quantidade igual a `1`.
* **Resultado:** O item some do carrinho sem nenhum aviso prévio.
* **Esperado:** O botão de decremento deve travar em `1` (com a exclusão sendo feita apenas via ícone de lixeira), ou emitir um aviso antes de apagar.

### BUG #24 — Slugs/Lojas inexistentes quebram o layout com dados mockados
* **Onde:** Rota global da aplicação (`/loja/slug-qualquer-inexistente`)
* **Como reproduzir:** Digitar uma sub-rota aleatória que não exista no banco de dados.
* **Resultado:** Carrega uma página quebrada exibindo a string estática `"Minha Loja"` em conjunto com erros internos no console.
* **Esperado:** Tratamento de erro via Router e redirecionamento limpo para uma página `404 - Não Encontrada`.

### BUG #25 — Produto sem imagem exibe placeholder confuso e oculta preço
* **Onde:** Loja pública → Vitrines
* **Resultado:** Produtos sem imagem cadastrada renderizam um ícone de sacola de compras cinza como placeholder e o preço some do card.
* **Sugestão:** Utilizar uma imagem padrão com a frase *"Imagem não disponível"* e garantir a renderização do preço em qualquer fluxo.

### BUG #26 — Contador numérico do badge da sacola calcula unidades em vez de itens distintos
* **Onde:** Loja Pública → Badge flutuante do Header
* **Comportamento:** Se o cliente adiciona 1 unidade do *Produto A* e 5 unidades do *Produto B*, o indicador exibe `6`. Porém, visualmente na sacola, constam apenas `2` linhas de produtos agrupados.
* **Sugestão:** Alinhar com a equipe de negócios se a contagem deve refletir o número de SKUs distintos (`Length` do array) ou a somatória de unidades (`Reduce` do objeto).

---

## 🟢 Bugs Menores / Melhorias (Baixa Prioridade)

### BUG #27 — Erro de digitação (*Typo*) na listagem de promoções
* **Onde:** Admin → Seção de Promoções
* **Texto atual:** `"2 promoçõoes cadastradas"`
* **Texto correto:** `"2 promoções cadastradas"`

### BUG #28 — String de ambiente de teste visível em ambiente de produção
* **Onde:** Loja Pública → Carrossel de Destaques
* **Descrição:** O título descritivo do bloco está fixado como `“✦ teste”`. Trata-se de dados residuais do setup de desenvolvimento.
* **Esperado:** Substituir por um título comercial adequado (ex: `“✦ Ofertas Especiais”` ou `“✦ Mais Vendidos”`).

### BUG #29 — Ausência de Badge de Desconto no card de destaques
* **Onde:** Loja Pública → Item *"Capa Ultra Hybrid iPhone 15 Pro"* no Carrossel.
* **Descrição:** O card não exibe o preço original riscado e nem o selo percentual de desconto, diferindo do padrão visual dos outros produtos vizinhos na mesma seção.

---

## ✅ Lista de Validações Concluídas (O que está funcionando)

Abaixo estão listados os recursos testados que **não apresentaram falhas** e operam conforme as especificações de negócio:

* [x] **Filtros:** Busca em tempo real no catálogo e comportamento de filtros de categoria hierárquicos e combinados.
* [x] **Segurança:** Sistema imune a injeções de scripts (*Proteção ativa contra XSS*) nos inputs de pesquisa do catálogo.
* [x] **Interface:** Alternância dinâmica de visualização das vitrines em modo Grade (Grid) ou Lista (List).
* [x] **Favoritos:** Fluxo de favoritar/desfavoritar com feedback em tempo real (exclusão por URL direta funcional).
* [x] **Sacola:** Seleção e deseleção de itens específicos para cálculo do valor total. O botão do WhatsApp é bloqueado corretamente caso haja `0` itens marcados.
* [x] **Compartilhamento:** Função de cópia de links para a área de transferência (*Clipboard*) gerando rotas válidas.
* [x] **Resiliência:** Tratamento nativo para IDs de produtos inválidos, direcionando o usuário para a tela customizada de *"Produto não encontrado"*.
* [x] **Modais:** O modal de identificação de compras valida corretamente se o nome está em branco.

---

## 🚀 Próximos Passos recomendados (Hotfix prioritário)

Para estabilização imediata da aplicação em ambiente de homologação, foque nos seguintes tópicos do relatório:
1. **BUG #01 & #11:** Travar validações de valores negativos e porcentagens absurdas nos formulários de produto/promoção.
2. **BUG #03:** Adicionar restrição de unicidade no banco de dados para evitar nomes de categorias idênticos.
3. **BUG #05 & #17:** Corrigir as funções de gatilho do botão "Limpar filtros" para recarregar as listas por inteiro.
4. **BUG #06:** Implementar a obrigatoriedade da escolha de variantes antes de liberar o botão de carrinho.