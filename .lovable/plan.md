# Plano de Implementação: Importação de Indicações de Vagas

Adição de funcionalidade para importar indicações de vagas a partir de arquivos Excel com múltiplas abas no painel administrativo.

## Mudanças no Banco de Dados (Via Migration)
- Nenhuma alteração de esquema necessária (tabela `indicacoes` já possui os campos e restrição UNIQUE necessários).

## Frontend e Componentes

### 1. Novo Componente de Importação
- Criar `src/components/admin/import-indicacoes-modal.tsx`:
  - Lógica para ler múltiplas abas do Excel.
  - Filtro de abas: Apenas abas com a coluna "Cliente" na linha 1.
  - Mapeamento flexível de colunas (case-insensitive, trim):
    - Cliente, Vagas, Empresa, Indicação, Link, Formato, Data, Resultado.
  - Processamento de dados:
    - Normalização do nome do cliente.
    - Busca de `candidato_id` na tabela `candidatos` (match exato por `nome_normalizado` ou parcial pelas 2 primeiras palavras).
    - Conversão de datas (suporte a formato Excel e texto DD/MM/YYYY).
  - Interface de prévia:
    - Log de debug (abas processadas/ignoradas).
    - Contadores (vinculados, não vinculados, novas, atualizações).
    - Lista de nomes não vinculados.
    - Tabela com as 10 primeiras linhas.
  - Execução de Upsert (UNIQUE: `candidato_id`, `vaga`, `empresa`, `data_acao`).

### 2. Painel Admin (`src/routes/admin.tsx`)
- Adicionar botão "Importar Indicações (Excel)" ao lado do botão de candidatos.
- Adicionar novo card de estatísticas: "Total de Indicações".

### 3. Hooks de Dados (`src/hooks/use-candidatos.ts`)
- Adicionar `useIndicacoesStats` para buscar o total de indicações para o dashboard admin.

## Detalhes Técnicos
- Mapeamento de colunas para `indicacoes`:
  - A (Cliente) -> Busca `candidato_id`
  - B (Vagas) -> `vaga` (Ignorar se vazio)
  - C (Empresa) -> `empresa`
  - D (Indicação) -> `indicacao_contato`
  - E (Link) -> `vaga_link`
  - F (Formato) -> `formato`
  - G (Data) -> `data_acao`
  - H (Resultado) -> `resultado`
  - Nome da aba -> `jobhunter`
- Estratégia de Match de Cliente:
  1. `nome_normalizado` (ex: "fulano silva")
  2. Match parcial: `split(' ').slice(0, 2).join(' ')` (ex: "fulano silva" match "fulano silva junior")
