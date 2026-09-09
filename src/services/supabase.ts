import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Account, Category, Movement, RecurringBill } from '../types';

// Normalizar la URL provista por el usuario (quitando /rest/v1 si viene incluido)
const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const rawUrl = metaEnv.VITE_SUPABASE_URL || 'https://bxtxuxreqqnozjqtmham.supabase.co';
export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
export const SUPABASE_ANON_KEY =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_Nv4XL4Gp1RJ1diTzQUfq3A_c1xwF5WT';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Convierte cualquier identificador en un UUID v4 sintácticamente válido y determinista
 */
export function ensureUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id.toLowerCase();

  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }
  const h1 = (Math.abs(hash1) >>> 0).toString(16).padStart(8, '0');
  const h2 = (Math.abs(hash2) >>> 0).toString(16).padStart(8, '0');
  const h3 = (Math.abs(hash1 ^ hash2) >>> 0).toString(16).padStart(8, '0');
  const h4 = (Math.abs(hash1 + hash2) >>> 0).toString(16).padStart(8, '0');

  const raw = `${h1}${h2}${h3}${h4}`.slice(0, 32);
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-4${raw.slice(13, 16)}-a${raw.slice(17, 20)}-${raw.slice(20, 32)}`;
}

// =========================================================================
// OPERACIONES DE CUENTAS (accounts)
// =========================================================================
export async function fetchAccountsFromSupabase(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    initialBalance: parseFloat(row.initial_balance) || 0,
    color: row.color,
  }));
}

export async function upsertAccountToSupabase(account: Account, userId?: string) {
  const payload: Record<string, unknown> = {
    id: ensureUuid(account.id),
    name: account.name,
    type: account.type,
    initial_balance: account.initialBalance,
    color: account.color || '#64748b',
  };
  if (userId) {
    payload.user_id = userId;
  }
  const { error } = await supabase.from('accounts').upsert(payload);
  if (error) throw error;
}

export async function deleteAccountFromSupabase(id: string) {
  const uuid = ensureUuid(id);
  const { error } = await supabase.from('accounts').delete().eq('id', uuid);
  if (error) throw error;
}

// =========================================================================
// OPERACIONES DE CATEGORÍAS (categories)
// =========================================================================
export async function fetchCategoriesFromSupabase(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon || '🏷️',
    color: row.color,
    monthlyBudget: row.monthly_budget ? parseFloat(row.monthly_budget) : undefined,
    isDefault: row.is_default,
  }));
}

export async function upsertCategoryToSupabase(category: Category, userId?: string) {
  const payload: Record<string, unknown> = {
    id: ensureUuid(category.id),
    name: category.name,
    type: category.type,
    icon: category.icon || '🏷️',
    color: category.color || '#64748b',
    monthly_budget: category.monthlyBudget ?? null,
    is_default: category.isDefault ?? false,
  };
  if (userId) {
    payload.user_id = userId;
  }
  const { error } = await supabase.from('categories').upsert(payload);
  if (error) throw error;
}

export async function deleteCategoryFromSupabase(id: string) {
  const uuid = ensureUuid(id);
  const { error } = await supabase.from('categories').delete().eq('id', uuid);
  if (error) throw error;
}

// =========================================================================
// OPERACIONES DE MOVIMIENTOS (movements)
// =========================================================================
export async function fetchMovementsFromSupabase(): Promise<Movement[]> {
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => {
    let fee: number | undefined = row.fee ? parseFloat(row.fee) : undefined;
    let note = row.note || undefined;
    if (!fee && note && note.includes('[Fee: $')) {
      const match = note.match(/\[Fee: \$([0-9.]+)\]/);
      if (match) {
        fee = parseFloat(match[1]);
        note = note.replace(/\s*\[Fee: \$[0-9.]+\]/, '').trim() || undefined;
      }
    }

    return {
      id: row.id,
      type: row.type,
      amount: parseFloat(row.amount) || 0,
      category: row.category,
      date: row.date,
      note,
      fee,
      accountId: row.account_id,
      toAccountId: row.to_account_id || undefined,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
  });
}

export async function upsertMovementToSupabase(movement: Movement, userId?: string) {
  const payload: Record<string, unknown> = {
    id: ensureUuid(movement.id),
    type: movement.type,
    amount: movement.amount,
    category: movement.category,
    date: movement.date,
    note: movement.fee
      ? (movement.note ? `${movement.note} [Fee: $${movement.fee}]` : `[Fee: $${movement.fee}]`)
      : (movement.note || null),
    account_id: ensureUuid(movement.accountId),
    to_account_id: movement.toAccountId ? ensureUuid(movement.toAccountId) : null,
  };
  if (userId) {
    payload.user_id = userId;
  }
  const { error } = await supabase.from('movements').upsert(payload);
  if (error) throw error;
}

export async function deleteMovementFromSupabase(id: string) {
  const uuid = ensureUuid(id);
  const { error } = await supabase.from('movements').delete().eq('id', uuid);
  if (error) throw error;
}

// =========================================================================
// OPERACIONES DE FACTURAS RECURRENTES (recurring_bills)
// =========================================================================
export async function fetchBillsFromSupabase(): Promise<RecurringBill[]> {
  const { data, error } = await supabase
    .from('recurring_bills')
    .select('*')
    .order('due_date', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    amount: parseFloat(row.amount) || 0,
    dueDate: row.due_date,
    lastPaidDate: row.last_paid_date || undefined,
    isPaid: row.is_paid || false,
    note: row.note || undefined,
  }));
}

export async function upsertBillToSupabase(bill: RecurringBill, userId?: string) {
  const payload: Record<string, unknown> = {
    id: ensureUuid(bill.id),
    name: bill.name,
    category: bill.category,
    amount: bill.amount,
    due_date: bill.dueDate,
    last_paid_date: bill.lastPaidDate || null,
    is_paid: bill.isPaid ?? false,
    note: bill.note || null,
  };
  if (userId) {
    payload.user_id = userId;
  }
  const { error } = await supabase.from('recurring_bills').upsert(payload);
  if (error) throw error;
}

export async function deleteBillFromSupabase(id: string) {
  const uuid = ensureUuid(id);
  const { error } = await supabase.from('recurring_bills').delete().eq('id', uuid);
  if (error) throw error;
}

// =========================================================================
// SINCRONIZACIÓN COMPLETA (Push de todos los datos locales a Supabase)
// =========================================================================
export async function syncAllLocalDataToSupabase(data: {
  accounts: Account[];
  categories: Category[];
  movements: Movement[];
  bills: RecurringBill[];
  userId?: string;
}) {
  const { accounts, categories, movements, bills, userId } = data;

  // 1. Cuentas primero para satisfacer foreign keys
  for (const acc of accounts) {
    await upsertAccountToSupabase(acc, userId);
  }

  // 2. Categorías
  for (const cat of categories) {
    await upsertCategoryToSupabase(cat, userId);
  }

  // 3. Movimientos
  for (const mov of movements) {
    await upsertMovementToSupabase(mov, userId);
  }

  // 4. Facturas
  for (const bill of bills) {
    await upsertBillToSupabase(bill, userId);
  }

  return { success: true };
}
