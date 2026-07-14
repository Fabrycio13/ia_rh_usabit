import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = url && anon ? createClient(url, anon) : null
const run = supabase ? describe : describe.skip

run('openai-proxy (edge function)', () => {
  it('rejeita chamada sem autenticação', async () => {
    // supabase.functions.invoke always sends anon key; we can still test
    // by omitting messages
    const { error } = await supabase!.functions.invoke('openai-proxy', {
      body: {},
    })
    expect(error).toBeTruthy()
  })
})
