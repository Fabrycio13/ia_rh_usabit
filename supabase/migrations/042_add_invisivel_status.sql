-- Adicionar status 'invisivel' à constraint de status de vagas
ALTER TABLE vagas_white_label DROP CONSTRAINT IF EXISTS check_vaga_status;
ALTER TABLE vagas_white_label ADD CONSTRAINT check_vaga_status 
CHECK (status IN ('aberta', 'fechada', 'pausada', 'cancelada', 'invisivel'));
