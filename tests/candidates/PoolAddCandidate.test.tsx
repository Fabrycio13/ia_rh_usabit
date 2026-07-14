import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PoolAddCandidate } from '../../src/features/candidates/components/PoolAddCandidate';

vi.mock('../../src/core/contexts/UserContext', () => ({
    useUser: () => ({
        profile: {
            userId: 'user-1',
            organization_id: 'org-1',
            user_role: 'owner',
            loaded: true,
        },
    }),
}));

const mockUpload = vi.fn().mockResolvedValue({ error: null });

const mockPromise = (data: unknown) => Promise.resolve({ data, error: null });

vi.mock('../../src/core/services/supabase', () => ({
    supabase: {
        storage: {
            from: vi.fn(() => ({
                upload: mockUpload,
            })),
        },
        from: vi.fn(() => {
            const selectResult = { eq: vi.fn(() => mockPromise([])), neq: vi.fn(() => mockPromise([])) };
            selectResult.then = vi.fn();
            return {
                insert: vi.fn(() => ({ error: null })),
                upsert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => mockPromise(null)) })) })),
                update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null, then: undefined })) })),
                select: vi.fn(() => selectResult),
            };
        }),
    },
}));

vi.mock('react-hot-toast', () => ({
    default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../src/core/services/pdfExtractor', () => ({
    extractTextFromPDF: vi.fn(() => Promise.resolve('Currículo texto fictício')),
    pdfToImages: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../src/core/services/cvAnalyzer', () => ({
    extractTextAndData: vi.fn(() => Promise.resolve({
        rawText: 'Currículo texto fictício',
        extractedData: {
            name: 'Maria Silva',
            email: 'maria@teste.com',
            phone: '+55 (11) 99999-8888',
            location: 'São Paulo, SP',
            age: '28',
            gender: 'Feminino',
            linkedin: '',
            portfolio: '',
            skills: ['JavaScript', 'React', 'Node.js'],
            experience: '5 anos como desenvolvedora',
            education: 'Ciência da Computação',
        },
    })),
}));

describe('PoolAddCandidate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza modal quando isOpen=true', () => {
        render(<PoolAddCandidate isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
        expect(screen.getByText(/Importar Currículos/)).toBeInTheDocument();
    });

    it('nao renderiza quando isOpen=false', () => {
        const { container } = render(<PoolAddCandidate isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />);
        expect(container.innerHTML).toBe('');
    });

    it('exibe area de upload com instrucoes', async () => {
        render(<PoolAddCandidate isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
        await screen.findByText(/Importar Currículos/);
        expect(screen.getByText(/Arraste PDFs/)).toBeInTheDocument();
    });
});
