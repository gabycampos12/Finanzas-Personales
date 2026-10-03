import { useMemo, useState } from 'react';
import { Account, Category, Movement, MovementType } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Edit2,
  FileDown,
  Filter,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface MovementsListProps {
  movements: Movement[];
  categories: Category[];
  accounts: Account[];
  currentMonth: string; // YYYY-MM
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
  onExportExcel?: () => void;
}

export function MovementsList({
  movements,
  categories,
  accounts,
  currentMonth,
  onEdit,
  onDelete,
  onExportExcel,
}: MovementsListProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyCurrentMonth, setOnlyCurrentMonth] = useState<boolean>(true);

  // Filtered movements
  const filtered = useMemo(() => {
    return movements
      .filter((m) => {
        // Month filter
        if (onlyCurrentMonth && !m.date.startsWith(currentMonth)) {
          return false;
        }
        // Type filter
        if (typeFilter !== 'all' && m.type !== typeFilter) {
          return false;
        }
        // Category filter
        if (categoryFilter !== 'all' && m.category !== categoryFilter) {
          return false;
        }
        // Account filter
        if (
          accountFilter !== 'all' &&
          m.accountId !== accountFilter &&
          m.toAccountId !== accountFilter
        ) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNote = m.note?.toLowerCase().includes(q);
          const matchCategory = m.category.toLowerCase().includes(q);
          const matchAmount = String(m.amount).includes(q);
          if (!matchNote && !matchCategory && !matchAmount) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.createdAt - a.createdAt));
  }, [
    movements,
    onlyCurrentMonth,
    currentMonth,
    typeFilter,
    categoryFilter,
    accountFilter,
    searchQuery,
  ]);

  const getAccountName = (accId: string) => {
    return accounts.find((a) => a.id === accId)?.name || accId;
  };

  const getCategoryColor = (catName: string) => {
    const cat = categories.find((c) => c.name === catName);
    return cat?.color || '#64748b';
  };

  const getCategoryIcon = (catName: string) => {
    const cat = categories.find((c) => c.name === catName);
    return cat?.icon || '';
  };

  const hasActiveFilters =
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    accountFilter !== 'all' ||
    searchQuery !== '';

  const clearFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setAccountFilter('all');
    setSearchQuery('');
  };

  return (
    <section id="section-movements-list" className="bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Historial de movimientos</h2>
          <p className="text-xs text-slate-500">
            {filtered.length}{' '}
            {filtered.length === 1 ? 'movimiento encontrado' : 'movimientos encontrados'}
          </p>
        </div>

        {/* Toggle para ver solo el mes actual o todo el historial y Exportar */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {onExportExcel && (
            <button
              id="btn-export-excel-list"
              type="button"
              onClick={onExportExcel}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900"
              title="Exportar movimientos y datos a Excel / CSV"
            >
              <FileDown className="h-3.5 w-3.5 text-emerald-600" />
              <span>Exportar a Excel / CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setOnlyCurrentMonth(!onlyCurrentMonth)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
              onlyCurrentMonth
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {onlyCurrentMonth ? 'Viendo este mes' : 'Viendo todo el historial'}
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="mt-3 space-y-2">
        {/* Pestañas de tipo */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'expense', label: 'Gastos' },
            { id: 'income', label: 'Ingresos' },
            { id: 'transfer', label: 'Transferencias' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id as any)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1 font-medium transition-colors ${
                typeFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Buscador y selectores de categoría y cuenta */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {/* Buscador */}
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              id="input-filter-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar concepto o monto..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-slate-800 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Filtro por Categoría */}
          <select
            id="select-filter-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-800 focus:outline-none"
          >
            <option value="all">Todas las categorías</option>
            {categories
              .filter((c) => {
                if (typeFilter === 'expense') return c.type !== 'income';
                if (typeFilter === 'income') return c.type === 'income';
                return true;
              })
              .map((c) => (
                <option key={c.id} value={c.name}>
                  {c.icon ? `${c.icon} ` : ''}{c.name}
                </option>
              ))}
          </select>

          {/* Filtro por Cuenta */}
          <select
            id="select-filter-account"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-800 focus:outline-none"
          >
            <option value="all">Todas las cuentas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Filter className="h-3 w-3" /> Filtros aplicados
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
            >
              <X className="h-3 w-3" /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de Movimientos */}
      <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            No se encontraron movimientos con los filtros seleccionados.
          </div>
        ) : (
          filtered.map((mov) => {
            const isExpense = mov.type === 'expense';
            const isIncome = mov.type === 'income';
            const isTransfer = mov.type === 'transfer';

            return (
              <div
                key={mov.id}
                className="flex items-center justify-between p-3 text-xs transition-colors hover:bg-slate-50/70"
              >
                {/* Lado izquierdo: Ícono tipo, descripción, fecha y categoría */}
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isExpense
                        ? 'bg-red-50 text-red-600'
                        : isIncome
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {isExpense && <ArrowDownLeft className="h-4 w-4" />}
                    {isIncome && <ArrowUpRight className="h-4 w-4" />}
                    {isTransfer && <ArrowLeftRight className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-slate-900">
                        {mov.note || mov.category}
                      </span>
                      {isTransfer && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                          Transferencia
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <span>{formatDate(mov.date)}</span>
                      <span>•</span>
                      {isTransfer ? (
                        <span>
                          {getAccountName(mov.accountId)} → {getAccountName(mov.toAccountId || '')}
                        </span>
                      ) : (
                        <>
                          <span className="flex items-center gap-1">
                            {getCategoryIcon(mov.category) && (
                              <span className="text-xs select-none">{getCategoryIcon(mov.category)}</span>
                            )}
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: getCategoryColor(mov.category) }}
                            />
                            {mov.category}
                          </span>
                          <span>•</span>
                          <span>{getAccountName(mov.accountId)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado derecho: Monto y Botones de Editar y Borrar */}
                <div className="flex shrink-0 items-center gap-3">
                  <div
                    className={`text-right font-extrabold ${
                      isExpense
                        ? 'text-slate-900'
                        : isIncome
                        ? 'text-emerald-700'
                        : 'text-blue-800'
                    }`}
                  >
                    {isExpense && '- '}
                    {isIncome && '+ '}
                    {formatCurrency(mov.amount)}
                    {isTransfer && Boolean(mov.fee && mov.fee > 0) && (
                      <div className="text-[10px] font-medium text-slate-500">
                        Fee: {formatCurrency(mov.fee!)} (Llegan {formatCurrency(mov.amount - mov.fee!)})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(mov)}
                      title="Editar movimiento"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(mov)}
                      title="Borrar movimiento"
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
