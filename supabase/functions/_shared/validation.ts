import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { hasPdfMagicBytes } from './public-contracts.ts'

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
    // 1. Verificar existência do arquivo (metadata pode não ter size para uploads recentes)
    const { data: fileMeta, error: metaErr } = await supabaseAdmin
      .storage
      .from(bucket)
      .info(path)

    if (metaErr || !fileMeta) {
      return { valid: false, error: 'Arquivo não encontrado no storage' }
    }

    // 2. Baixar primeiros bytes via signed URL + Range header
    //    Isso valida simultaneamente: existência, tamanho (via Content-Range) e magic bytes
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
      if (headResp.status === 416) {
        return { valid: false, error: 'Arquivo vazio' }
      }
      return { valid: false, error: 'Erro ao ler arquivo' }
    }

    // Validar tamanho via Content-Range (ex: "bytes 0-3/12345")
    const contentRange = headResp.headers.get('Content-Range') || headResp.headers.get('content-range')
    if (contentRange) {
      const totalMatch = contentRange.match(/bytes\s+\d+-\d+\/(\d+)/i)
      if (totalMatch) {
        const totalSize = parseInt(totalMatch[1], 10)
        if (totalSize === 0) {
          return { valid: false, error: 'Arquivo vazio' }
        }
        if (totalSize > maxSizeBytes) {
          return { valid: false, error: `Arquivo excede o limite de ${maxSizeBytes / 1024 / 1024}MB` }
        }
      }
    }

    const reader = headResp.body?.getReader()
    if (!reader) {
      return { valid: false, error: 'Erro ao ler arquivo' }
    }

    const { value: headerBytes } = await reader.read()
    await reader.cancel()

    if (!headerBytes || !hasPdfMagicBytes(headerBytes)) {
      return { valid: false, error: 'Formato de arquivo inválido. Apenas PDF é aceito.' }
    }

    return { valid: true }
  } catch (err) {
    console.error('[validateUploadedFile] Erro na validação:', err)
    return { valid: false, error: 'Erro ao validar arquivo' }
  }
}
