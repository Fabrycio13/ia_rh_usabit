// Shared validation helpers for Edge Functions

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
