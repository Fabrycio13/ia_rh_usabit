import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

const run = url && anon
  ? describe
  : describe.skip

run('submit-candidate (edge function)', () => {
  const supabase = createClient(url!, anon!)

  it('rejeita corpo vazio', async () => {
    const { error } = await supabase.functions.invoke('submit-candidate', {
      body: {},
    })
    expect(error).toBeTruthy()
  })

  it('rejeita falta de campos obrigatórios', async () => {
    const { error } = await supabase.functions.invoke('submit-candidate', {
      body: { email: 'a@b.com' },
    })
    expect(error).toBeTruthy()
  })

  it('rejeita email inválido', async () => {
    const { error } = await supabase.functions.invoke('submit-candidate', {
      body: { email: 'invalido', organization_id: 'org-1', name: 'Test' },
    })
    expect(error).toBeTruthy()
  })

  it('rejeita nome muito longo', async () => {
    const { error } = await supabase.functions.invoke('submit-candidate', {
      body: { email: 'a@b.com', organization_id: 'org-1', name: 'x'.repeat(1001) },
    })
    expect(error).toBeTruthy()
  })
})
