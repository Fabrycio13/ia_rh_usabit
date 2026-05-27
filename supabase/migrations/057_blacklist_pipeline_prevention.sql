-- Trigger to remove blacklisted candidates from all pipelines
CREATE OR REPLACE FUNCTION handle_candidate_blacklist_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_blacklisted IS TRUE AND (OLD.is_blacklisted IS FALSE OR OLD.is_blacklisted IS NULL) THEN
        DELETE FROM pipeline_cards WHERE candidate_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_candidate_blacklist_change ON candidates;
CREATE TRIGGER tr_candidate_blacklist_change
AFTER UPDATE OF is_blacklisted ON candidates
FOR EACH ROW
EXECUTE FUNCTION handle_candidate_blacklist_change();

-- Trigger to prevent linking blacklisted candidates to any pipeline
CREATE OR REPLACE FUNCTION prevent_blacklisted_pipeline_link()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM candidates 
        WHERE id = NEW.candidate_id AND is_blacklisted = TRUE
    ) THEN
        RAISE EXCEPTION 'Candidato está na blacklist e não pode ser vinculado a nenhum pipeline';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_blacklisted_pipeline_link ON pipeline_cards;
CREATE TRIGGER tr_prevent_blacklisted_pipeline_link
BEFORE INSERT OR UPDATE OF candidate_id ON pipeline_cards
FOR EACH ROW
EXECUTE FUNCTION prevent_blacklisted_pipeline_link();
