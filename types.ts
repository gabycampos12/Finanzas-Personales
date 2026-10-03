export type MovementType = 'expense' | 'income' | 'transfer';

export interface Movement {
  id: string;
  type: MovementType;
  amount: number; // In USD (positive number)
  category: string; // Category name or ID
  date: string; // YYYY-MM-DD
  note?: string;
  accountId: string; // Source account (or account for expense/income)
  toAccountId?: string; // Target account for transfers
  fee?: number; // Optional transfer fee / comisión deducida de la cuenta de origen
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  type?: 'expense' | 'income'; // Defaults to 'expense'
  icon?: string; // Emoji character e.g. "🛒", "🍔", etc.
  color: string; // Palette color hex
  monthlyBudget?: number; // Optional budget in USD (or monthly income target)
  isDefault?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'wallet' | 'cash';
  initialBalance: number;
  color: string;
}

export interface MonthSummaryData {
  income: number;
  expenses: number;
  remaining: number;
}

export interface CategoryExpenseShare {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  isOthersGroup?: boolean;
}

export interface MonthlyBarData {
  monthKey: string; // YYYY-MM
  label: string; // "Sep 2026"
  income: number;
  expenses: number;
}

export interface RecurringBill {
  id: string;
  name: string; // Nombre del servicio o factura
  category: string; // Nombre de la categoría
  amount: number; // Monto en USD
  dueDate: string; // YYYY-MM-DD (próximo pago / fecha límite)
  lastPaidDate?: string; // YYYY-MM-DD (fecha del último pago)
  isPaid?: boolean; // Marcado como pagado en este ciclo
  note?: string;
}

export interface SavingsGoal {
  id: string;
  name: string; // Nombre de la meta (ej: "Fondo de emergencia", "Viaje a Japón")
  targetAmount: number; // Monto objetivo en USD
  currentAmount: number; // Monto ahorrado actual en USD
  targetDate?: string; // YYYY-MM-DD (fecha estimada o límite)
  icon?: string; // Emoji representativo
  color?: string; // Color distintivo hex
  accountId?: string; // Cuenta donde se custodia el ahorro (opcional)
  note?: string; // Nota o motivación
  createdAt: number;
}


