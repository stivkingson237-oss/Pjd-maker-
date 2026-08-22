import { supabase } from './supabaseClient'

export async function settleMarketplacePayment(orderId, transactionId = null) {
  if (!orderId) throw new Error('Commande introuvable')
  const { error } = await supabase.rpc('settle_marketplace_payment', {
    p_order_id: orderId,
    p_tx_id: transactionId,
  })
  if (error) throw error
  return true
}

export async function getSellerWallet(userId) {
  const { data, error } = await supabase
    .from('seller_wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function requestSellerWithdrawal({ userId, amount, method, accountReference }) {
  if (!userId || !amount || amount <= 0 || !method || !accountReference) {
    throw new Error('Informations de retrait incomplètes')
  }
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .insert({ user_id: userId, amount, method, account_reference: accountReference })
    .select()
    .single()
  if (error) throw error
  return data
}
