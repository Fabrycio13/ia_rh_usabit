import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VagaForm } from '../src/pages/vagas/VagaForm';

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
});

const mockSingle = vi.fn();
const mockLimit = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn(() => ({ error: null }));

vi.mock('../src/core/services/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } }, error: null })),
            getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'user-123' } } } })),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
        from: vi.fn(() => ({
            select: mockSelect,
            insert: mockInsert,
        })),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: { error: vi.fn(), success: vi.fn() }
}));

vi.mock('../src/core/services/logger', () => ({
    logActivity: vi.fn(() => Promise.resolve())
}));

vi.mock('../src/core/contexts/ThemeContext', () => ({
    useTheme: () => ({ bgTheme: 'spatial', theme: 'dark', toggleTheme: vi.fn(), planetMode: false, setBgTheme: vi.fn(), togglePlanetMode: vi.fn(), customPrimaryColor: null, setCustomPrimaryColor: vi.fn(), customTextColor: null, setCustomTextColor: vi.fn() }),
    ThemeProvider: ({ children }: any) => children,
}));

describe('VagaForm - criar vaga', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        for (const k in store) delete store[k];
        mockSelect.mockReturnValue({
            eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { organization_id: 'org-456' }, error: null })),
                order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                        single: vi.fn(() => Promise.resolve({ data: { id: 'vaga-789', title: 'Teste' } }))
                    }))
                }))
            }))
        });
    });

    it('preenche formulário completo e cria vaga com sucesso', async () => {
        vi.setConfig({ testTimeout: 15000 });
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/vagas/nova']}>
                <Routes>
                    <Route path="/vagas/nova" element={<VagaForm />} />
                </Routes>
            </MemoryRouter>
        );

        await screen.findByPlaceholderText('Ex: Desenvolvedor Frontend React Senior');

        // Step 1: título, categoria, status
        await user.type(screen.getByPlaceholderText('Ex: Desenvolvedor Frontend React Senior'), 'Desenvolvedor Frontend');
        await user.click(screen.getByRole('button', { name: 'Desenvolvimento' }));
        await user.click(screen.getByRole('button', { name: /Publicada/ }));
        await user.click(screen.getByRole('button', { name: 'Próximo' }));

        // Step 2: modelo, contrato, regime
        await screen.findByText(/Detalhes do Cargo/);
        await user.click(screen.getByRole('button', { name: /^Remoto/ }));
        await user.click(screen.getByRole('button', { name: /^CLT/ }));
        await user.click(screen.getByRole('button', { name: /Tempo Integral/ }));
        await user.click(screen.getByRole('button', { name: 'Próximo' }));

        // Step 3: responsabilidades, requisitos
        await screen.findByPlaceholderText(/Desenvolver aplicações/);
        await user.type(screen.getByPlaceholderText(/Desenvolver aplicações/), '• Desenvolver features\n• Manter código');
        await user.type(screen.getByPlaceholderText(/Experiência com React/), '• React\n• TypeScript\n• Git');
        await user.click(screen.getByRole('button', { name: 'Próximo' }));

        // Step 4: submeter
        await screen.findByRole('button', { name: 'Publicar Vaga' });
        await user.click(screen.getByRole('button', { name: 'Publicar Vaga' }));

        await waitFor(() => {
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Desenvolvedor Frontend',
                    category: 'Desenvolvimento',
                    status: 'aberta',
                    is_accepting_applications: true,
                    work_model: 'remote',
                    work_regime: 'full-time',
                    contract_type: 'clt',
                    is_pcd: 'no',
                    is_active: true,
                })
            );
        });

        expect(screen.getByText(/Vaga Publicada/)).toBeInTheDocument();
    });

    it('renderiza Step 1 com campos obrigatórios', async () => {
        render(
            <MemoryRouter initialEntries={['/vagas/nova']}>
                <Routes>
                    <Route path="/vagas/nova" element={<VagaForm />} />
                </Routes>
            </MemoryRouter>
        );
        const basicInfo = await screen.findAllByText('Informações Básicas');
        expect(basicInfo.length).toBe(2);
        expect(screen.getByPlaceholderText('Ex: Desenvolvedor Frontend React Senior')).toBeInTheDocument();
        expect(screen.getByText('Próximo')).toBeInTheDocument();
    });
});

describe('Utility - vagaColor', () => {
    it('retorna cor consistente para o mesmo nome', () => {
        const VAGA_PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];
        function vagaColor(name: string): string {
            let h = 0;
            for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
            return VAGA_PALETTE[Math.abs(h) % VAGA_PALETTE.length];
        }
        expect(vagaColor('Frontend')).toBe(vagaColor('Frontend'));
        expect(VAGA_PALETTE).toContain(vagaColor('Backend'));
    });

    it('distribui cores entre nomes diferentes', () => {
        const VAGA_PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];
        function vagaColor(name: string): string {
            let h = 0;
            for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
            return VAGA_PALETTE[Math.abs(h) % VAGA_PALETTE.length];
        }
        const cores = new Set(['Frontend', 'Backend', 'DevOps', 'Design'].map(vagaColor));
        expect(cores.size).toBeGreaterThan(1);
    });
});

describe('Utility - extractVagaName', () => {
    function extractVagaName(field: unknown): string | undefined {
        if (Array.isArray(field)) return (field[0] as { title?: string; name?: string } | undefined)?.title ?? (field[0] as { title?: string; name?: string } | undefined)?.name;
        if (field && typeof field === 'object') return (field as { title?: string; name?: string }).title ?? (field as { title?: string; name?: string }).name;
        return undefined;
    }

    it('extrai title de array', () => {
        expect(extractVagaName([{ title: 'Dev Frontend' }])).toBe('Dev Frontend');
    });

    it('extrai name de array se title não existe', () => {
        expect(extractVagaName([{ name: 'Analista' }])).toBe('Analista');
    });

    it('extrai de objeto direto', () => {
        expect(extractVagaName({ title: 'Dev' })).toBe('Dev');
    });

    it('retorna undefined para null/undefined', () => {
        expect(extractVagaName(null)).toBeUndefined();
        expect(extractVagaName(undefined)).toBeUndefined();
    });
});
