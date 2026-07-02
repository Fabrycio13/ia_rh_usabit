import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.setConfig({ testTimeout: 20000 });
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SpontaneousApplication } from '../src/pages/vagas/SpontaneousApplication';

vi.stubGlobal('import.meta', {
    env: {
        VITE_SUPABASE_URL: 'https://test.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-key',
        BASE_URL: '/',
    }
});

const { mockInvoke } = vi.hoisted(() => ({
    mockInvoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
}));

vi.mock('../src/core/services/supabase', () => ({
    supabase: {
        functions: { invoke: mockInvoke },
        from: vi.fn(() => ({
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ error: null }))
                }))
            }))
        })),
    }
}));

vi.mock('../src/core/utils/security', () => ({
    sanitizeHtml: vi.fn((s: string) => s)
}));

vi.mock('../src/core/services/analyzers/resumeAnalyzer', () => ({
    analyzeResume: vi.fn(() => Promise.resolve({
        score: 85,
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: '5 anos',
        education: 'Ciência da Computação',
        summary: 'Desenvolvedor experiente',
        strengths: ['Base técnica sólida'],
        gaps: ['Sem experiência em gestão']
    }))
}));

describe('SpontaneousApplication', () => {
    const mockFetch = vi.fn((url: string) => {
        if (url.toString().includes('public-jobs')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ orgInfo: { name: 'Empresa Teste' } })
            });
        }
        if (url.toString().includes('viacep')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    logradouro: 'Rua Exemplo',
                    localidade: 'São Paulo',
                    uf: 'SP'
                })
            });
        }
        if (url.toString().includes('submit-candidate')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ id: 'candidate-123' })
            });
        }
        if (url.toString().includes('get-upload-url')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ signedUrl: 'https://signed.url/upload', path: 'resumes/spontaneous/org-id-123/999_secure.pdf' })
            });
        }
        if (url.toString().includes('signed.url')) {
            return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.fetch = mockFetch;
    });

    const renderComponent = () => {
        window.scrollTo = vi.fn();
        Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
        return render(
            <MemoryRouter initialEntries={['/carreiras/org-id-123/candidatar']}>
                <Routes>
                    <Route path="/carreiras/:orgId/candidatar" element={<SpontaneousApplication />} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('carrega dados da org e exibe header', async () => {
        renderComponent();
        expect(await screen.findByText('Trabalhe Conosco', {}, { timeout: 3000 })).toBeInTheDocument();
        expect(screen.getByText('Empresa Teste')).toBeInTheDocument();
    });

    it('preenche formulario completo de 3 etapas e envia', async () => {
        const user = userEvent.setup();
        const { container } = renderComponent();

        // Wait for org header + step 0 animation
        await screen.findByText('Trabalhe Conosco', {}, { timeout: 3000 });

        // Step 0: fill name
        const nameInput = await screen.findByPlaceholderText('Seu nome completo', {}, { timeout: 3000 });
        await user.type(nameInput, 'João Silva');

        // Click "Continuar"
        await user.click(screen.getByRole('button', { name: /Continuar/ }));

        // Step 1: fill personal data
        const emailInput = await screen.findByPlaceholderText('seu@email.com *', {}, { timeout: 3000 });
        await user.type(emailInput, 'joao@teste.com');

        const phoneInput = screen.getByPlaceholderText('+55 (00) 00000-0000');
        await user.type(phoneInput, '11999999999');
        // phone will be masked: '+55 (11) 99999-9999'

        const cepInput = screen.getByPlaceholderText('CEP *');
        await user.type(cepInput, '01310000');
        // CEP masked: '01310-000', triggers ViaCEP fetch

        // Wait for ViaCEP to fill address and location
        await waitFor(() => {
            expect(screen.getByDisplayValue('Rua Exemplo')).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByDisplayValue('São Paulo - SP')).toBeInTheDocument();

        const numberInput = screen.getByPlaceholderText('Número *');
        await user.type(numberInput, '123');

        // Click "Continuar"
        await user.click(screen.getByRole('button', { name: /Continuar/ }));

        // Step 2: wait for animation then upload file + accept terms + submit
        await screen.findByText(/currículo em PDF/, {}, { timeout: 3000 });
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        expect(fileInput).not.toBeNull();
        const file = new File(['fake pdf content'], 'curriculo.pdf', { type: 'application/pdf' });
        await user.upload(fileInput, file);

        // Wait for file name to appear in dropzone
        await screen.findByText('curriculo.pdf', {}, { timeout: 3000 });

        // Accept LGPD terms
        const lgpdCheckbox = screen.getByRole('checkbox');
        await user.click(lgpdCheckbox);

        // Click "Enviar currículo!"
        await user.click(screen.getByRole('button', { name: /Enviar currículo/ }));

        // Wait for success screen
        expect(await screen.findByText('Currículo cadastrado!', {}, { timeout: 5000 })).toBeInTheDocument();

        // Verify get-upload-url Edge Function was called (presigned upload)
        const uploadUrlCall = mockFetch.mock.calls.find(
            (call: unknown[]) => (call[0] as string).includes('get-upload-url')
        );
        expect(uploadUrlCall).toBeTruthy();

        // Verify submit-candidate edge function was called
        // (globalThis.fetch was called with submit-candidate URL)
        const submitCall = mockFetch.mock.calls.find(
            (call: unknown[]) => (call[0] as string).includes('submit-candidate')
        );
        expect(submitCall).toBeTruthy();

        // Verify send-spontaneous-email was invoked
        expect(mockInvoke).toHaveBeenCalledWith('send-spontaneous-email', {
            body: { candidateId: 'candidate-123' }
        });
    });

    it('exibe mensagem de boas-vindas com nome do candidato', async () => {
        const user = userEvent.setup();
        renderComponent();
        await screen.findByText('Trabalhe Conosco', {}, { timeout: 3000 });

        const nameInput = await screen.findByPlaceholderText('Seu nome completo', {}, { timeout: 3000 });
        await user.type(nameInput, 'Maria');

        await user.click(screen.getByRole('button', { name: /Continuar/ }));

        // The bubble should greet "Maria"
        expect(await screen.findByText(/Maria/, {}, { timeout: 3000 })).toBeInTheDocument();
    });
});
