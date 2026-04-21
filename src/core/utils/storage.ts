import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

/**
 * Opens a candidate resume in a new tab using a signed URL.
 * Opens the blank tab first (in user-gesture context) to avoid popup blockers,
 * then navigates to the signed URL after the async operation completes.
 * @param url The full legacy URL or just the file path within the job-applications bucket
 */
export const handleViewResume = async (url: string | null): Promise<void> => {
    if (!url) {
        toast.error('Currículo não disponível para este candidato.');
        return;
    }

    // CRITICAL: Open the blank tab BEFORE any await, while still in user gesture context.
    // If we open after an await, browsers will block it as an unauthorized popup.
    const newTab = window.open('', '_blank');
    if (!newTab) {
        toast.error('Permita popups neste site para abrir o currículo.');
        return;
    }

    try {
        let path = url;

        // If it's a full URL, extract the path segment after the bucket name
        if (url.includes('/job-applications/')) {
            path = url.split('/job-applications/')[1];
        }

        const { data, error } = await supabase.storage
            .from('job-applications')
            .createSignedUrl(path, 3600); // 1 hour validity

        if (error) throw error;

        if (data?.signedUrl) {
            newTab.location.href = data.signedUrl;
        } else {
            newTab.close();
            throw new Error('Não foi possível gerar o link de visualização.');
        }
    } catch (err: any) {
        newTab.close();
        console.error('Erro ao gerar URL assinada:', err);
        toast.error('Erro ao abrir currículo. Verifique suas permissões.');
    }
};
