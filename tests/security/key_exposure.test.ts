import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function walkDir(dir: string): string[] {
    const files: string[] = [];
    try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
            const full = join(dir, entry);
            const stat = statSync(full);
            if (stat.isDirectory()) {
                if (!entry.startsWith('node_modules') && entry !== 'node_modules') {
                    files.push(...walkDir(full));
                }
            } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
                files.push(full);
            }
        }
    } catch { /* skip */ }
    return files;
}

describe('Key Exposure - codebase scan', () => {

    const srcFiles = walkDir('src').filter(f => !f.endsWith('.d.ts'));

    it('arquivos .env ignorados via *.local no gitignore', () => {
        const gitignore = readFileSync('.gitignore', 'utf-8');
        expect(gitignore).toContain('*.local');
    });

    it('VITE_SUPABASE_ANON_KEY usado apenas via import.meta.env', () => {
        const directKeys = srcFiles.filter(f => {
            try {
                const content = readFileSync(f, 'utf-8');
                if (f.includes('vite.config') || f.includes('.test.')) return false;
                const lines = content.split('\n');
                return lines.some(l =>
                    /["']sb-[a-zA-Z0-9_-]{20,}["']/.test(l) ||
                    /["']eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+/.test(l)
                );
            } catch { return false; }
        });
        expect(directKeys).toEqual([]);
    });

    it('service_role key nao aparece no codigo fonte', () => {
        const hasServiceRole = srcFiles.filter(f => {
            try {
                const content = readFileSync(f, 'utf-8');
                if (f.includes('.test.')) return false;
                return content.includes('service_role') && !content.includes('supabase/functions/');
            } catch { return false; }
        });
        expect(hasServiceRole).toEqual([]);
    });

    it('nenhuma URL absoluta de producao hardcoded em servicos', () => {
        const prodUrls = srcFiles.filter(f => {
            try {
                const content = readFileSync(f, 'utf-8');
                if (f.includes('.test.')) return false;
                return /https?:\/\/(?:[^/\s]+\.)*supabase\.co/.test(content) &&
                    !content.includes('import.meta.env') &&
                    !content.includes('VITE_SUPABASE');
            } catch { return false; }
        });
        expect(prodUrls).toEqual([]);
    });
});
