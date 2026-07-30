import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export function stripHtml(v: string): string {
  if (!v) return ''
  return v.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim()
}

export function sanitizeText(v: string): string {
  if (!v) return ''
  return v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, '').trim()
}

export function validateField(label: string, value: unknown, maxLen: number): string | null {
  if (!value || (typeof value === 'string' && !value.trim())) return `${label} é obrigatório`
  if (typeof value === 'string' && value.length > maxLen) return `${label} deve ter no máximo ${maxLen} caracteres`
  return null
}

/**
 * Valida um arquivo enviado ao Storage verificando magic bytes e tamanho.
 *
 * @param supabaseAdmin - Cliente Supabase com service_role
 * @param bucket - Nome do bucket
 * @param path - Caminho do arquivo dentro do bucket
 * @param maxSizeBytes - Tamanho máximo em bytes (default 10MB)
 * @returns Objeto com { valid, error? }
 */
export async function validateUploadedFile(
  supabaseAdmin: SupabaseClient,
  bucket: string,
  path: string,
  maxSizeBytes = 10 * 1024 * 1024,
): Promise<{ valid: boolean; error?: string }> {
  try {
    // 1. Verificar metadata do arquivo (tamanho)
    const { data: fileMeta, error: metaErr } = await supabaseAdmin
      .storage
      .from(bucket)
      .info(path)

    if (metaErr || !fileMeta) {
      return { valid: false, error: 'Arquivo não encontrado no storage' }
    }

    const fileSize = fileMeta.metadata?.size ?? 0
    if (fileSize > maxSizeBytes) {
      return { valid: false, error: `Arquivo excede o limite de ${maxSizeBytes / 1024 / 1024}MB` }
    }

    if (fileSize === 0) {
      return { valid: false, error: 'Arquivo vazio' }
    }

    // 2. Baixar primeiros bytes via signed URL + Range header para verificar magic bytes
    const { data: signedUrlData, error: urlErr } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(path, 60)

    if (urlErr || !signedUrlData?.signedUrl) {
      return { valid: false, error: 'Não foi possível acessar o arquivo' }
    }

    const headResp = await fetch(signedUrlData.signedUrl, {
      method: 'GET',
      headers: { 'Range': 'bytes=0-3' },
    })

    if (!headResp.ok) {
      return { valid: false, error: 'Erro ao ler arquivo' }
    }

    const headerBytes = await headResp.text()
    if (headerBytes !== '%PDF') {
      return { valid: false, error: 'Formato de arquivo inválido. Apenas PDF é aceito.' }
    }

    return { valid: true }
  } catch (err) {
    console.error('[validateUploadedFile] Erro na validação:', err)
    return { valid: false, error: 'Erro ao validar arquivo' }
  }
}
