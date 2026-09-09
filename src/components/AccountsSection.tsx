import { useState, type FormEvent } from 'react';
import { Account, Movement } from '../types';
import { formatCurrency, getTodayString } from '../utils/formatters';
import { ArrowLeftRight, Building2, Check, Edit2, Plus, Settings2, Smartphone, Trash2, Wallet, X } from 'lucide-react';

interface AccountsSectionProps {
  accounts: Account[];
  movements: Movement[];
  onTransfer: (transferData: {
    amount: number;
    fromAccountId: string;
    toAccountId: string;
    date: string;
    fee?: number;
    note?: string;
  }) => void;
  onUpdateAccount: (accountId: string, updates: Partial<Account>) => void;
  onAddAccount?: (account: Omit<Account, 'id'>) => void;
  onDeleteAccount?: (accountId: string) => void;
}

const ACCOUNT_COLORS = [
  '#dc2626', // Red
  '#0284c7', // Sky
  '#16a34a', // Green
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#ea580c', // Orange
  '#0d9488', // Teal
  '#2563eb', // Blue
  '#4f46e5', // Indigo
  '#db2777', // Pink
  '#475569', // Slate
];

export function AccountsSection({
  accounts,
  movements,
  onTransfer,
  onUpdateAccount,
  onAddAccount,
  onDeleteAccount,
}: AccountsSectionProps) {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Transfer state
  const [amountStr, setAmountStr] = useState('');
  const [fromAccount, setFromAccount] = useState(accounts[0]?.id || '');
  const [toAccount, setToAccount] = useState(accounts[1]?.id || '');
  const [transferDate, setTransferDate] = useState(getTodayString());
  const [transferFeeStr, setTransferFeeStr] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferError, setTransferError] = useState('');

  // Editing account state inside Manage Modal
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<Account['type']>('bank');
  const [editInitialBalance, setEditInitialBalance] = useState('');
  const [editColor, setEditColor] = useState(ACCOUNT_COLORS[0]);
  const [editError, setEditError] = useState('');

  // New account form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<Account['type']>('bank');
  const [newInitialBalance, setNewInitialBalance] = useState('');
  const [newColor, setNewColor] = useState(ACCOUNT_COLORS[1]);
  const [newError, setNewError] = useState('');

  // Calculate real balance for each account across all movements
  const accountsWithBalances = accounts.map((acc) => {
    let balance = acc.initialBalance;

    movements.forEach((mov) => {
      if (mov.type === 'income' && mov.accountId === acc.id) {
        balance += mov.amount;
      } else if (mov.type === 'expense' && mov.accountId === acc.id) {
        balance -= mov.amount;
      } else if (mov.type === 'transfer') {
        if (mov.accountId === acc.id) {
          balance -= mov.amount; // Salen los fondos completos transferidos de la cuenta de origen (ej. $20)
        }
        if (mov.toAccountId === acc.id) {
          balance += (mov.amount - (mov.fee || 0)); // Llega el monto neto a la cuenta destino tras descontar el fee (ej. $19)
        }
      }
    });

    return {
      ...acc,
      calculatedBalance: balance,
    };
  });

  const totalCapital = accountsWithBalances.reduce(
    (sum, acc) => sum + acc.calculatedBalance,
    0
  );

  const handleOpenTransfer = (defaultFrom?: string) => {
    if (defaultFrom) {
      setFromAccount(defaultFrom);
      const other = accounts.find((a) => a.id !== defaultFrom);
      if (other) setToAccount(other.id);
    } else {
      setFromAccount(accounts[0]?.id || '');
      setToAccount(accounts[1]?.id || accounts[0]?.id || '');
    }
    setAmountStr('');
    setTransferDate(getTodayString());
    setTransferFeeStr('');
    setTransferNote('');
    setTransferError('');
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = (e: FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setTransferError('Ingresa un monto válido para transferir');
      return;
    }
    if (fromAccount === toAccount) {
      setTransferError('La cuenta de origen y destino deben ser distintas');
      return;
    }

    const cleanFee = transferFeeStr.trim() ? parseFloat(transferFeeStr.replace(/[^0-9.]/g, '')) : undefined;
    const finalFee = cleanFee && !isNaN(cleanFee) && cleanFee > 0 ? cleanFee : undefined;

    if (finalFee !== undefined && finalFee >= cleanAmount) {
      setTransferError('El fee debe ser menor al monto a transferir');
      return;
    }

    onTransfer({
      amount: cleanAmount,
      fromAccountId: fromAccount,
      toAccountId: toAccount,
      date: transferDate,
      fee: finalFee,
      note: transferNote.trim() || undefined,
    });

    setIsTransferModalOpen(false);
  };

  const handleStartEditAccount = (acc: Account) => {
    setEditingAccountId(acc.id);
    setEditName(acc.name);
    setEditType(acc.type);
    setEditInitialBalance(acc.initialBalance ? String(acc.initialBalance) : '0');
    setEditColor(acc.color || ACCOUNT_COLORS[0]);
    setEditError('');
    setIsManageModalOpen(true);
  };

  const handleSaveAccountEdit = (acc: Account) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('El nombre de la cuenta no puede quedar vacío');
      return;
    }
    const cleanBal = parseFloat(editInitialBalance.replace(/[^0-9.-]/g, ''));
    const finalBal = isNaN(cleanBal) ? 0 : cleanBal;

    onUpdateAccount(acc.id, {
      name: trimmed,
      type: editType,
      initialBalance: finalBal,
      color: editColor,
    });

    setEditingAccountId(null);
    setEditError('');
  };

  const handleCreateNewAccount = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setNewError('Escribe el nombre de la cuenta');
      return;
    }
    if (onAddAccount) {
      const cleanBal = parseFloat(newInitialBalance.replace(/[^0-9.-]/g, ''));
      onAddAccount({
        name: trimmed,
        type: newType,
        initialBalance: isNaN(cleanBal) ? 0 : cleanBal,
        color: newColor,
      });
      setNewName('');
      setNewInitialBalance('');
      setNewError('');
    }
  };

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'bank':
        return <Building2 className="h-4 w-4" />;
      case 'wallet':
        return <Smartphone className="h-4 w-4" />;
      case 'cash':
        return <Wallet className="h-4 w-4" />;
    }
  };

  return (
    <section id="section-accounts" className="border-b border-slate-200 bg-white p-4">
      {/* Encabezado y acciones */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Mis cuentas y saldos</h2>
          <p className="text-xs text-slate-500">
            Controla tus saldos y transferencias entre cuentas
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-open-manage-accounts"
            type="button"
            onClick={() => {
              setEditingAccountId(null);
              setIsManageModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="Editar nombres y detalles de las cuentas"
          >
            <Settings2 className="h-3.5 w-3.5 text-slate-600" />
            <span className="hidden sm:inline">Editar cuentas</span>
            <span className="sm:hidden">Cuentas</span>
          </button>

          <button
            id="btn-open-transfer-modal"
            type="button"
            onClick={() => handleOpenTransfer()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Transferir</span>
          </button>
        </div>
      </div>

      {/* Tarjeta destacada de Total Disponible */}
      <div
        id="card-total-available-balance"
        className="mt-3 overflow-hidden rounded-2xl border border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 sm:p-5 text-white shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Total disponible en tus cuentas
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {formatCurrency(totalCapital)}
              </span>
              <span className="text-xs font-medium text-slate-400">USD</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700/80">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {accounts.length} {accounts.length === 1 ? 'cuenta activa' : 'cuentas activas'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de cuentas */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {accountsWithBalances.map((acc) => (
          <div
            key={acc.id}
            id={`card-account-${acc.id}`}
            className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: acc.color }}
              >
                {getAccountIcon(acc.type)}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  {acc.type === 'bank' ? 'Banco' : acc.type === 'wallet' ? 'Virtual' : 'Efectivo'}
                </span>
                <button
                  id={`btn-edit-account-card-${acc.id}`}
                  type="button"
                  onClick={() => handleStartEditAccount(acc)}
                  title={`Editar ${acc.name}`}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="mt-3">
              <div className="truncate text-xs font-medium text-slate-700" title={acc.name}>
                {acc.name}
              </div>
              <div
                className={`text-sm font-extrabold ${
                  acc.calculatedBalance < 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {formatCurrency(acc.calculatedBalance)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para Administrar / Editar Cuentas */}
      {isManageModalOpen && (
        <div
          id="modal-manage-accounts-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            id="modal-manage-accounts-content"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-300 bg-white p-5 text-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Editar cuentas de dinero</h3>
                <p className="text-xs text-slate-500">
                  Modifica los nombres, tipos y saldos iniciales
                </p>
              </div>
              <button
                id="btn-close-manage-accounts"
                type="button"
                onClick={() => {
                  setIsManageModalOpen(false);
                  setEditingAccountId(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lista de cuentas existentes */}
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tus cuentas actuales ({accounts.length})
              </label>

              <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {accountsWithBalances.map((acc) => {
                  const isEditing = editingAccountId === acc.id;

                  if (isEditing) {
                    return (
                      <div
                        key={acc.id}
                        id={`account-edit-box-${acc.id}`}
                        className="bg-slate-50 p-3 text-xs space-y-3 border-l-4 border-slate-800"
                      >
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Nombre de la cuenta
                          </label>
                          <input
                            id={`input-edit-account-name-${acc.id}`}
                            type="text"
                            value={editName}
                            onChange={(e) => {
                              setEditName(e.target.value);
                              setEditError('');
                            }}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-slate-800 focus:outline-none"
                            placeholder="Ej. Bank of America, Binance, Efectivo"
                            autoFocus
                          />
                          {editError && (
                            <p className="mt-1 text-[11px] font-medium text-red-600">{editError}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Tipo
                            </label>
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as Account['type'])}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                            >
                              <option value="bank">Banco</option>
                              <option value="wallet">Billetera virtual</option>
                              <option value="cash">Efectivo</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Saldo inicial ($ USD)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editInitialBalance}
                              onChange={(e) => setEditInitialBalance(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Color representativo
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {ACCOUNT_COLORS.map((col) => (
                              <button
                                key={col}
                                type="button"
                                onClick={() => setEditColor(col)}
                                className={`flex h-5 w-5 items-center justify-center rounded-full transition-transform ${
                                  editColor === col
                                    ? 'scale-110 ring-2 ring-slate-800'
                                    : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: col }}
                              >
                                {editColor === col && <Check className="h-2.5 w-2.5 text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setEditingAccountId(null)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Cancelar
                          </button>
                          <button
                            id={`btn-save-account-${acc.id}`}
                            type="button"
                            onClick={() => handleSaveAccountEdit(acc)}
                            className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Guardar cambios</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-3 text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white"
                          style={{ backgroundColor: acc.color }}
                        >
                          {getAccountIcon(acc.type)}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-slate-800">{acc.name}</span>
                          <div className="text-[11px] text-slate-400">
                            {acc.type === 'bank'
                              ? 'Banco'
                              : acc.type === 'wallet'
                              ? 'Billetera virtual'
                              : 'Efectivo'}{' '}
                            • Saldo: {formatCurrency(acc.calculatedBalance)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          id={`btn-edit-account-row-${acc.id}`}
                          type="button"
                          onClick={() => handleStartEditAccount(acc)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Edit2 className="h-3 w-3 text-slate-500" />
                          <span>Editar</span>
                        </button>
                        {onDeleteAccount && accounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteAccount(acc.id)}
                            title="Eliminar cuenta"
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Formulario para agregar una nueva cuenta si se desea */}
            {onAddAccount && (
              <form onSubmit={handleCreateNewAccount} className="mt-5 border-t border-slate-100 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Agregar otra cuenta
                </label>

                <div className="mt-2 space-y-2.5">
                  <div>
                    <input
                      id="input-new-account-name"
                      type="text"
                      placeholder="Nombre (ej. Bank of America, Binance, PayPal)"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        setNewError('');
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                    />
                    {newError && <p className="mt-1 text-xs text-red-600">{newError}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500">Tipo de cuenta</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as Account['type'])}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                      >
                        <option value="bank">Banco</option>
                        <option value="wallet">Billetera virtual</option>
                        <option value="cash">Efectivo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500">
                        Saldo inicial ($ USD)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={newInitialBalance}
                        onChange={(e) => setNewInitialBalance(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500">Color</label>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ACCOUNT_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setNewColor(col)}
                          className={`flex h-5 w-5 items-center justify-center rounded-full transition-transform ${
                            newColor === col ? 'scale-110 ring-2 ring-slate-800' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: col }}
                        >
                          {newColor === col && <Check className="h-2.5 w-2.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    id="btn-submit-new-account"
                    type="submit"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Crear cuenta
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Transferencia entre Cuentas */}
      {isTransferModalOpen && (
        <div
          id="modal-transfer-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            id="modal-transfer-content"
            className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-5 text-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-800">
                  <ArrowLeftRight className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Transferir dinero entre cuentas</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="mt-4 space-y-3">
              {/* Monto */}
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Monto a transferir ($ USD)
                </label>
                <div className="relative mt-1 flex items-center">
                  <span className="pointer-events-none absolute left-3 text-lg font-bold text-slate-400">
                    $
                  </span>
                  <input
                    id="input-transfer-amount"
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value);
                      setTransferError('');
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-8 pr-3 text-lg font-bold text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
                {transferError && (
                  <p className="mt-1 text-xs font-medium text-red-600">{transferError}</p>
                )}
              </div>

              {/* De Cuenta */}
              <div>
                <label className="block text-xs font-medium text-slate-500">Desde la cuenta</label>
                <select
                  id="select-transfer-from"
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* A Cuenta */}
              <div>
                <label className="block text-xs font-medium text-slate-500">Hacia la cuenta</label>
                <select
                  id="select-transfer-to"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comisión / Fee Opcional */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700">
                    Comisión / Fee por transferir <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Si aplica</span>
                </div>
                <div className="relative mt-1 flex items-center">
                  <span className="pointer-events-none absolute left-2.5 text-xs font-bold text-slate-400">
                    $
                  </span>
                  <input
                    id="input-transfer-fee"
                    type="text"
                    inputMode="decimal"
                    value={transferFeeStr}
                    onChange={(e) => setTransferFeeStr(e.target.value)}
                    placeholder="0.00 (ej. 1.50)"
                    className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-6 pr-3 text-xs font-semibold text-slate-800 focus:border-slate-800 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  El fee se descuenta del monto acreditado en destino (ej. transfieres $20 con fee de $1: salen $20 exactos de origen y se acreditan $19 en destino).
                </p>
                {(() => {
                  const amt = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
                  const feeNum = parseFloat(transferFeeStr.replace(/[^0-9.]/g, ''));
                  if (!isNaN(amt) && amt > 0 && !isNaN(feeNum) && feeNum > 0 && feeNum < amt) {
                    const fromAccName = accounts.find((a) => a.id === fromAccount)?.name || 'Origen';
                    const toAccName = accounts.find((a) => a.id === toAccount)?.name || 'Destino';
                    return (
                      <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-900 font-medium">
                        Salen <strong>${amt.toFixed(2)}</strong> de <strong>{fromAccName}</strong> ➔ Se acreditan <strong>${(amt - feeNum).toFixed(2)}</strong> en <strong>{toAccName}</strong> (Fee: ${feeNum.toFixed(2)})
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Fecha y Nota */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Fecha</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Concepto</label>
                  <input
                    type="text"
                    placeholder="Ej. Transferencia de fondos, pago de tarjeta"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-submit-transfer"
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  <Check className="h-4 w-4" />
                  Registrar transferencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
