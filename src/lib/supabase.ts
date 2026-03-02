import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfsqdfetzcwvmfphljzs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmc3FkZmV0emN3dm1mcGhsanpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODUxODYsImV4cCI6MjA2Mzg2MTE4Nn0.qChPcuPmJCfkF7-xrqGP6fOHLIqz7QqzPJRzSHT7Pq8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
