import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = url && anon ? createClient(url, anon) : null
const run = supabase ? describe : describe.skip

run('submit-application (edge function)', () => {
  it('rejeita corpo vazio', async () => {
    const { error } = await supabase!.functions.invoke('submit-application', {
      body: {},
    })
    expect(error).toBeTruthy()
  })

  it('rejeita falta de campos obrigatórios', async () => {
    const { error } = await supabase!.functions.invoke('submit-application', {
      body: { candidate_email: 'a@b.com' },
    })
    expect(error).toBeTruthy()
  })

  it('rejeita email inválido', async () => {
    const { error } = await supabase!.functions.invoke('submit-application', {
      body: {
        vaga_id: 'v-1', organization_id: 'org-1',
        candidate_name: 'Test', candidate_email: 'invalido',
        resume_url: 'http://x.com/r.pdf', resume_file_name: 'r.pdf',
      },
    })
    expect(error).toBeTruthy()
  })
})
