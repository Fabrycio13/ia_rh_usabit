import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

/**
 * Opens a candidate resume in a new tab using a signed URL.
 * Opens the blank tab first (in user-gesture context) to avoid popup blockers,
 * then navigates to the signed URL after the async operation completes.
 * @param url The full legacy URL or just the file path within the job-applications bucket
 */
export const handleViewResume = async (url: string | null | undefined): Promise<void> => {
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
        let bucket = 'resumes'; // Default for analyzed candidates

        // Detect bucket and path from full Supabase URLs
        if (url.includes('/storage/v1/object/public/')) {
            const afterPublic = url.split('/storage/v1/object/public/')[1];
            const parts = afterPublic.split('/');
            bucket = parts[0];
            path = parts.slice(1).join('/');
        } else if (url.includes('/storage/v1/object/')) {
            const afterObject = url.split('/storage/v1/object/')[1];
            const parts = afterObject.split('/');
            bucket = parts[0];
            path = parts.slice(1).join('/');
        } else if (url.includes('/job-applications/')) {
            bucket = 'job-applications';
            path = url.split('/job-applications/')[1];
        } else if (url.includes('/resumes/')) {
            bucket = 'resumes';
            path = url.split('/resumes/')[1];
        } else if (url.startsWith('resumes/')) {
            bucket = 'resumes';
            path = url.replace('resumes/', '');
        } else if (url.startsWith('job-applications/')) {
            bucket = 'job-applications';
            path = url.replace('job-applications/', '');
        }
        


        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600); // 1 hour validity

        if (error) throw error;

        if (data?.signedUrl) {
            newTab.location.href = data.signedUrl;
        } else {
            newTab.close();
            throw new Error('Não foi possível gerar o link de visualização.');
        }
    } catch (err: unknown) {
        newTab.close();
        console.error('Erro ao gerar URL assinada:', err);
        toast.error('Erro ao abrir currículo. Verifique suas permissões.');
    }
};

/**
 * Upload seguro via presigned URL (chamada Edge Function + PUT direto ao Storage).
 * Substitui upload client-side com anon key (vulnerável a JWT inválido em buckets privados).
 * @returns path completo no formato "bucket/caminho" (ex: "job-applications/resumes/123/timestamp.pdf")
 */
export async function uploadViaSignedUrl(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  // 1. Obter signed upload URL da Edge Function
  const res = await fetch(`${supabaseUrl}/functions/v1/get-upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
    },
    body: JSON.stringify({ bucket, path }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Falha ao obter URL de upload (${res.status}): ${errBody}`);
  }

  const { signedUrl, path: resultPath } = await res.json() as { signedUrl: string; path: string };

  // 2. Upload direto ao Storage (PUT binário, sem JWT)
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/pdf' },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Falha no upload do arquivo (${uploadRes.status})`);
  }

  return `${bucket}/${resultPath}`;
}

export async function downloadResume(url: string, fileName: string): Promise<File> {
    let path = url;
    let bucket = 'job-applications';
    if (url.includes('/storage/v1/object/public/')) {
        const afterPublic = url.split('/storage/v1/object/public/')[1];
        const parts = afterPublic.split('/');
        bucket = parts[0];
        path = parts.slice(1).join('/');
    } else if (url.includes('/storage/v1/object/')) {
        const afterObject = url.split('/storage/v1/object/')[1];
        const parts = afterObject.split('/');
        bucket = parts[0];
        path = parts.slice(1).join('/');
    } else if (url.startsWith('job-applications/')) {
        path = url.replace('job-applications/', '');
    }
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (!data?.signedUrl) throw new Error('Falha ao gerar link de download');
    const response = await fetch(data.signedUrl);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
}
