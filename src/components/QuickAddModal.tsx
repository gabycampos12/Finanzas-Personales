import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Account, Category, Movement, MovementType } from '../types';
import { getTodayString } from '../utils/formatters';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, X } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (movement: Omit<Movement, 'id' | 'createdAt'>, editingId?: string) => void;
  categories: Category[];
  accounts: Account[];
  initialType?: MovementType;
  movementToEdit?: Movement | null;
  onOpenCategoriesManager?: (tab: 'expense' | 'income') => void;
}

export function QuickAddModal({
  isOpen,
  onClose,
  onSave,
  categories,
  accounts,
  initialType = 'expense',
  movementToEdit,
  onOpenCategoriesManager,
}: QuickAddModalProps) {
  const [type, setType] = useState<MovementType>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedToAccount, setSelectedToAccount] = useState<string>('');
  const [transferFeeStr, setTransferFeeStr] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayString());
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  const amountInputRef = useRef<HTMLInputElement>(null);

  const expenseCategories = categories.filter((c) => c.type !== 'income');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  // Sync state when opening or editing
  useEffect(() => {
    if (isOpen) {
      if (movementToEdit) {
        setType(movementToEdit.type);
        setAmountStr(String(movementToEdit.amount));
        setSelectedCategory(movementToEdit.category);
        setSelectedAccount(movementToEdit.accountId);
        setSelectedToAccount(
          movementToEdit.toAccountId ||
            accounts.find((a) => a.id !== movementToEdit.accountId)?.id ||
            accounts[0]?.id ||
            ''
        );
        setTransferFeeStr(
          movementToEdit.fee !== undefined && movementToEdit.fee !== null
            ? String(movementToEdit.fee)
            : ''
        );
        setDate(movementToEdit.date);
        setNote(movementToEdit.note || '');
      } else {
        setType(initialType);
        setAmountStr('');
        const defaultList = initialType === 'income' ? incomeCategories : expenseCategories;
        setSelectedCategory(
          initialType === 'transfer' ? 'Transferencia' : defaultList[0]?.name || ''
        );
        setSelectedAccount(accounts[0]?.id || '');
        setSelectedToAccount(accounts[1]?.id || accounts[0]?.id || '');
        setTransferFeeStr('');
        setDate(getTodayString());
        setNote('');
      }
      setError('');
      // Autofocus input
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialType, movementToEdit, categories, accounts]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: MovementType) => {
    setType(newType);
    setError('');
    if (newType === 'income') {
      if (!incomeCategories.some((c) => c.name === selectedCategory)) {
        setSelectedCategory(incomeCategories[0]?.name || '');
      }
    } else if (newType === 'expense') {
      if (!expenseCategories.some((c) => c.name === selectedCategory)) {
        setSelectedCategory(expenseCategories[0]?.name || '');
      }
    } else {
      setSelectedCategory('Transferencia');
      if (selectedAccount === selectedToAccount) {
        const other = accounts.find((a) => a.id !== selectedAccount);
        if (other) setSelectedToAccount(other.id);
      }
    }
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleanAmount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setError('Ingresa un monto válido mayor a 0');
      amountInputRef.current?.focus();
      return;
    }

    if (type === 'transfer') {
      if (!selectedAccount) {
        setError('Elige la cuenta de origen');
        return;
      }
      if (!selectedToAccount) {
        setError('Elige la cuenta de destino');
        return;
      }
      if (selectedAccount === selectedToAccount) {
        setError('La cuenta de origen y destino deben ser distintas');
        return;
      }

      const cleanFee = transferFeeStr.trim()
        ? parseFloat(transferFeeStr.replace(/[^0-9.]/g, ''))
        : undefined;
      const finalFee = cleanFee && !isNaN(cleanFee) && cleanFee > 0 ? cleanFee : undefined;

      if (finalFee !== undefined && finalFee >= cleanAmount) {
        setError('El fee debe ser menor al monto que estás transfiriendo');
        return;
      }

      onSave(
        {
          type: 'transfer',
          amount: cleanAmount,
          category: 'Transferencia',
          accountId: selectedAccount,
          toAccountId: selectedToAccount,
          fee: finalFee,
          date,
          note: note.trim() || undefined,
        },
        movementToEdit?.id
      );
      onClose();
      return;
    }

    if (!selectedCategory) {
      setError('Elige una categoría');
      return;
    }
    if (!selectedAccount) {
      setError('Elige una cuenta');
      return;
    }

    onSave(
      {
        type,
        amount: cleanAmount,
        category: selectedCategory,
        accountId: selectedAccount,
        date,
        note: note.trim() || undefined,
      },
      movementToEdit?.id
    );
    onClose();
  };

  const cleanAmountNum = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
  const cleanFeeNum = parseFloat(transferFeeStr.replace(/[^0-9.]/g, ''));
  const hasValidTransferFee =
    type === 'transfer' &&
    !isNaN(cleanAmountNum) &&
    cleanAmountNum > 0 &&
    !isNaN(cleanFeeNum) &&
    cleanFeeNum > 0 &&
    cleanFeeNum < cleanAmountNum;

  const fromAccountObj = accounts.find((a) => a.id === selectedAccount);
  const toAccountObj = accounts.find((a) => a.id === selectedToAccount);

  return (
    <div
      id="quick-add-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
    >
      <div
        id="quick-add-modal-content"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-300 bg-white p-5 text-slate-900 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              id="tab-toggle-expense"
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                type === 'expense'
                  ? 'bg-red-600 text-white shadow-none'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Gasto
            </button>
            <button
              id="tab-toggle-income"
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-none'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Ingreso
            </button>
            <button
              id="tab-toggle-transfer"
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-none'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Transferencia
            </button>
          </div>

          <button
            id="btn-close-quick-add"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Monto principal en grande */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
              {type === 'transfer' ? 'Monto a transferir' : 'Monto'}
            </label>
            <div className="relative mt-1 flex items-center">
              <span className="pointer-events-none absolute left-3 text-2xl font-bold text-slate-400">
                $
              </span>
              <input
                ref={amountInputRef}
                id="input-quick-add-amount"
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setError('');
                }}
                placeholder="0"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-8 pr-4 text-2xl font-extrabold text-slate-900 placeholder-slate-300 focus:border-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
            {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
          </div>

          {/* Si es transferencia: Selección de cuenta origen y cuenta destino + Fee */}
          {type === 'transfer' ? (
            <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cuenta Origen */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Cuenta de origen (Salen fondos)
                  </label>
                  <select
                    id="select-transfer-edit-from"
                    value={selectedAccount}
                    onChange={(e) => {
                      setSelectedAccount(e.target.value);
                      setError('');
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-800 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cuenta Destino */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Cuenta de destino (Recibe fondos)
                  </label>
                  <select
                    id="select-transfer-edit-to"
                    value={selectedToAccount}
                    onChange={(e) => {
                      setSelectedToAccount(e.target.value);
                      setError('');
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-800 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fee / Comisión Opcional */}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Comisión / Fee cobrado <span className="font-normal text-slate-500">(Opcional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Si aplica</span>
                </div>
                <div className="relative mt-1 flex items-center">
                  <span className="pointer-events-none absolute left-3 text-sm font-bold text-slate-400">
                    $
                  </span>
                  <input
                    id="input-transfer-edit-fee"
                    type="text"
                    inputMode="decimal"
                    value={transferFeeStr}
                    onChange={(e) => {
                      setTransferFeeStr(e.target.value);
                      setError('');
                    }}
                    placeholder="0.00 (ej. 1.00)"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 py-1.5 pl-7 pr-3 text-xs font-bold text-slate-800 focus:border-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                  El fee se descuenta del monto que llega a destino (ej. transfieres $20 con fee de $1: salen $20 exactos de origen y se acreditan $19 en destino).
                </p>

                {hasValidTransferFee && (
                  <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-900 font-medium">
                    Salen <strong>${cleanAmountNum.toFixed(2)}</strong> de{' '}
                    <strong>{fromAccountObj?.name || 'Origen'}</strong> ➔ Se acreditan{' '}
                    <strong>${(cleanAmountNum - cleanFeeNum).toFixed(2)}</strong> en{' '}
                    <strong>{toAccountObj?.name || 'Destino'}</strong> (Fee deducido: ${cleanFeeNum.toFixed(2)})
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Categoría: Selección rápida con 1 solo toque para Ingreso o Gasto */
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                    Categoría
                  </label>
                  {onOpenCategoriesManager && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCategoriesManager(type === 'income' ? 'income' : 'expense');
                      }}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-900 hover:underline"
                    >
                      (Editar opciones)
                    </button>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {selectedCategory || 'Selecciona una'}
                </span>
              </div>

              {type === 'expense' ? (
                <div
                  id="quick-category-grid"
                  className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 max-h-48 overflow-y-auto pr-0.5"
                >
                  {expenseCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.name;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-2 text-left text-xs font-medium transition-colors ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm shrink-0 select-none">{cat.icon || '🏷️'}</span>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  id="quick-income-category-grid"
                  className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 max-h-48 overflow-y-auto pr-0.5"
                >
                  {incomeCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.name;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                          isSelected
                            ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm shrink-0 select-none">{cat.icon || '💵'}</span>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Cuenta (solo si no es transferencia) y Fecha */}
          <div className="grid grid-cols-2 gap-3">
            {type !== 'transfer' ? (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Cuenta
                </label>
                <select
                  id="select-quick-add-account"
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-slate-800 focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className={type === 'transfer' ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                Fecha
              </label>
              <input
                id="input-quick-add-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Concepto / Nota */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
              Concepto / Nota (Opcional)
            </label>
            <input
              id="input-quick-add-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                type === 'transfer'
                  ? 'Ej. Retiro a Airtm, saldo para gastos...'
                  : 'Ej. Supermercado semanal, almuerzo, gasolina...'
              }
              maxLength={80}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none"
            />
          </div>

          {/* Botón Guardar */}
          <div className="pt-2">
            <button
              id="btn-submit-quick-add"
              type="submit"
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity ${
                type === 'expense'
                  ? 'bg-slate-900 hover:bg-slate-800'
                  : type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Check className="h-4 w-4" />
              {movementToEdit
                ? 'Guardar cambios'
                : type === 'expense'
                ? 'Registrar gasto'
                : type === 'income'
                ? 'Registrar ingreso'
                : 'Registrar transferencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
