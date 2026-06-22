import { supabase } from './supabase';

export async function logActivity(userId: string, action: string, details?: string | object, errorMessage?: string, organizationId?: string) {
    try {
        const { error } = await supabase.from('activity_logs').insert({
            user_id: userId,
            action,
            details: details || {},
            error: errorMessage || null,
            organization_id: organizationId || null
        });
        
        if (error) {
            console.error('Supabase logging error:', error);
        }
    } catch (err) {
        console.error('Error logging activity:', err);
    }
}

export async function logScreening(userId: string, candidateId: string, action: string, fromStage?: string | null, toStage?: string | null, details?: object) {
    if (!userId || !candidateId) {
        console.error('logScreening: userId or candidateId missing', { userId, candidateId });
        return;
    }
    try {
        const { error } = await supabase.from('candidate_screening_logs').insert({
            user_id: userId,
            candidate_id: candidateId,
            action,
            from_stage: fromStage || null,
            to_stage: toStage || null,
            details: details || {}
        });
        
        if (error) {
            console.error('Screening log error (Supabase):', error.message, error.details);
        }
    } catch (err) {
        console.error('Error logging screening (Exception):', err);
    }
}
