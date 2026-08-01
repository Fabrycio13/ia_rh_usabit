import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({
    getSession: vi.fn(),
}));

vi.mock('../../src/core/services/supabase', () => ({
    supabase: {
        auth: { getSession },
        storage: { from: vi.fn() },
    },
}));

import { uploadViaSignedUrl } from '../../src/core/utils/storage';

describe('uploadViaSignedUrl', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
        vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('usa o access token da sessão em upload interno', async () => {
        getSession.mockResolvedValue({
            data: { session: { access_token: 'user-jwt' } },
            error: null,
        });
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                signedUrl: 'https://storage.example/upload',
                path: 'resumes/org-1/file.pdf',
            }), { status: 200 }))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const file = new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' });
        await uploadViaSignedUrl('job-applications', {}, file);

        expect(fetchMock).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer user-jwt' }),
        }));
    });

    it('usa a anon key quando não existe sessão no portal público', async () => {
        getSession.mockResolvedValue({ data: { session: null }, error: null });
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                signedUrl: 'https://storage.example/upload',
                path: 'resumes/job-1/file.pdf',
            }), { status: 200 }))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const file = new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' });
        await uploadViaSignedUrl('job-applications', { jobId: 'job-1' }, file);

        expect(fetchMock).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer anon-key' }),
        }));
    });
});
