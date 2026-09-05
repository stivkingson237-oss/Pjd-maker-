import { supabase } from '../lib/supabase';

/**
 * Central PJD Maker AI client.
 * All provider credentials stay server-side in Supabase Edge Functions.
 * Supported tasks: product, marketing, commercial, seller, customer, general.
 */
export async function pjdAI(task, input, options = {}) {
  const { model } = options;
  const { data, error } = await supabase.functions.invoke('pjd-ai-hub', {
    body: { task, input, ...(model ? { model } : {}) }
  });

  if (error) throw new Error(error.message || 'Impossible de contacter le Centre IA.');
  if (data?.error) throw new Error(data.error);
  return data?.result ?? data;
}

export const pjdAIProduct = (input, options) => pjdAI('product', input, options);
export const pjdAIMarketing = (input, options) => pjdAI('marketing', input, options);
export const pjdAICommercial = (input, options) => pjdAI('commercial', input, options);
export const pjdAISeller = (input, options) => pjdAI('seller', input, options);
export const pjdAICustomer = (input, options) => pjdAI('customer', input, options);
export const pjdAIGeneral = (input, options) => pjdAI('general', input, options);
