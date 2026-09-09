/**
 * Formats a number as US Dollars (USD)
 * e.g. 1250 -> "$ 1,250" or "$ 1,250.50"
 */
export function formatCurrency(amount: number, includeSign = false): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format with dollar sign and comma as thousands separator
  const hasDecimals = !Number.isInteger(absAmount);
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(absAmount);

  const formatted = `$ ${formattedNumber}`;

  if (includeSign) {
    return isNegative ? `- ${formatted}` : `+ ${formatted}`;
  }
  return isNegative ? `- ${formatted}` : formatted;
}

/**
 * Returns formatted date string in Argentine Spanish, e.g. "8 sep" or "28 ago 2026"
 */
export function formatDate(dateString: string, includeYear = false): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  const monthsShort = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ];
  
  const dayStr = date.getDate();
  const monthStr = monthsShort[date.getMonth()];
  
  if (includeYear) {
    return `${dayStr} ${monthStr} ${date.getFullYear()}`;
  }
  return `${dayStr} ${monthStr}`;
}

/**
 * Gets month name in Spanish, e.g. "Septiembre 2026"
 */
export function getMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const monthsLong = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${monthsLong[month - 1]} ${year}`;
}

/**
 * Returns full date formatted as e.g. "15 de agosto de 2026"
 */
export function formatFullDate(dateString: string): string {
  if (!dateString) return 'Sin fecha';
  const [year, month, day] = dateString.split('-').map(Number);
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return `${day} de ${months[month - 1]} de ${year}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns previous or next month key YYYY-MM
 */
export function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
}
