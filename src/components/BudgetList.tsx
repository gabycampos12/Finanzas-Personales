import { useState, type FormEvent } from 'react';
import { Category, Movement } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Plus,
  Settings2,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';

interface BudgetListProps {
  categories: Category[];
  movements: Movement[];
  currentMonth: string; // YYYY-MM
  onUpdateCategoryBudget: (categoryId: string, newBudget: number | undefined) => void;
  onOpenCategoriesManager: () => void;
  onUpdateCategory?: (id: string, updates: Partial<Category>, oldName?: string) => void;
  onDeleteCategory?: (id: string) => void;
  onAddCategory?: (category: Omit<Category, 'id'>) => void;
}

const PALETTE_COLORS = [
  '#059669', '#d97706', '#0284c7', '#4f46e5',
  '#db2777', '#7c3aed', '#ea580c', '#2563eb',
  '#0d9488', '#64748b', '#84cc16', '#e11d48',
  '#f97316', '#14b8a6', '#dc2626', '#4338ca',
];

const CATEGORY_EMOJIS = [
  '🛒', '👦', '🌐', '🎒', '💊', '🧴', '⚠️', '📱',
  '💳', '🔥', '⛽', '🏠', '🍔', '🎉', '📚', '🤲',
  '📺', '🛍️', '💵', '✈️', '✨', '🎁', '💰', '☕',
  '🏋️', '🐾', '💡', '🎮', '🍿', '🔧', '🩺', '🏷️'
];

