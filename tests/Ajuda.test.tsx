import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { Ajuda } from '../src/pages/support/Ajuda';

describe('Ajuda - Central de Ajuda', () => {
    it('renderiza título e descrição', () => {
        render(<MemoryRouter><Ajuda /></MemoryRouter>);
        expect(screen.getByText('Central de Ajuda')).toBeInTheDocument();
        expect(screen.getByText(/Encontre respostas, guias e dicas/)).toBeInTheDocument();
    });

    it('renderiza 4 dicas rápidas', () => {
        render(<MemoryRouter><Ajuda /></MemoryRouter>);
        expect(screen.getByText(/Use PDFs de texto/)).toBeInTheDocument();
        expect(screen.getByText(/Vagas detalhadas/)).toBeInTheDocument();
        expect(screen.getByText(/Combine filtros/)).toBeInTheDocument();
        expect(screen.getByText(/Monitore o Dashboard/)).toBeInTheDocument();
    });

    it('exibe aba FAQ com perguntas por padrão', () => {
        render(<MemoryRouter><Ajuda /></MemoryRouter>);
        expect(screen.getByText('Perguntas Frequentes')).toBeInTheDocument();
        expect(screen.getByText(/Como funciona a plataforma/)).toBeInTheDocument();
        expect(screen.getByText(/Como criar uma nova vaga/)).toBeInTheDocument();
    });

    it('alterna para aba Guia por Módulo', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter><Ajuda /></MemoryRouter>);
        await user.click(screen.getByText('Guia por Módulo'));
        expect(screen.getAllByText('Passo a Passo').length).toBeGreaterThan(1);
    });

    it('alterna para aba Solução de Problemas', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter><Ajuda /></MemoryRouter>);
        await user.click(screen.getByText('Solução de Problemas'));
        expect(screen.getByText(/Análise demorando muito/)).toBeInTheDocument();
        expect(screen.getByText(/Erro ao fazer upload/)).toBeInTheDocument();
    });

    it('campo de busca é renderizado e aceita digitação', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter><Ajuda /></MemoryRouter>);
        const input = screen.getByPlaceholderText(/Buscar dúvidas/);
        await user.type(input, 'Pool de Talentos');
        expect(screen.getByText(/O que é o Pool de Talentos/)).toBeInTheDocument();
    });

    it('exibe seção de contato com WhatsApp e e-mail', () => {
        render(<MemoryRouter><Ajuda /></MemoryRouter>);
        expect(screen.getByText('Falar no WhatsApp')).toBeInTheDocument();
        expect(screen.getByText('Enviar e-mail')).toBeInTheDocument();
    });

    it('exibe atalhos do teclado', () => {
        render(<MemoryRouter><Ajuda /></MemoryRouter>);
        expect(screen.getByText('Busca rápida')).toBeInTheDocument();
        expect(screen.getByText('Fechar modais')).toBeInTheDocument();
    });
});
