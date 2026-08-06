import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexPath = join(process.cwd(), 'supabase/functions/openai-proxy/index.ts');
const scoringPath = join(process.cwd(), 'supabase/functions/openai-proxy/prompts/scoring.ts');
const batchIndex = readFileSync(indexPath, 'utf-8');

describe('openai-proxy — regressão dos prompts de IA', () => {
    it('batch-scoring tem ISOLAMENTO TOTAL (nunca comparar candidatos entre si)', () => {
        // Regressão do bug real: a IA escreveu "porém com menos enfoque em design
        // visual comparado ao candidato 1" — o prompt do batch não tinha isolamento.
        expect(batchIndex).toMatch(/ISOLAMENTO TOTAL/i);
        expect(batchIndex).toMatch(/completamente INDEPENDENTE/i);
        expect(batchIndex).toMatch(/NUNCA compare um candidato com outro/i);
        expect(batchIndex).toMatch(/candidato 1|o outro|comparado ao anterior/i);
    });

    it('scoring individual tem instrução de isolamento', () => {
        expect(batchIndex).toMatch(/ISOLAMENTO TOTAL/i);
    });

    it('prompt de scoring obriga redFlags array (nunca "Nenhuma identificada")', () => {
        // Regressão do bug real: placeholder "Nenhuma identificada" aparecia como
        // análise real. O prompt agora exige array vazio [] quando não há pontos.
        const scoringSource = readFileSync(scoringPath, 'utf-8');
        expect(scoringSource).toMatch(/OBRIGATÓRIO/i);
        expect(scoringSource).toMatch(/NUNCA use o texto "Nenhuma identificada"/);
        expect(scoringSource).toMatch(/Use array vazio \[\]/);
    });

    it('ALLOWED_ROLES não contém gestor (role inexistente)', () => {
        // Regressão do M-3: 'gestor' não existe na hierarquia
        expect(batchIndex).not.toMatch(/'gestor'/);
        expect(batchIndex).toMatch(/ALLOWED_ROLES = \['rh', 'supervisor', 'administrador', 'owner'\]/);
    });

    it('rate limit ativo no proxy (60 req/min)', () => {
        expect(batchIndex).toMatch(/checkRateLimit/);
        expect(batchIndex).toMatch(/RATE_LIMIT_MAX/);
    });
});

describe('enrich-candidate — regressão', () => {
    const enrichPath = join(process.cwd(), 'supabase/functions/enrich-candidate/index.ts');
    const enrichSource = readFileSync(enrichPath, 'utf-8');

    it('ALLOWED_ROLES sem gestor', () => {
        expect(enrichSource).not.toMatch(/'gestor'/);
        expect(enrichSource).toMatch(/ALLOWED_ROLES = \['rh', 'supervisor', 'administrador', 'owner'\]/);
    });

    it('UPDATE do candidato filtra por organization_id (defesa em profundidade)', () => {
        // Regressão do M-4: o UPDATE não repetia o filtro de org
        expect(enrichSource).toMatch(/\.update\(updates\)\.eq\('id', candidateId\)\.eq\('organization_id', callerOrgId\)/);
    });
});
