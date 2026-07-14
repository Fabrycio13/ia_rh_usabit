import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PipelineLinkSection } from '../src/features/candidates/components/PipelineLinkSection';

const { mockFrom } = vi.hoisted(() => {
    const mockFromImpl = vi.fn();
    return { mockFrom: mockFromImpl };
});

vi.mock('../src/core/contexts/UserContext', () => ({
    useUser: () => ({
        profile: {
            userId: 'user-1',
            userName: 'Admin',
            organization_id: 'org-1',
            user_role: 'owner',
            loaded: true,
            email: 'admin@test.com',
        },
    }),
}));

vi.mock('../src/core/services/supabase', () => ({
    supabase: { from: mockFrom },
}));

vi.mock('react-hot-toast', () => ({
    default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../src/core/services/logger', () => ({
    logScreening: vi.fn(() => Promise.resolve()),
}));

function makeSupabaseMocks(pipes: Array<{ id: string; name: string }>, cards: Array<{ id: string; pipeline_id: string }>) {
    mockFrom.mockImplementation((table: string) => {
        if (table === 'pipelines') {
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn(() => Promise.resolve({ data: pipes, error: null })),
                    })),
                })),
                update: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
            };
        }
        if (table === 'pipeline_cards') {
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: cards, error: null })),
                })),
                insert: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(() => Promise.resolve({ data: { id: 'new-card-1' }, error: null })),
                    })),
                })),
                delete: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
            };
        }
        if (table === 'pipeline_columns') {
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn(() => ({
                            limit: vi.fn(() => ({
                                maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'col-1', name: 'Triagem' }, error: null })),
                            })),
                        })),
                    })),
                })),
            };
        }
        return { select: vi.fn(), insert: vi.fn(), delete: vi.fn(), update: vi.fn() };
    });
}

describe('PipelineLinkSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        makeSupabaseMocks(
            [{ id: 'pipe-1', name: 'Desenvolvimento' }, { id: 'pipe-2', name: 'Design' }],
            []
        );
    });

    it('renderiza heading e dropdown', async () => {
        render(<PipelineLinkSection candidateId="cand-1" candidateName="João" />);

        expect(screen.getByText('Vinculado a Pipelines')).toBeInTheDocument();
        expect(screen.getByText('Vincular a outro pipeline...')).toBeInTheDocument();
    });

    it('exibe pipelines ja vinculados e permite remover', async () => {
        makeSupabaseMocks(
            [{ id: 'pipe-1', name: 'Desenvolvimento' }],
            [{ id: 'card-1', pipeline_id: 'pipe-1' }]
        );

        const onCardRemoved = vi.fn();
        render(<PipelineLinkSection candidateId="cand-1" candidateName="João" onCardRemoved={onCardRemoved} />);

        await screen.findByText('Desenvolvimento');

        const removeBtn = screen.getByRole('button', { name: /Remover/ });
        await userEvent.setup().click(removeBtn);

        await waitFor(() => {
            expect(screen.queryByText('Desenvolvimento')).not.toBeInTheDocument();
        });
    });

    it('abre dropdown e mostra pipelines disponiveis', async () => {
        const user = userEvent.setup();
        render(<PipelineLinkSection candidateId="cand-1" candidateName="João" />);

        const trigger = screen.getByText('Vincular a outro pipeline...');
        await user.click(trigger);

        expect(screen.getByText('Desenvolvimento')).toBeInTheDocument();
        expect(screen.getByText('Design')).toBeInTheDocument();
    });

    it('mostra blacklist message quando isBlacklisted', async () => {
        render(<PipelineLinkSection candidateId="cand-1" candidateName="João" isBlacklisted />);

        expect(screen.getByText(/lista de restrição/)).toBeInTheDocument();
        expect(screen.queryByText('Vincular a outro pipeline...')).not.toBeInTheDocument();
    });
});
