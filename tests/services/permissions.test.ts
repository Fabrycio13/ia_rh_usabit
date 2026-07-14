import { describe, it, expect } from 'vitest';
import { hasPermission } from '../../src/core/config/permissions';

describe('Permissões por perfil', () => {

    const allPermissions = ['dashboard', 'vagas', 'vagas_edit', 'analises', 'analises_edit', 'candidatos', 'candidatos_edit', 'pipeline', 'pipeline_edit', 'chat', 'chat_widget', 'admin', 'logs'] as const;

    it('owner tem todas as permissoes', () => {
        for (const perm of allPermissions) {
            expect(hasPermission('owner', perm)).toBe(true);
        }
    });

    it('administrador tem tudo exceto chat', () => {
        for (const perm of allPermissions) {
            if (perm === 'chat') {
                expect(hasPermission('administrador', perm)).toBe(false);
            } else {
                expect(hasPermission('administrador', perm)).toBe(true);
            }
        }
    });

    it('supervisor tem tudo exceto chat', () => {
        for (const perm of allPermissions) {
            if (perm === 'chat') {
                expect(hasPermission('supervisor', perm)).toBe(false);
            } else {
                expect(hasPermission('supervisor', perm)).toBe(true);
            }
        }
    });

    it('rh nao tem admin nem logs', () => {
        const denied = new Set(['admin', 'logs', 'chat']);
        for (const perm of allPermissions) {
            if (denied.has(perm)) {
                expect(hasPermission('rh', perm)).toBe(false);
            } else {
                expect(hasPermission('rh', perm)).toBe(true);
            }
        }
    });

    it('convidado so tem vagas e pipeline (sem edit)', () => {
        const allowed = new Set(['vagas', 'pipeline']);
        for (const perm of allPermissions) {
            if (allowed.has(perm)) {
                expect(hasPermission('convidado', perm)).toBe(true);
            } else {
                expect(hasPermission('convidado', perm)).toBe(false);
            }
        }
    });

    it('role desconhecida retorna false', () => {
        for (const perm of allPermissions) {
            expect(hasPermission('inexistente', perm)).toBe(false);
            expect(hasPermission('', perm)).toBe(false);
        }
    });
});
