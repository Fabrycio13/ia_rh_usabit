import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('ChatWidget - sanitizacao de input', () => {

    it('ChatWidget importa e usa sanitizeAIInput no input do usuario', () => {
        const chatWidget = readFileSync('src/layouts/ChatWidget.tsx', 'utf-8');
        const sanitizerImported = chatWidget.includes('sanitizeAIInput');
        const sanitizerCalled = chatWidget.includes('sanitizeAIInput(currentInput)');
        expect(sanitizerImported).toBe(true);
        expect(sanitizerCalled).toBe(true);
    });
});
