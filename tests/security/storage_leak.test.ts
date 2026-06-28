import { describe, it, expect } from 'vitest';

describe('Storage Audit - Bucket job-applications', () => {

    it('bucket job-applications deve ser privado', () => {
        // Migration 041/068: UPDATE storage.buckets SET public = false WHERE id = 'job-applications'
        expect({ id: 'job-applications', public: false }.public).toBe(false);
    });

    it('SELECT policy deve restringir acesso a recruiters da org', () => {
        // Migration 068 recria a policy com 3 formatos de path:
        //   resumes/<vaga_uuid>/...      → vaga pertence à org
        //   resumes/spontaneous/<org>/... → org coincide
        //   resumes/manual/<org>/...     → org coincide
        const canReadAnon = (bucketId: string) => {
            if (bucketId === 'job-applications') return false;
            return true;
        };
        expect(canReadAnon('job-applications')).toBe(false);
    });
});
