import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Validador estrutural do sistema de memória do IA RH.
 *
 * Garante que:
 * - os cinco arquivos canônicos existem
 * - AGENTS.md referencia os caminhos corretos
 * - IDs são únicos e obrigatórios
 * - handoffs respeitam a política (no máximo 1 ativo)
 * - Markdown não vaza segredos óbvios
 */

const MEMORY_FILES = [
    'README.md',
    'context.md',
    'decisions.md',
    'errors.md',
    'tasks.md',
] as const;

const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
    {
        name: 'JWT-like (eyJ segment)',
        regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/,
    },
    {
        name: 'Supabase anon/service key inline value (eyJ prefix)',
        regex: /["'`](eyJ[A-Za-z0-9_=-]{40,})["'`]/,
    },
    {
        name: 'Sk-OpenAI style key',
        regex: /sk-[A-Za-z0-9]{20,}/,
    },
    {
        name: 'GitHub PAT',
        regex: /ghp_[A-Za-z0-9]{30,}/,
    },
    {
        name: '.env value assignment with real secret (≥32 chars)',
        regex: /=\s*["'`][A-Za-z0-9_\-/+=]{32,}["'`]/,
    },
];

function readIfExists(path: string): string | null {
    return existsSync(path) ? readFileSync(path, 'utf-8') : null;
}

describe('Project Memory — estrutura mínima', () => {
    it('os cinco arquivos canônicos existem em memory/', () => {
        for (const file of MEMORY_FILES) {
            expect(
                existsSync(join('memory', file)),
                `memory/${file} deve existir`
            ).toBe(true);
        }
    });

    it('memory/ contém exatamente os arquivos canônicos esperados', () => {
        const entries = readdirSync('memory').sort();
        const expected = [...MEMORY_FILES].sort();
        expect(entries).toEqual(expected);
    });
});

describe('Project Memory — AGENTS.md referencia o sistema', () => {
    const agents = readIfExists('AGENTS.md');

    it('AGENTS.md existe', () => {
        expect(agents).not.toBeNull();
    });

    if (!agents) return;

    for (const file of MEMORY_FILES) {
        it(`AGENTS.md referencia memory/${file}`, () => {
            expect(
                agents.includes(`memory/${file}`),
                `AGENTS.md deve referenciar memory/${file}`
            ).toBe(true);
        });
    }
});

describe('Project Memory — decisions.md', () => {
    const content = readIfExists('memory/decisions.md');

    it('arquivo existe', () => {
        expect(content).not.toBeNull();
    });

    if (!content) return;

    const decisionIds = Array.from(content.matchAll(/^##\s+(DEC-\d{4}-\d{2}-\d{2}-\d{3})/gm)).map(
        (m) => m[1]
    );

    it('tem zero ou mais entradas DEC-', () => {
        expect(decisionIds.length).toBeGreaterThanOrEqual(0);
    });

    it('IDs DEC são únicos', () => {
        const seen = new Set<string>();
        const duplicates: string[] = [];
        for (const id of decisionIds) {
            if (seen.has(id)) duplicates.push(id);
            seen.add(id);
        }
        expect(duplicates, `IDs DEC duplicados: ${duplicates.join(', ')}`).toEqual([]);
    });

    it('entradas accepted têm campos obrigatórios', () => {
        const blocks = content.split(/^##\s+DEC-/m).slice(1);
        for (const block of blocks) {
            const firstLine = block.split('\n')[0]?.trim() ?? '';
            const idMatch = firstLine.match(/^DEC-\d{4}-\d{2}-\d{2}-\d{3}/);
            if (!idMatch) continue;
            const statusMatch = block.match(/-\s+\*\*Status:\*\*\s*(\w+)/);
            if (!statusMatch || statusMatch[1].trim().toLowerCase() !== 'accepted') continue;

            for (const field of [
                'Domains',
                'Keywords',
                'Decision',
                'Rationale',
                'Evidence',
                'Verified',
            ]) {
                expect(
                    block.includes(`**${field}:**`),
                    `DEC- deve ter campo ${field} quando status=accepted (bloco começando com: ${firstLine.slice(0, 80)})`
                ).toBe(true);
            }
        }
    });
});

describe('Project Memory — errors.md', () => {
    const content = readIfExists('memory/errors.md');

    it('arquivo existe', () => {
        expect(content).not.toBeNull();
    });

    if (!content) return;

    const errorIds = Array.from(content.matchAll(/^##\s+(ERR-\d{4}-\d{2}-\d{2}-\d{3})/gm)).map(
        (m) => m[1]
    );

    it('IDs ERR são únicos', () => {
        const seen = new Set<string>();
        const duplicates: string[] = [];
        for (const id of errorIds) {
            if (seen.has(id)) duplicates.push(id);
            seen.add(id);
        }
        expect(duplicates, `IDs ERR duplicados: ${duplicates.join(', ')}`).toEqual([]);
    });

    it('entradas resolved têm campos obrigatórios', () => {
        const blocks = content.split(/^##\s+ERR-/m).slice(1);
        for (const block of blocks) {
            const firstLine = block.split('\n')[0]?.trim() ?? '';
            const idMatch = firstLine.match(/^ERR-\d{4}-\d{2}-\d{2}-\d{3}/);
            if (!idMatch) continue;
            const statusMatch = block.match(/-\s+\*\*Status:\*\*\s*(\w+)/);
            if (!statusMatch || statusMatch[1].trim().toLowerCase() !== 'resolved') continue;

            for (const field of [
                'Domains',
                'Keywords',
                'Symptom',
                'Root cause',
                'Fix',
                'Evidence',
                'Prevent recurrence',
                'Verified',
            ]) {
                expect(
                    block.includes(`**${field}:**`),
                    `ERR- deve ter campo ${field} quando status=resolved (bloco começando com: ${firstLine.slice(0, 80)})`
                ).toBe(true);
            }
        }
    });
});

describe('Project Memory — tasks.md (no máximo 1 handoff ativo)', () => {
    const content = readIfExists('memory/tasks.md');

    it('arquivo existe', () => {
        expect(content).not.toBeNull();
    });

    if (!content) return;

    it('tem zero ou um HANDOFF-active', () => {
        const activeHandoffs = (content.match(/^##\s+HANDOFF-active\b/gm) ?? []).length;
        expect(
            activeHandoffs,
            `Esperado ≤1 HANDOFF-active, encontrado ${activeHandoffs}`
        ).toBeLessThanOrEqual(1);
    });

    it('handoff ativo tem campos obrigatórios', () => {
        const blocks = content.split(/^##\s+HANDOFF-/m).slice(1);
        for (const block of blocks) {
            const isActive = block.trimStart().startsWith('active');
            if (!isActive) continue;
            for (const field of [
                'Branch',
                'Updated',
                'Review after',
                'Base HEAD',
                'Goal',
                'Pending',
                'Relevant files',
                'Verification',
                'Blockers',
            ]) {
                expect(
                    block.includes(`**${field}:**`),
                    `HANDOFF-active deve ter campo ${field}`
                ).toBe(true);
            }
        }
    });

    it('Review after não é anterior a Updated', () => {
        const blocks = content.split(/^##\s+HANDOFF-/m).slice(1);
        for (const block of blocks) {
            const updatedMatch = block.match(/-\s+\*\*Updated:\*\*\s*(\d{4}-\d{2}-\d{2})/);
            const reviewMatch = block.match(/-\s+\*\*Review after:\*\*\s*(\d{4}-\d{2}-\d{2})/);
            if (!updatedMatch || !reviewMatch) continue;
            const updated = updatedMatch[1];
            const review = reviewMatch[1];
            expect(
                review >= updated,
                `Review after (${review}) deve ser ≥ Updated (${updated})`
            ).toBe(true);
        }
    });
});

describe('Project Memory — scan de segredos nos Markdown', () => {
    for (const file of MEMORY_FILES) {
        it(`memory/${file} não contém padrões óbvios de segredo`, () => {
            const content = readIfExists(join('memory', file));
            if (!content) return;

            const matches: string[] = [];
            for (const { name, regex } of SECRET_PATTERNS) {
                if (regex.test(content)) {
                    matches.push(name);
                }
            }
            expect(matches, `Padrões encontrados em memory/${file}: ${matches.join(', ')}`).toEqual([]);
        });
    }

    it('memory/README.md não vaza segredo em exemplos', () => {
        const content = readIfExists('memory/README.md');
        if (!content) return;
        // README pode mencionar o nome da regra mas não deve carregar valores reais
        for (const { name, regex } of SECRET_PATTERNS) {
            if (regex.test(content)) {
                // .env com valor dummy curto é aceitável; senão, falhar
                if (name.includes('≥32 chars')) {
                    // aceita strings curtas (< 32 chars) no .env simulation
                    const realHits = content.match(/=\s*["'`][A-Za-z0-9_\-/+=]{32,}["'`]/);
                    expect(realHits, `README contém ${name}`).toBeNull();
                } else {
                    expect(true, `README contém ${name}`).toBe(false);
                }
            }
        }
    });
});
