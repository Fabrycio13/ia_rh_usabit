# Implementation Plan: Storage Tightening — Currículos em Bucket Privado

**Branch**: `cleanup/over-engineering-v1` | **Date**: 2026-06-28

## Summary

Bucket `job-applications` foi criado como `public = true` (migration 040). Migration 041 existe com SQL para torná-lo privado, mas:

1. **Código** — 3 arquivos usam `getPublicUrl()` no bucket `job-applications`, que retorna URL `/object/public/...` → 404 após bucket privado.
2. **RLS SELECT** — não cobre paths `resumes/spontaneous/<org_id>/...` nem `resumes/manual/<org_id>/...` (split_part pega 'spontaneous'/'manual' em vez de UUID).
3. **RLS DELETE** — mesmo problema da SELECT.
4. **Migration 041** — existe mas não aplicada no projeto Supabase.

Fix: substituir `getPublicUrl()` por path local `job-applications/<path>` (já suportado por `handleViewResume` e `downloadResume`) e corrigir ambas as RLS policies.

## Diagnosis

| # | Problema | Local | Efeito |
|---|---|---|---|
| A | `getPublicUrl()` gera URL `/object/public/` morta | `JobApplication.tsx:784`, `SpontaneousApplication.tsx:538`, `PoolAddCandidate.tsx:109` | Após bucket privado, URL no DB 404 |
| B | RLS SELECT só entende `resumes/<uuid>/...` | `041_secure_storage_bucket.sql` | RH não vê currículos espontâneos nem manuais |
| C | Migration 041 existe mas não aplicada | Supabase project | Bucket ainda `public = true` |

## O Fluxo

```
Antes (bucket público):
  Upload → getPublicUrl() → "/object/public/job-applications/..." → DB → RH usa URL direta

Depois (bucket privado):
  Upload → guardar só "job-applications/<path>" → DB → handleViewResume/downloadResume → createSignedUrl() → RH vê normal
```

`handleViewResume()` e `downloadResume()` já detectam prefixo `job-applications/` e convertem para signed URL. O RH não sente diferença.

## Plano de Ação

### 1. Migration SQL — `supabase/migrations/068_fix_storage_spontaneous_path.sql`

**a) Atualizar RLS SELECT — 3 formatos de path:**

```sql
DROP POLICY IF EXISTS "storage: recruiter access" ON storage.objects;

CREATE POLICY "storage: recruiter access"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'job-applications'
    AND (
        (public.get_my_role() = 'owner')
        OR
        -- Path padrão: resumes/<vaga_uuid>/<arquivo>
        EXISTS (
            SELECT 1 FROM public.vagas_white_label v
            WHERE v.id::text = split_part(name, '/', 2)
              AND (v.organization_id = public.get_my_org_id() OR v.user_id = auth.uid())
        )
        OR
        -- Path espontâneo: resumes/spontaneous/<org_uuid>/<arquivo>
        (split_part(name, '/', 2) = 'spontaneous'
         AND split_part(name, '/', 3) = public.get_my_org_id()::text)
        OR
        -- Path manual (PoolAddCandidate): resumes/manual/<org_uuid>/<arquivo>
        (split_part(name, '/', 2) = 'manual'
         AND split_part(name, '/', 3) = public.get_my_org_id()::text)
    )
);
```

**b) Garantir bucket privado:**

```sql
UPDATE storage.buckets 
SET public = false 
WHERE id = 'job-applications';
```

### 2. Código — Substituir `getPublicUrl` por path local (3 arquivos)

Em todos, trocar `getPublicUrl()` por `job-applications/${filePath}`.

**`src/pages/vagas/JobApplication.tsx:784`:**

```typescript
// ANTES
const { data: { publicUrl } } = supabase.storage.from('job-applications').getPublicUrl(filePath);
return publicUrl;

// DEPOIS
return `job-applications/${filePath}`;
```

**`src/pages/vagas/SpontaneousApplication.tsx:538`:**

```typescript
// ANTES
const { data: { publicUrl } } = supabase.storage.from('job-applications').getPublicUrl(filePath);
return publicUrl;

// DEPOIS
return `job-applications/${filePath}`;
```

**`src/features/candidates/components/PoolAddCandidate.tsx:109-111`:**

```typescript
// ANTES
const { data: { publicUrl } } = supabase.storage.from('job-applications').getPublicUrl(filePath);
setResumeUrl(publicUrl);

// DEPOIS
setResumeUrl(`job-applications/${filePath}`);
```

### 3. Teste — Atualizar `storage_leak.test.ts`

- Os 2 testes de falha intencional agora devem passar
- Remover comentários de "intentional failure"
- Adicionar caso de path espontâneo e manual

### 4. Aplicar migration

```bash
npx supabase migration up
```

## Compatibilidade Retroativa

- **Registros antigos** no DB têm URLs `/object/public/job-applications/...` → `handleViewResume` detecta `/object/public/` → signed URL ✓
- **Registros novos** terão `job-applications/<path>` → `handleViewResume` detecta prefixo `job-applications/` → signed URL ✓
- Ambos convivem sem problema
- `downloadResume` em PoolTalentos.tsx e ReanalyzeCandidateModal.tsx já tratam ambos formatos — 0 alterações

## Dependências

1. Migration SQL deve ser criada antes das mudanças de código
2. Aplicar migration + code fix no mesmo deploy (ou code fix primeiro, que funciona com bucket público)

## Riscos

1. **Migration sem code fix**: `getPublicUrl` retorna URL 404 — candidaturas durante o deploy quebram. Mitigação: aplicar ambos no mesmo deploy.
2. **Registros com `resume_url` nulo**: `handleViewResume` já trata com toast. Zero risco.
3. **Bucket `resumes`** (já privado) também tem `getPublicUrl` em `AnalysisContext.tsx` e `AddCandidateModal.tsx` — fora do escopo, pois URLs são consumidas internamente via signed URL. Pode ser tratado em plano futuro se necessário.
