import { useState } from 'react';
import { Category, Movement } from '../types';
import { formatCurrency } from '../utils/formatters';
import { AlertTriangle, CheckCircle2, Edit2, Plus, Sliders } from 'lucide-react';

interface BudgetListProps {
  categories: Category[];
  movements: Movement[];
  currentMonth: string; // YYYY-MM
  onUpdateCategoryBudget: (categoryId: string, newBudget: number | undefined) => void;
  onOpenCategoriesManager: () => void;
}

export function BudgetList({
  categories,
  movements,
  currentMonth,
  onUpdateCategoryBudget,
  onOpenCategoriesManager,
}: BudgetListProps) {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editBudgetStr, setEditBudgetStr] = useState<string>('');

  // Calculate spent amount in current month for each category (only expenses)
  const expenseCategories = categories.filter((c) => c.type !== 'income');
  const categoriesWithSpent = expenseCategories.map((cat) => {
    const spent = movements
      .filter(
        (m) =>
          m.type === 'expense' &&
          m.category === cat.name &&
          m.date.startsWith(currentMonth)
      )
      .reduce((sum, m) => sum + m.amount, 0);

    const budget = cat.monthlyBudget || 0;
    const hasBudget = budget > 0;
    const percentage = hasBudget ? (spent / budget) * 100 : 0;
    const isExceeded = hasBudget && spent > budget;
    const excess = isExceeded ? spent - budget : 0;

    return {
      ...cat,
      spent,
      budget,
      hasBudget,
      percentage,
      isExceeded,
      excess,
    };
  });

  const budgetedCategories = categoriesWithSpent.filter((c) => c.hasBudget);

  const handleStartEdit = (cat: typeof categoriesWithSpent[0]) => {
    setEditingCatId(cat.id);
    setEditBudgetStr(cat.budget ? String(cat.budget) : '');
  };

  const handleSaveBudget = (catId: string) => {
    const val = parseFloat(editBudgetStr.replace(/[^0-9.]/g, ''));
    if (isNaN(val) || val <= 0) {
      onUpdateCategoryBudget(catId, undefined);
    } else {
      onUpdateCategoryBudget(catId, val);
    }
    setEditingCatId(null);
  };

  return (
    <section id="section-budgets" className="border-b border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Presupuestos del mes</h2>
          <p className="text-xs text-slate-500">
            La barra cambia a rojo si excedes el límite asignado
          </p>
        </div>
        <button
          id="btn-open-categories-manager"
          type="button"
          onClick={onOpenCategoriesManager}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Categorías</span>
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {budgetedCategories.map((item) => {
          const isEditing = editingCatId === item.id;
          
          // Determine progress bar color
          let barColor = 'bg-emerald-600';
          if (item.isExceeded) {
            barColor = 'bg-red-600';
          } else if (item.percentage >= 80) {
            barColor = 'bg-amber-500';
          }

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3 ${
                item.isExceeded
                  ? 'border-red-200 bg-red-50/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base shrink-0 select-none">{item.icon || '🏷️'}</span>
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-bold text-slate-900">{item.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.isExceeded ? (
                    <span className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      Excedido por {formatCurrency(item.excess)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Disponible: {formatCurrency(item.budget - item.spent)}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => (isEditing ? handleSaveBudget(item.id) : handleStartEdit(item))}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Modificar presupuesto"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Input de edición si está activo */}
              {isEditing ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Nuevo presupuesto: $</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editBudgetStr}
                    onChange={(e) => setEditBudgetStr(e.target.value)}
                    placeholder="Ej. 50"
                    className="w-28 rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveBudget(item.id)}
                    className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCatId(null)}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  {/* Barra de progreso plana */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      className={`h-full transition-all duration-300 ${barColor}`}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Gastado:{' '}
                      <strong className="text-slate-800 font-semibold">
                        {formatCurrency(item.spent)}
                      </strong>{' '}
                      de {formatCurrency(item.budget)}
                    </span>
                    <span
                      className={`font-semibold ${
                        item.isExceeded ? 'text-red-600' : 'text-slate-700'
                      }`}
                    >
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Categorías sin presupuesto configurado */}
        {categoriesWithSpent.filter((c) => !c.hasBudget).length > 0 && (
          <div className="pt-1">
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer font-medium hover:text-slate-900">
                + Asignar presupuesto a otras categorías
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categoriesWithSpent
                  .filter((c) => !c.hasBudget)
                  .map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 p-2 text-left hover:bg-slate-50"
                    >
                      <span className="truncate text-[11px] font-medium text-slate-700">
                        {cat.name}
                      </span>
                      <Plus className="h-3 w-3 text-slate-400 shrink-0" />
                    </button>
                  ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}
