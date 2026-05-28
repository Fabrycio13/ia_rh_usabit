# Spec: Permissionamento granular de Vagas para Convidado

## Contexto

Atualmente o perfil Convidado tem acesso apenas à listagem de vagas (view-only), mas não enxerga candidatos, pipeline, nem painel do candidato. O Gestor precisa de controle granular sobre quais vagas cada Convidado pode acessar, incluindo o pipeline vinculado e a visualização de candidatos.

## Requisitos Funcionais

### FR-01: Tabela de permissões convidado-vaga
Criar tabela `convidado_vaga_access` no banco para armazenar quais vagas cada Convidado pode ver.

### FR-02: Gestor gerencia permissões do Convidado
Na tela Configurações > Minha Equipe, ao visualizar/editar um usuário Convidado, o Gestor pode selecionar quais vagas da organização o Convidado pode acessar.

### FR-03: Convidado vê apenas vagas permitidas
A listagem de vagas (`/vagas`) para Convidado deve mostrar apenas as vagas que o Gestor selecionou.

### FR-04: Convidado vê candidatos das vagas permitidas
Ao clicar em uma vaga, o Convidado pode ver os candidatos daquela vaga (view-only).

### FR-05: Convidado acessa pipeline das vagas permitidas
O Convidado vê o item "Pipeline" na sidebar e pode acessar apenas os pipelines vinculados às vagas que ele tem permissão.

### FR-06: Pipeline read-only para Convidado
O Convidado visualiza o board do pipeline mas não pode:
- Arrastar cards entre colunas
- Criar/editar colunas
- Criar/excluir pipeline
- Vincular/desvincular vagas
- Adicionar/remover cards
- Reordenar cards

### FR-07: Convidado vê CandidatePanel (view-only)
Ao clicar em um candidato no pipeline ou na lista, o Convidado abre o painel do candidato com dados visíveis mas sem poder editar campos, alternar blacklist, ou mover para banco de talentos.

### FR-08: RLS protege todas as operações de escrita
Todas as tentativas de INSERT/UPDATE/DELETE do Convidado são bloqueadas no banco via RLS policies.

## Perfis e Hierarquia

| Perfil | Ações |
|--------|-------|
| **Owner** | Gerencia permissões de qualquer convidado (cross-org) |
| **Gestor** | Gerencia permissões de convidados da sua org |
| **RH** | Não gerencia permissões |
| **Convidado** | Apenas visualiza dados permitidos |

## Restrições Técnicas

- TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`)
- ESLint com regra `react-hooks/exhaustive-deps`
- RLS no Supabase como camada de segurança final
- `convidado_vaga_access` com `UNIQUE(convidado_user_id, vaga_id)`
- Pipeline.tsx ~2234 linhas — alterações cirúrgicas
