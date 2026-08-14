# Painel Administrativo e Importação de Candidatos

Implementação do conteúdo real do painel administrativo, incluindo cards de resumo, tabela de candidatos com busca e funcionalidade de importação via Excel utilizando SheetJS.

## Alterações

### 1. Página Admin (`/admin`)
- Adicionar cards de resumo no topo:
    - Total de candidatos cadastrados.
    - Candidatos com e-mail.
    - Candidatos sem e-mail.
- Tabela de candidatos:
    - Colunas: Nome, E-mail, Área, Nível de Cargo, Consultor, Status.
    - Barra de busca por nome.
    - Estado vazio: "Nenhum candidato cadastrado. Importe uma planilha para começar."
- Botão "Importar Candidatos (Excel)" no topo direito.

### 2. Modal de Importação
- Upload de arquivos `.xlsx`.
- Processamento com `SheetJS` (xlsx):
    - Identificação automática da aba (coluna "Assessorado").
    - Filtro por "Parceiro" = "LHH" (case-insensitive).
    - Normalização de nomes (remover parênteses, trim, lowercase).
- Mapeamento de colunas:
    - Assessorado -> nome / nome_normalizado.
    - Email -> email.
    - Parceiro -> parceiro.
    - Área -> area.
    - Nível de Cargo -> nivel_cargo.
    - Último Salário -> ultimo_salario.
    - Telefone -> telefone.
    - Jobhunter -> consultor_responsavel.
- Prévia da importação:
    - Tabela com as 10 primeiras linhas.
    - Resumo: total a importar, com/sem e-mail.
- Processo de confirmação:
    - Upsert baseado em `nome_normalizado`.
    - Feedback: "X inseridos, Y atualizados".

### 3. Backend e Integração
- Criar componentes de UI necessários para o painel (Cards, Table, Modal).
- Implementar lógica de fetching dos candidatos e resumos.

## Detalhes Técnicos
- Instalação da biblioteca `xlsx`.
- Uso de `shadcn/ui` (ou componentes Tailwind similares) para a interface.
- Consultas ao Supabase para resumos e listagem.
- Operações em lote para o upsert dos candidatos.
