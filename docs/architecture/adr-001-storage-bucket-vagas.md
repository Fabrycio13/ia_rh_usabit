# ADR-001: Bucket de Storage para Imagens de Fundo de Vagas

## Status
Accepted

## Context
Ao implementar o sistema de design individualizado por vaga, precisamos armazenar imagens de fundo enviadas pelo recrutador. Precisávamos decidir entre criar um bucket novo (`vagas`) ou reutilizar o bucket existente (`organizations`).

## Decision
Usar o bucket `organizations` existente com subpasta estruturada por organização e vaga:
`organizations/{org_id}/vagas/bg_{random}.{ext}`

## Rationale
1. **Evita proliferação de buckets**: Um bucket a menos para gerenciar no Supabase.
2. **Reutiliza RLS já configurado**: As políticas de INSERT/DELETE já isolam por `org_id` via `(storage.foldername(name))[1]`, o que funciona com a estrutura de pasta proposta.
3. **Consistência**: Todos os ativos visuais de uma organização (logo, capa, fundo de vagas) ficam centralizados no mesmo bucket.
4. **Simplicidade**: Princípio core da arquitetura — start simple, add complexity only when proven necessary.

## Trade-offs
- **Aceito**: Um bucket único para tipos de recursos diferentes exige disciplina nas convenções de nomes de pastas.
- **Mitigação**: Convenção de nomes bem definida (`{org_id}/vagas/bg_*.ext` vs `{org_id}/clients/logo_*.ext`) garante rastreabilidade.

## Consequences
- **Positive**: Zero configuração nova no Supabase; herda leitura pública; isolamento por org mantido.
- **Negative**: Sem isolamento por tipo de recurso (logos vs fundos no mesmo bucket).
- **Mitigation**: Subpastas com nomes descritivos (`vagas/`, `clients/`) funcionam como namespaces visuais.

## Revisit Trigger
Se precisarmos de políticas de acesso diferenciadas por tipo de recurso (ex: fundos de vagas acessíveis só autenticados), criar bucket `vagas` separado.
