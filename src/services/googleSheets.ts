import { Account, Category, Movement } from '../types';

export interface ExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Creates a new spreadsheet in Google Sheets and populates it with all current data:
 * - Tab "Movimientos"
 * - Tab "Cuentas y Saldos"
 * - Tab "Presupuestos"
 */
export async function exportToNewGoogleSheet(
  accessToken: string,
  movements: Movement[],
  categories: Category[],
  accounts: (Account & { balance: number })[]
): Promise<ExportResult> {
  const title = `Finanzas Personales - ${new Date().toLocaleDateString('es-AR')}`;

  // 1. Create spreadsheet with 3 tabs
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        { properties: { title: 'Movimientos' } },
        { properties: { title: 'Cuentas' } },
        { properties: { title: 'Presupuestos' } },
      ],
    }),
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Error al crear la planilla de Google Sheets.');
  }

  const sheetData = await createResponse.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare values for each tab
  const movementsRows = [
    ['Fecha', 'Tipo', 'Monto (USD)', 'Categoría', 'Cuenta Origen', 'Cuenta Destino', 'Concepto'],
    ...movements.map((m) => [
      m.date,
      m.type === 'expense' ? 'Gasto' : m.type === 'income' ? 'Ingreso' : 'Transferencia',
      m.amount,
      m.category,
      accounts.find((a) => a.id === m.accountId)?.name || m.accountId,
      m.toAccountId ? accounts.find((a) => a.id === m.toAccountId)?.name || m.toAccountId : '',
      m.note || '',
    ]),
  ];

  const accountsRows = [
    ['Cuenta', 'Tipo', 'Saldo Inicial (USD)', 'Saldo Calculado (USD)'],
    ...accounts.map((a) => [
      a.name,
      a.type === 'bank' ? 'Banco' : a.type === 'wallet' ? 'Billetera' : 'Efectivo',
      a.initialBalance,
      a.balance,
    ]),
  ];

  const budgetRows = [
    ['Categoría', 'Presupuesto Mensual (USD)'],
    ...categories.map((c) => [c.name, c.monthlyBudget || 0]),
  ];

  // 3. Batch update values
  const updateDataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'Movimientos!A1:G' + movementsRows.length,
            values: movementsRows,
          },
          {
            range: 'Cuentas!A1:D' + accountsRows.length,
            values: accountsRows,
          },
          {
            range: 'Presupuestos!A1:B' + budgetRows.length,
            values: budgetRows,
          },
        ],
      }),
    }
  );

  if (!updateDataResponse.ok) {
    const err = await updateDataResponse.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al escribir los datos en Google Sheets.');
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Updates an existing Google Spreadsheet with current transactions
 */
export async function syncToExistingSheet(
  accessToken: string,
  spreadsheetId: string,
  movements: Movement[],
  categories: Category[],
  accounts: (Account & { balance: number })[]
): Promise<void> {
  const movementsRows = [
    ['Fecha', 'Tipo', 'Monto (USD)', 'Categoría', 'Cuenta Origen', 'Cuenta Destino', 'Nota'],
    ...movements.map((m) => [
      m.date,
      m.type === 'expense' ? 'Gasto' : m.type === 'income' ? 'Ingreso' : 'Transferencia',
      m.amount,
      m.category,
      accounts.find((a) => a.id === m.accountId)?.name || m.accountId,
      m.toAccountId ? accounts.find((a) => a.id === m.toAccountId)?.name || m.toAccountId : '',
      m.note || '',
    ]),
  ];

  // Clear and rewrite movements tab
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Movimientos!A1:G${movementsRows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: movementsRows,
      }),
    }
  );

  if (!updateResponse.ok) {
    const err = await updateResponse.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al sincronizar con la planilla existente.');
  }
}
