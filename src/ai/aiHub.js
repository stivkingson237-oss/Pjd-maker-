import { supabase } from '../lib/supabase';

/** Central PJD Maker AI client. Provider credentials stay server-side. */
export async function pjdAI(task, input, options = {}) {
  const { model } = options;
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`Session: ${sessionError.message}`);
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Votre session PJD Market a expiré. Reconnectez-vous puis réessayez.');
  const { data, error } = await supabase.functions.invoke('pjd-ai-hub', {
    body: { task, input, ...(model ? { model } : {}) },
    headers: { Authorization: `Bearer ${token}` }
  });
  if (error) {
    let detail = '';
    try {
      if (error.context instanceof Response) {
        const text = await error.context.text();
        try { const parsed = JSON.parse(text); detail = parsed?.error || parsed?.message || text; }
        catch { detail = text; }
      }
    } catch {}
    throw new Error(detail || error.message || 'Impossible de contacter le Centre IA.');
  }
  if (data?.error) throw new Error(data.error);
  return data?.result ?? data;
}

export const aiHub = pjdAI;
export const pjdAIProduct=(input,options)=>pjdAI('product',input,options);
export const pjdAIMarketing=(input,options)=>pjdAI('marketing',input,options);
export const pjdAICommercial=(input,options)=>pjdAI('commercial',input,options);
export const pjdAISeller=(input,options)=>pjdAI('seller',input,options);
export const pjdAICustomer=(input,options)=>pjdAI('customer',input,options);
export const pjdAIGeneral=(input,options)=>pjdAI('general',input,options);
