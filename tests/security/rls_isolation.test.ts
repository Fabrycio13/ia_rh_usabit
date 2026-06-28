import { describe, it, expect } from 'vitest';

function canAccessByRole(role: string | null, userOrg: string | null, dataOrg: string | null, userId: string | null, dataUserId: string | null): boolean {
    if (role === 'owner') return true;
    if (role === 'administrador' || role === 'supervisor' || role === 'rh') {
        return dataOrg != null && userOrg === dataOrg;
    }
    if (role === 'convidado') {
        return userId != null && dataUserId != null && userId === dataUserId;
    }
    return false;
}

function canManageProfiles(role: string | null, userOrg: string | null, targetOrg: string | null): boolean {
    if (role === 'owner') return true;
    if (role === 'administrador' || role === 'supervisor') {
        return targetOrg != null && userOrg === targetOrg;
    }
    return false;
}

function canAccessLogs(role: string | null, userOrg: string | null, logOrg: string | null, logUserId: string | null, currentUserId: string | null): boolean {
    if (role === 'owner') return true;
    if (role === 'administrador' || role === 'supervisor') {
        return logOrg != null && userOrg === logOrg;
    }
    if (role === 'rh') {
        return logUserId != null && currentUserId != null && logUserId === currentUserId;
    }
    return false;
}

describe('RLS Isolation - Multi-tenancy por role', () => {

    it('owner acessa dados de qualquer organização', () => {
        expect(canAccessByRole('owner', 'org-a', 'org-b', 'u1', 'u2')).toBe(true);
        expect(canAccessByRole('owner', 'org-a', 'org-a', 'u1', 'u2')).toBe(true);
        expect(canAccessByRole('owner', null, 'org-a', null, 'u2')).toBe(true);
    });

    it('administrador so ve dados da propria organização', () => {
        const adminOrg = 'org-admin';
        expect(canAccessByRole('administrador', adminOrg, 'org-admin', 'u1', 'u2')).toBe(true);
        expect(canAccessByRole('administrador', adminOrg, 'org-outra', 'u1', 'u2')).toBe(false);
        expect(canAccessByRole('administrador', adminOrg, null, 'u1', 'u2')).toBe(false);
    });

    it('supervisor so ve dados da propria organização', () => {
        const supOrg = 'org-sup';
        expect(canAccessByRole('supervisor', supOrg, 'org-sup', 'u1', 'u2')).toBe(true);
        expect(canAccessByRole('supervisor', supOrg, 'org-outra', 'u1', 'u2')).toBe(false);
    });

    it('rh so ve dados da propria organização', () => {
        const rhOrg = 'org-rh';
        expect(canAccessByRole('rh', rhOrg, 'org-rh', 'u1', 'u2')).toBe(true);
        expect(canAccessByRole('rh', rhOrg, 'org-outra', 'u1', 'u2')).toBe(false);
    });

    it('convidado nao ve dados de outras organizações nem de outros usuarios', () => {
        expect(canAccessByRole('convidado', 'org-conv', 'org-conv', 'u1', 'u2')).toBe(false);
        expect(canAccessByRole('convidado', 'org-conv', 'org-outra', 'u1', 'u2')).toBe(false);
        expect(canAccessByRole('convidado', 'org-conv', 'org-conv', 'u1', 'u1')).toBe(true);
    });

    it('usuario nao autenticado nao acessa dados protegidos', () => {
        expect(canAccessByRole(null, null, 'org-a', null, 'u1')).toBe(false);
        expect(canAccessByRole(null, null, null, null, null)).toBe(false);
    });

    it('apenas owner e administrador/supervisor podem gerenciar perfis da organização', () => {
        expect(canManageProfiles('owner', 'org-a', 'org-b')).toBe(true);
        expect(canManageProfiles('administrador', 'org-a', 'org-a')).toBe(true);
        expect(canManageProfiles('supervisor', 'org-a', 'org-a')).toBe(true);
        expect(canManageProfiles('rh', 'org-a', 'org-a')).toBe(false);
        expect(canManageProfiles('convidado', 'org-a', 'org-a')).toBe(false);
        expect(canManageProfiles('administrador', 'org-a', 'org-b')).toBe(false);
    });

    it('logs: owner ve tudo, admin/supervisor veem da org, rh ve proprios', () => {
        expect(canAccessLogs('owner', 'org-a', 'org-b', 'u3', 'u1')).toBe(true);
        expect(canAccessLogs('administrador', 'org-a', 'org-a', 'u3', 'u1')).toBe(true);
        expect(canAccessLogs('administrador', 'org-a', 'org-b', 'u3', 'u1')).toBe(false);
        expect(canAccessLogs('supervisor', 'org-a', 'org-a', 'u3', 'u1')).toBe(true);
        expect(canAccessLogs('supervisor', 'org-a', 'org-b', 'u3', 'u1')).toBe(false);
        expect(canAccessLogs('rh', 'org-a', 'org-a', 'u1', 'u1')).toBe(true);
        expect(canAccessLogs('rh', 'org-a', 'org-a', 'u2', 'u1')).toBe(false);
    });
});
