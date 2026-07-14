import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { LangProvider, useLang } from '../../src/core/contexts/LangContext';
import { ThemeProvider, useTheme } from '../../src/core/contexts/ThemeContext';

const store: Record<string, string> = {};
const mockStorage = {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
vi.stubGlobal('localStorage', mockStorage);

vi.mock('../src/core/services/supabase', () => ({
    supabase: {
        auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
        from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(() => Promise.resolve({ data: null })) })) })), insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null })) })) })) })),
        storage: { from: vi.fn(() => ({ upload: vi.fn() })) },
        channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })) })),
        removeChannel: vi.fn(),
    }
}));

describe('LangContext', () => {
    beforeEach(() => localStorage.clear());

    it('default lang é pt', () => {
        const { result } = renderHook(() => useLang(), { wrapper: LangProvider });
        expect(result.current.lang).toBe('pt');
        expect(result.current.t('settings')).toBe('Configurações');
    });

    it('setLang alterna para en', () => {
        const { result } = renderHook(() => useLang(), { wrapper: LangProvider });
        act(() => result.current.setLang('en'));
        expect(result.current.lang).toBe('en');
        expect(result.current.t('settings')).toBe('Settings');
    });

    it('persiste lang no localStorage', () => {
        const { result } = renderHook(() => useLang(), { wrapper: LangProvider });
        act(() => result.current.setLang('en'));
        expect(localStorage.getItem('app_lang')).toBe('en');
    });
});

describe('ThemeContext', () => {
    beforeEach(() => localStorage.clear());

    it('default theme é dark', () => {
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        expect(result.current.theme).toBe('dark');
    });

    it('toggleTheme alterna para light', () => {
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        act(() => result.current.toggleTheme());
        expect(result.current.theme).toBe('light');
    });

    it('toggleTheme em light volta pra dark', () => {
        localStorage.setItem('app-theme', 'light');
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        expect(result.current.theme).toBe('light');
        act(() => result.current.toggleTheme());
        expect(result.current.theme).toBe('dark');
    });

    it('setBgTheme planets força dark se for light', () => {
        localStorage.setItem('app-theme', 'light');
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        expect(result.current.theme).toBe('light');
        act(() => result.current.setBgTheme('planets'));
        expect(result.current.bgTheme).toBe('planets');
        expect(result.current.theme).toBe('dark');
    });

    it('setBgTheme frequence força dark se for light', () => {
        localStorage.setItem('app-theme', 'light');
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        expect(result.current.theme).toBe('light');
        act(() => result.current.setBgTheme('frequence'));
        expect(result.current.bgTheme).toBe('frequence');
        expect(result.current.theme).toBe('dark');
    });

    it('togglePlanetMode alterna entre spatial→planets', () => {
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        expect(result.current.bgTheme).toBe('spatial');
        act(() => result.current.togglePlanetMode());
        expect(result.current.bgTheme).toBe('planets');
        act(() => result.current.togglePlanetMode());
        expect(result.current.bgTheme).toBe('simple');
    });

    it('customPrimaryColor salva no localStorage', () => {
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        act(() => result.current.setCustomPrimaryColor('#ff0000'));
        expect(localStorage.getItem('app-custom-primary')).toBe('#ff0000');
    });
});
