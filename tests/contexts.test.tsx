import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, renderHook } from '@testing-library/react';
import { LangProvider, useLang } from '../src/core/contexts/LangContext';
import { ThemeProvider, useTheme } from '../src/core/contexts/ThemeContext';
import { AnalysisProvider, useAnalysis } from '../src/core/contexts/AnalysisContext';

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

vi.mock('../src/core/services/cvAnalyzer', () => ({
    processFiles: vi.fn()
}));

vi.mock('../src/core/services/logger', () => ({
    logActivity: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
    default: { error: vi.fn(), success: vi.fn() }
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

describe('AnalysisContext', () => {
    beforeEach(() => localStorage.clear());

    it('estado inicial', () => {
        const { result } = renderHook(() => useAnalysis(), { wrapper: AnalysisProvider });
        expect(result.current.analyzing).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.result).toBeNull();
        expect(result.current.jobName).toBe('');
    });

    it('setError atualiza o estado', () => {
        const { result } = renderHook(() => useAnalysis(), { wrapper: AnalysisProvider });
        act(() => result.current.setError('falha na análise'));
        expect(result.current.error).toBe('falha na análise');
    });

    it('setJobDescription funciona', () => {
        const { result } = renderHook(() => useAnalysis(), { wrapper: AnalysisProvider });
        act(() => result.current.setJobDescription('descrição de teste'));
        expect(result.current.jobDescription).toBe('descrição de teste');
    });

    it('clearAnalysis reseta tudo', () => {
        const { result } = renderHook(() => useAnalysis(), { wrapper: AnalysisProvider });
        act(() => result.current.setError('erro'));
        act(() => result.current.setJobDescription('desc'));
        act(() => result.current.clearAnalysis());
        expect(result.current.analyzing).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.result).toBeNull();
        expect(result.current.jobName).toBe('');
        expect(result.current.jobDescription).toBe('');
    });
});
