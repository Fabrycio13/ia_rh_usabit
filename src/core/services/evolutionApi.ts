import { supabase } from './supabase';

export interface EvolutionMessage {
  from: 'me' | 'them';
  text: string;
  time: string;
  timestamp: number;
}

export class EvolutionApiService {
  private apiUrl: string;
  private apiKey: string;
  private instance: string;

  constructor(apiUrl: string, apiKey: string, instance: string) {
    this.apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    this.apiKey = apiKey;
    this.instance = instance;
  }

  private async request(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.apiKey
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Envia uma mensagem via WhatsApp
   */
  async sendMessage(number: string, text: string) {
    // Limpar o número para formato internacional sem caracteres especiais
    const cleanNumber = number.replace(/\D/g, '');
    
    const payload = {
      number: cleanNumber,
      options: {
        delay: 1200,
        presence: 'composing',
        linkPreview: false
      },
      textMessage: {
        text: text
      }
    };

    return this.request(`/message/sendText/${this.instance}`, 'POST', payload);
  }

  /**
   * Busca o histórico de mensagens do Supabase
   */
  async getLocalHistory(candidateId: string, userId: string): Promise<EvolutionMessage[]> {
    const { data, error } = await supabase
      .from('candidate_conversations')
      .select('messages')
      .eq('candidate_id', candidateId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[EvolutionApi] Erro ao buscar histórico local:', error);
      return [];
    }

    return data?.messages || [];
  }

  /**
   * Salva o histórico de mensagens no Supabase
   */
  async saveLocalHistory(candidateId: string, userId: string, messages: EvolutionMessage[]) {
    const { error } = await supabase
      .from('candidate_conversations')
      .upsert({
        candidate_id: candidateId,
        user_id: userId,
        messages: messages,
        updated_at: new Date().toISOString()
      }, { onConflict: 'candidate_id, user_id' });

    if (error) {
      console.error('[EvolutionApi] Erro ao salvar histórico local:', error);
      throw error;
    }
  }
}
