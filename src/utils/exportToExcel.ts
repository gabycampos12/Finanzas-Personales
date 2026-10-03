import { Account, Category, Movement, RecurringBill, SavingsGoal } from '../types';

/**
 * Escapes fields for CSV according to RFC 4180
 */
function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Triggers browser download of a CSV file with UTF-8 BOM for Microsoft Excel compatibility
 */
function downloadCsv(content: string, filename: string) {
  // UTF-8 BOM is required so Excel opens special characters (tildes, emojis) correctly
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports all application data (Movements, Accounts, Budgets, Bills, Savings Goals) into an Excel-ready CSV backup
 */
export function exportAllDataToExcelCsv(params: {
  movements: Movement[];
  accounts: Account[];
  categories: Category[];
  bills: RecurringBill[];
  savingsGoals?: SavingsGoal[];
}) {
  const { movements, accounts, categories, bills, savingsGoals = [] } = params;
  const today = new Date().toISOString().split('T')[0];

  const lines: string[] = [];

  // ==========================================
  // 1. MOVIMIENTOS
  // ==========================================
  lines.push('=== HISTORIAL DE MOVIMIENTOS (TRANSACCIONES) ===');
  lines.push([
    'ID',
    'Fecha',
    'Tipo',
    'Categoría',
    'Monto (USD)',
    'Comisión / Fee (USD)',
    'Cuenta Origen',
    'Cuenta Destino',
    'Nota / Descripción'
  ].map(escapeCsv).join(','));

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  // Ordenar movimientos por fecha descendente
  const sortedMovements = [...movements].sort((a, b) => b.date.localeCompare(a.date));

  for (const m of sortedMovements) {
    const fromName = accountMap.get(m.accountId) || m.accountId;
    const toName = m.toAccountId ? (accountMap.get(m.toAccountId) || m.toAccountId) : '';
    const typeLabel = m.type === 'expense' ? 'Gasto' : m.type === 'income' ? 'Ingreso' : 'Transferencia';
    lines.push([
      m.id,
      m.date,
      typeLabel,
      m.category,
      m.amount.toFixed(2),
      m.fee ? m.fee.toFixed(2) : '0.00',
      fromName,
      toName,
      m.note || ''
    ].map(escapeCsv).join(','));
  }

  lines.push('');
  lines.push('');

  // ==========================================
  // 2. CUENTAS Y SALDOS
  // ==========================================
  lines.push('=== CUENTAS Y SALDOS ===');
  lines.push([
    'ID Cuenta',
    'Nombre',
    'Tipo',
    'Saldo Inicial (USD)',
    'Color'
  ].map(escapeCsv).join(','));

  for (const a of accounts) {
    lines.push([
      a.id,
      a.name,
      a.type === 'bank' ? 'Banco' : a.type === 'wallet' ? 'Billetera Virtual' : 'Efectivo',
      a.initialBalance.toFixed(2),
      a.color || ''
    ].map(escapeCsv).join(','));
  }

  lines.push('');
  lines.push('');

  // ==========================================
  // 3. CATEGORÍAS Y PRESUPUESTOS
  // ==========================================
  lines.push('=== CATEGORÍAS Y PRESUPUESTOS MENSUALES ===');
  lines.push([
    'ID Categoría',
    'Nombre',
    'Tipo',
    'Ícono / Emoji',
    'Presupuesto Mensual (USD)'
  ].map(escapeCsv).join(','));

  for (const c of categories) {
    lines.push([
      c.id,
      c.name,
      c.type === 'expense' ? 'Gasto' : 'Ingreso',
      c.icon || '',
      c.monthlyBudget !== undefined ? c.monthlyBudget.toFixed(2) : 'Sin límite'
    ].map(escapeCsv).join(','));
  }

  lines.push('');
  lines.push('');

  // ==========================================
  // 4. FACTURAS Y PAGOS RECURRENTES
  // ==========================================
  lines.push('=== FACTURAS Y PAGOS DEL MES ===');
  lines.push([
    'ID Factura',
    'Servicio / Compromiso',
    'Categoría',
    'Monto (USD)',
    'Próximo Vencimiento',
    'Último Pago Realizado',
    'Nota'
  ].map(escapeCsv).join(','));

  for (const b of bills) {
    lines.push([
      b.id,
      b.name,
      b.category,
      b.amount.toFixed(2),
      b.dueDate,
      b.lastPaidDate || 'Pendiente',
      b.note || ''
    ].map(escapeCsv).join(','));
  }

  // ==========================================
  // 5. METAS DE AHORRO
  // ==========================================
  lines.push('');
  lines.push('=== METAS DE AHORRO ===');
  lines.push([
    'ID Meta',
    'Nombre de la Meta',
    'Monto Ahorrado Actual (USD)',
    'Monto Objetivo (USD)',
    'Porcentaje Logrado',
    'Fecha Objetivo',
    'Nota / Propósito'
  ].map(escapeCsv).join(','));

  for (const g of savingsGoals) {
    const pct = g.targetAmount > 0 ? ((g.currentAmount / g.targetAmount) * 100).toFixed(1) + '%' : '0%';
    lines.push([
      g.id,
      g.name,
      g.currentAmount.toFixed(2),
      g.targetAmount.toFixed(2),
      pct,
      g.targetDate || 'Sin fecha',
      g.note || ''
    ].map(escapeCsv).join(','));
  }

  const csvContent = lines.join('\r\n');
  const filename = `Finanzas_Personales_Respaldo_${today}.csv`;
  downloadCsv(csvContent, filename);
}

