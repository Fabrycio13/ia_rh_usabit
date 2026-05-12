-- Habilitar realtime para vagas_candidaturas
-- Sem isso, o canal de realtime em Vagas.tsx não recebe eventos de novos candidatos

ALTER PUBLICATION supabase_realtime ADD TABLE vagas_candidaturas;