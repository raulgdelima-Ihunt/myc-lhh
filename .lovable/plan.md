# Limpeza e Polimento do Portal LHH

Refinamento da experiência do usuário, remoção de elementos de debug, melhorias visuais nas tabelas e reforço da segurança nas rotas.

## Ações de Limpeza e Interface

- **Remoção de Debugs:**
  - Limpar logs de console em `admin.index.tsx`, `admin.candidato.$id.tsx` e `index.tsx`.
  - Remover o banner amarelo de debug e a mensagem de "Rota carregada" em `admin.candidato.$id.tsx`.
- **Refinamento da Tabela Admin (/admin):**
  - Remover a coluna "Ações" e o botão "Ver".
  - Tornar a linha inteira clicável, mantendo a navegação via `window.location.href`.
  - Adicionar classes CSS para `cursor: pointer` e hover highlight mais nítido nas linhas.
  - Formatar candidatos sem e-mail exibindo "Sem e-mail" em cinza claro (`text-gray-400`).
- **Página de Detalhes (/admin/candidato/:id):**
  - Implementar lógica para exibir "Acesso já configurado" (verde) se o candidato já possuir acesso, escondendo o botão de criação.
  - Formatar o feedback de criação de acesso em um card amarelo claro destacado com as instruções de envio.
- **Dashboard do Candidato (/dashboard):**
  - Transformar nomes de vagas com `vaga_link` em links clicáveis (`target="_blank"`).
  - Estilizar a coluna "Resultado" com cores semânticas:
    - "CV Enviado" -> Azul.
    - Contém "Entrevista" -> Verde.
    - Contém "não indicado" ou "Perfil não aderente" -> Cinza.
    - Vazio ou "Sem retorno" -> Cinza claro.

## Segurança e Autorização

- **Middleware de Rota (`AuthGuard`):**
  - Atualizar para validar a role do usuário no Supabase.
  - Restringir `/admin` e `/admin/candidato/*` apenas para `admin`.
  - Redirecionar candidatos que tentarem acessar áreas administrativas para o `/dashboard`.
- **Controle de Acesso Pós-Login:**
  - Garantir que o login redirecione corretamente e impeça o acesso de e-mails não vinculados a candidatos (já parcialmente implementado, mas será revisado).

## Detalhes Técnicos

- Utilização de classes Tailwind para os estados de hover e cores semânticas.
- Consulta à tabela `user_roles` dentro do `AuthGuard` para garantir proteção em tempo real.
- Uso de `window.location.href` como mecanismo de navegação estável para as rotas administrativas.