export function BudgetList({
  categories,
  movements,
  currentMonth,
  onUpdateCategoryBudget,
  onOpenCategoriesManager,
  onUpdateCategory,
  onDeleteCategory,
  onAddCategory,
}: BudgetListProps) {
  // Quick budget inline editing
  const [editingBudgetCatId, setEditingBudgetCatId] = useState<string | null>(null);
  const [editBudgetStr, setEditBudgetStr] = useState<string>('');

  // Full category edit modal
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [modalCatName, setModalCatName] = useState('');
  const [modalCatEmoji, setModalCatEmoji] = useState('🏷️');
  const [modalCatColor, setModalCatColor] = useState(PALETTE_COLORS[0]);
  const [modalCatBudget, setModalCatBudget] = useState('');
  const [modalError, setModalError] = useState('');

  // New category modal
  const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🛒');
  const [newCatColor, setNewCatColor] = useState(PALETTE_COLORS[0]);
  const [newCatBudget, setNewCatBudget] = useState('');
  const [newCatError, setNewCatError] = useState('');

  // Delete category confirmation
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

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

  // --- Handlers for quick inline budget editing ---
  const handleStartEditBudget = (cat: typeof categoriesWithSpent[0]) => {
    setEditingBudgetCatId(cat.id);
    setEditBudgetStr(cat.budget ? String(cat.budget) : '');
  };

  const handleSaveBudget = (catId: string) => {
    const val = parseFloat(editBudgetStr.replace(/[^0-9.]/g, ''));
    if (isNaN(val) || val <= 0) {
      onUpdateCategoryBudget(catId, undefined);
    } else {
      onUpdateCategoryBudget(catId, val);
    }
    setEditingBudgetCatId(null);
  };

  // --- Handlers for full category edit modal ---
  const handleOpenEditCategoryModal = (cat: Category) => {
    setCategoryToEdit(cat);
    setModalCatName(cat.name);
    setModalCatEmoji(cat.icon || '🏷️');
    setModalCatColor(cat.color || PALETTE_COLORS[0]);
    setModalCatBudget(cat.monthlyBudget ? String(cat.monthlyBudget) : '');
    setModalError('');
  };

  const handleSaveEditedCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!categoryToEdit || !onUpdateCategory) return;

    const cleanName = modalCatName.trim();
    if (!cleanName) {
      setModalError('Por favor ingresa un nombre para la categoría');
      return;
    }

    // Check if name is taken by another category
    const duplicate = categories.some(
      (c) => c.id !== categoryToEdit.id && c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      setModalError('Ya existe una categoría con ese nombre');
      return;
    }

    const budgetVal = modalCatBudget.trim()
      ? parseFloat(modalCatBudget.replace(/[^0-9.]/g, ''))
      : undefined;

    onUpdateCategory(
      categoryToEdit.id,
      {
        name: cleanName,
        icon: modalCatEmoji,
        color: modalCatColor,
        monthlyBudget: budgetVal && budgetVal > 0 ? budgetVal : undefined,
      },
      categoryToEdit.name
    );

    setCategoryToEdit(null);
  };

  // --- Handlers for creating new category ---
  const handleOpenNewCategoryModal = () => {
    setNewCatName('');
    setNewCatEmoji('🛒');
    setNewCatColor(PALETTE_COLORS[0]);
    setNewCatBudget('');
    setNewCatError('');
    setIsNewCatModalOpen(true);
  };

  const handleSaveNewCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!onAddCategory) return;

    const cleanName = newCatName.trim();
    if (!cleanName) {
      setNewCatError('Por favor ingresa un nombre para la categoría');
      return;
    }

    const duplicate = categories.some(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      setNewCatError('Ya existe una categoría con ese nombre');
      return;
    }

    const budgetVal = newCatBudget.trim()
      ? parseFloat(newCatBudget.replace(/[^0-9.]/g, ''))
      : undefined;

    onAddCategory({
      name: cleanName,
      type: 'expense',
      icon: newCatEmoji,
      color: newCatColor,
      monthlyBudget: budgetVal && budgetVal > 0 ? budgetVal : undefined,
      isDefault: false,
    });

    setIsNewCatModalOpen(false);
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete || !onDeleteCategory) return;
    onDeleteCategory(categoryToDelete.id);
    setCategoryToDelete(null);
    if (categoryToEdit?.id === categoryToDelete.id) {
      setCategoryToEdit(null);
    }
  };

  return (
    <section id="section-budgets" className="bg-white p-4">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">Presupuestos por Categoría</h2>
          </div>
          <p className="text-xs text-slate-500">
            Controla tus límites mensuales de gasto. Puedes modificar cualquier categoría y su presupuesto en todo momento.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-new-budget-category"
            type="button"
            onClick={handleOpenNewCategoryModal}
            className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-400" />
            <span>+ Nueva Categoría</span>
          </button>

          <button
            id="btn-open-categories-manager"
            type="button"
            onClick={onOpenCategoriesManager}
            className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            title="Administrador de categorías avanzado"
          >
            <Settings2 className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Administrar</span>
          </button>
        </div>
      </div>

      {/* Lista de Categorías con Presupuesto */}
      <div className="mt-3.5 space-y-3">
        {budgetedCategories.map((item) => {
          const isInlineBudgetEditing = editingBudgetCatId === item.id;
          
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
              className={`rounded-2xl border p-3.5 transition-all duration-200 ${
                item.isExceeded
                  ? 'border-red-200 bg-red-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0 select-none">{item.icon || '🏷️'}</span>
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate block">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Presupuesto mensual: <strong className="text-slate-700">{formatCurrency(item.budget)}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.isExceeded ? (
                    <span className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      Excedido por {formatCurrency(item.excess)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Disponible: {formatCurrency(item.budget - item.spent)}
                    </span>
                  )}

                  {/* Botón Editar Categoría Completa (Nombre, Ícono, Color, Presupuesto) */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditCategoryModal(item)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    title="Modificar o editar esta categoría"
                  >
                    <Edit2 className="h-3 w-3 text-slate-500" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>

              {/* Input de edición rápida de presupuesto si está activo */}
              {isInlineBudgetEditing ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-2 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">Nuevo monto ($):</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={editBudgetStr}
                    onChange={(e) => setEditBudgetStr(e.target.value)}
                    placeholder="Ej. 50"
                    className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveBudget(item.id)}
                    className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBudgetCatId(null)}
                    className="text-xs text-slate-500 hover:underline px-1"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  {/* Barra de progreso */}
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Gastado:{' '}
                      <strong className="text-slate-900 font-bold">
                        {formatCurrency(item.spent)}
                      </strong>{' '}
                      de {formatCurrency(item.budget)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-extrabold ${
                          item.isExceeded ? 'text-red-600' : 'text-slate-800'
                        }`}
                      >
                        {item.percentage.toFixed(0)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEditBudget(item)}
                        className="text-[10px] text-slate-400 hover:text-slate-700 underline"
                        title="Ajuste rápido del monto"
                      >
                        Ajustar monto
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Categorías sin presupuesto configurado */}
        {categoriesWithSpent.filter((c) => !c.hasBudget).length > 0 && (
          <div className="pt-2">
            <details className="text-xs text-slate-600 group">
              <summary className="cursor-pointer font-bold text-slate-700 hover:text-slate-900 py-1 flex items-center gap-1 select-none">
                <span>+ Ver otras categorías sin presupuesto asignado ({categoriesWithSpent.filter((c) => !c.hasBudget).length})</span>
              </summary>
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoriesWithSpent
                  .filter((c) => !c.hasBudget)
                  .map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{cat.icon || '🏷️'}</span>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-800 truncate block">
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Gastado este mes: {formatCurrency(cat.spent)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditBudget(cat)}
                          className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          + Presupuesto
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategoryModal(cat)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                          title="Editar categoría"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* MODAL EDITAR CATEGORÍA COMPLETA */}
      {categoryToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{modalCatEmoji}</span>
                <h3 className="text-sm font-bold text-slate-900">
                  Editar Categoría: {categoryToEdit.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCategoryToEdit(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedCategory} className="mt-4 space-y-3.5">
              {modalError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  required
                  value={modalCatName}
                  onChange={(e) => setModalCatName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden font-medium"
                />
              </div>

              {/* Presupuesto */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Límite de Presupuesto Mensual ($ USD)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 50.00 (deja vacío si no quieres límite)"
                  value={modalCatBudget}
                  onChange={(e) => setModalCatBudget(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Si dejas el campo vacío o en 0, no tendrá límite asignado.
                </span>
              </div>

              {/* Selector de Emoji */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ícono / Emoji representativo
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 max-h-24 overflow-y-auto">
                  {CATEGORY_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setModalCatEmoji(emoji)}
                      className={`h-8 w-8 rounded-lg text-base flex items-center justify-center transition-transform ${
                        modalCatEmoji === emoji
                          ? 'bg-white shadow-xs scale-110 ring-2 ring-slate-900'
                          : 'hover:bg-slate-200/60'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Color distintivo
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PALETTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setModalCatColor(c)}
                      className={`h-6 w-6 rounded-full transition-transform ${
                        modalCatColor === c ? 'ring-2 ring-slate-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Botones de acción y opción de borrar */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                {onDeleteCategory && (
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(categoryToEdit)}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Eliminar categoría</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setCategoryToEdit(null)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVA CATEGORÍA */}
      {isNewCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Nueva Categoría de Gasto
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCatModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCategory} className="mt-4 space-y-3.5">
              {newCatError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{newCatError}</span>
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Gimnasio, Mascotas, Cursos"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden font-medium"
                />
              </div>

              {/* Presupuesto */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Presupuesto Mensual Inicial ($ USD)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 50.00"
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Selector de Emoji */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ícono / Emoji representativo
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 max-h-24 overflow-y-auto">
                  {CATEGORY_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCatEmoji(emoji)}
                      className={`h-8 w-8 rounded-lg text-base flex items-center justify-center transition-transform ${
                        newCatEmoji === emoji
                          ? 'bg-white shadow-xs scale-110 ring-2 ring-slate-900'
                          : 'hover:bg-slate-200/60'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Color distintivo
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PALETTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={`h-6 w-6 rounded-full transition-transform ${
                        newCatColor === c ? 'ring-2 ring-slate-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewCatModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAR BORRAR CATEGORÍA */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">¿Eliminar esta categoría?</h3>
            <p className="mt-2 text-xs text-slate-600">
              Se eliminará <strong>"{categoryToDelete.name}"</strong> de tu lista de categorías y presupuestos.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
