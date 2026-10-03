import { useEffect, useState, type FormEvent } from 'react';
import { Category } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';

interface CategoriesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  initialTab?: 'expense' | 'income';
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>, oldName?: string) => void;
  onDeleteCategory: (id: string) => void;
}

const PALETTE_COLORS = [
  '#059669', // Emerald
  '#d97706', // Amber
  '#0284c7', // Sky
  '#4f46e5', // Indigo
  '#db2777', // Pink
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#64748b', // Slate
  '#84cc16', // Lime
  '#e11d48', // Rose
  '#f97316', // Warm Orange
  '#14b8a6', // Bright Teal
  '#dc2626', // Red
  '#4338ca', // Deep Indigo
];

const EXPENSE_EMOJIS = [
  '🛒', '👦', '🌐', '🎒', '💊', '🧴', '⚠️', '📱',
  '💳', '🔥', '⛽', '🏠', '🍔', '🎉', '📚', '🤲',
  '📺', '🛍️', '💵', '✈️', '✨', '🎁', '💰', '☕',
  '🏋️', '🐾', '💡', '🎮', '🍿', '🔧', '🩺', '🏷️'
];

const INCOME_EMOJIS = [
  '💵', '💰', '💻', '📈', '🏷️', '🎁', '🏦', '🪙',
  '💼', '💳', '📊', '🤝', '💎', '🛒', '🏠', '✨'
];

export function CategoriesManagerModal({
  isOpen,
  onClose,
  categories,
  initialTab = 'expense',
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoriesManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>(initialTab);

  // New category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🛒');
  const [newCatColor, setNewCatColor] = useState(PALETTE_COLORS[0]);
  const [newCatBudget, setNewCatBudget] = useState('');
  const [error, setError] = useState('');

  // Editing state for an existing category
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('🏷️');
  const [editColor, setEditColor] = useState(PALETTE_COLORS[0]);
  const [editBudget, setEditBudget] = useState('');
  const [editError, setEditError] = useState('');

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setEditingCatId(null);
      setError('');
      setEditError('');
      setNewCatName('');
      setNewCatBudget('');
      setNewCatEmoji(initialTab === 'income' ? '💵' : '🛒');
      setNewCatColor(initialTab === 'income' ? '#059669' : PALETTE_COLORS[0]);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const expenseCategories = categories.filter((c) => c.type !== 'income');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const currentList = activeTab === 'income' ? incomeCategories : expenseCategories;
  const currentEmojis = activeTab === 'income' ? INCOME_EMOJIS : EXPENSE_EMOJIS;

  const handleTabChange = (tab: 'expense' | 'income') => {
    setActiveTab(tab);
    setEditingCatId(null);
    setError('');
    setEditError('');
    setNewCatName('');
    setNewCatBudget('');
    setNewCatEmoji(tab === 'income' ? '💵' : '🛒');
    setNewCatColor(tab === 'income' ? '#059669' : PALETTE_COLORS[0]);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditEmoji(cat.icon || (cat.type === 'income' ? '💵' : '🏷️'));
    setEditColor(cat.color);
    setEditBudget(cat.monthlyBudget ? String(cat.monthlyBudget) : '');
    setEditError('');
  };

  const handleCancelEdit = () => {
    setEditingCatId(null);
    setEditError('');
  };

  const handleSaveEdit = (cat: Category) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('El nombre no puede quedar vacío');
      return;
    }
    const collision = categories.some(
      (c) => c.id !== cat.id && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (collision) {
      setEditError('Ya existe otra categoría con ese nombre');
      return;
    }

    const budgetVal = parseFloat(editBudget.replace(/[^0-9.]/g, ''));
    const finalBudget = !isNaN(budgetVal) && budgetVal > 0 ? budgetVal : undefined;

    onUpdateCategory(
      cat.id,
      {
        name: trimmed,
        icon: editEmoji.trim() || (cat.type === 'income' ? '💵' : '🏷️'),
        color: editColor,
        monthlyBudget: finalBudget,
        type: cat.type || activeTab,
      },
      cat.name
    );

    setEditingCatId(null);
    setEditError('');
  };

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setError('Escribe un nombre para la categoría');
      return;
    }
    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setError('Ya existe una categoría con ese nombre');
      return;
    }

    const budgetVal = parseFloat(newCatBudget.replace(/[^0-9.]/g, ''));

    onAddCategory({
      name: trimmed,
      type: activeTab,
      icon: newCatEmoji.trim() || (activeTab === 'income' ? '💵' : '🛒'),
      color: newCatColor,
      monthlyBudget: !isNaN(budgetVal) && budgetVal > 0 ? budgetVal : undefined,
    });

    setNewCatName('');
    setNewCatEmoji(activeTab === 'income' ? '💵' : '🛒');
    setNewCatBudget('');
    setError('');
  };

  return (
    <div
      id="modal-categories-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        id="modal-categories-content"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 shadow-2xl"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Administrar categorías</h3>
            <p className="text-xs text-slate-500">
              Personaliza los nombres, emojis, colores y presupuestos
            </p>
          </div>
          <button
            id="btn-close-categories-modal"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pestañas Gastos vs Ingresos */}
        <div className="mt-3 flex rounded-xl bg-slate-100 p-1">
          <button
            id="tab-categories-expenses"
            type="button"
            onClick={() => handleTabChange('expense')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'expense'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Gastos ({expenseCategories.length})
          </button>
          <button
            id="tab-categories-incomes"
            type="button"
            onClick={() => handleTabChange('income')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'income'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ingresos ({incomeCategories.length})
          </button>
        </div>

        {/* Lista de categorías existentes */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {activeTab === 'expense' ? 'Categorías de gastos' : 'Categorías de ingresos'} ({currentList.length})
            </label>
            <span className="text-[11px] text-slate-400">
              {activeTab === 'expense' ? 'Montos mensuales' : 'Metas estimadas'}
            </span>
          </div>

          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {currentList.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No hay categorías de {activeTab === 'expense' ? 'gasto' : 'ingreso'}. Agrega una abajo.
              </div>
            ) : (
              currentList.map((cat) => {
                const isEditing = editingCatId === cat.id;

                if (isEditing) {
                  return (
                    <div
                      key={cat.id}
                      id={`category-edit-box-${cat.id}`}
                      className="bg-slate-50 p-3 text-xs space-y-2.5 border-l-4 border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1/3">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Emoji
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-base">
                              {editEmoji || '🏷️'}
                            </span>
                            <input
                              type="text"
                              value={editEmoji}
                              onChange={(e) => setEditEmoji(e.target.value)}
                              maxLength={4}
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-center text-xs font-semibold text-slate-800 focus:border-slate-800 focus:outline-none"
                              placeholder="Emoji"
                            />
                          </div>
                        </div>

                        <div className="w-2/3">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Nombre
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => {
                              setEditName(e.target.value);
                              setEditError('');
                            }}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-slate-800 focus:outline-none"
                            placeholder="Nombre categoría"
                          />
                        </div>
                      </div>

                      {editError && <p className="text-xs text-red-600">{editError}</p>}

                      {/* Emojis rápidos */}
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">
                          Elegir emoji rápido
                        </label>
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
                          {currentEmojis.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => setEditEmoji(em)}
                              className={`flex h-6 w-6 items-center justify-center rounded text-xs transition-transform hover:bg-slate-100 ${
                                editEmoji === em ? 'bg-slate-200 ring-1 ring-slate-800 font-bold' : ''
                              }`}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {activeTab === 'expense'
                            ? 'Presupuesto mensual ($ USD)'
                            : 'Meta mensual estimada ($ USD, opcional)'}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editBudget}
                          onChange={(e) => setEditBudget(e.target.value)}
                          placeholder="Sin límite"
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Color
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {PALETTE_COLORS.map((col) => (
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
                          onClick={handleCancelEdit}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Cancelar
                        </button>
                        <button
                          id={`btn-save-cat-${cat.id}`}
                          type="button"
                          onClick={() => handleSaveEdit(cat)}
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
                    key={cat.id}
                    id={`category-row-${cat.id}`}
                    className="flex items-center justify-between p-2.5 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-base shrink-0 select-none">
                        {cat.icon || (cat.type === 'income' ? '💵' : '🏷️')}
                      </span>
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-slate-800 truncate">{cat.name}</span>
                      {cat.monthlyBudget ? (
                        <span className="text-[11px] text-slate-500 shrink-0 font-medium">
                          ({formatCurrency(cat.monthlyBudget)})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic shrink-0">
                          {activeTab === 'expense' ? 'Sin límite' : 'Sin meta'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        id={`btn-edit-category-${cat.id}`}
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        title="Editar nombre, emoji y presupuesto"
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {currentList.length > 1 && (
                        <button
                          id={`btn-delete-category-${cat.id}`}
                          type="button"
                          onClick={() => onDeleteCategory(cat.id)}
                          title="Eliminar categoría"
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Formulario para agregar una nueva categoría */}
        <form onSubmit={handleAdd} className="mt-5 border-t border-slate-100 pt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            {activeTab === 'expense' ? 'Agregar categoría de gasto' : 'Agregar categoría de ingreso'}
          </label>

          <div className="mt-2 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-1/3">
                <label className="block text-[11px] text-slate-500 mb-1">Emoji</label>
                <div className="flex items-center gap-1">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-base">
                    {newCatEmoji || (activeTab === 'income' ? '💵' : '🛒')}
                  </span>
                  <input
                    type="text"
                    value={newCatEmoji}
                    onChange={(e) => setNewCatEmoji(e.target.value)}
                    maxLength={4}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-center text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                    placeholder="Emoji"
                  />
                </div>
              </div>

              <div className="w-2/3">
                <label className="block text-[11px] text-slate-500 mb-1">Nombre</label>
                <input
                  id="input-new-cat-name"
                  type="text"
                  placeholder={
                    activeTab === 'expense'
                      ? 'Ej. Supermercado, Mascotas...'
                      : 'Ej. Sueldo, Clientes, Inversiones...'
                  }
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    setError('');
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}

            <div>
              <label className="block text-[10px] text-slate-500 mb-1">
                Elegir emoji rápido
              </label>
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
                {currentEmojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setNewCatEmoji(em)}
                    className={`flex h-6 w-6 items-center justify-center rounded text-xs transition-transform hover:bg-slate-100 ${
                      newCatEmoji === em ? 'bg-slate-200 ring-1 ring-slate-800 font-bold' : ''
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500">Color distintivo</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {PALETTE_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewCatColor(col)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform ${
                      newCatColor === col ? 'scale-110 ring-2 ring-slate-800' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: col }}
                  >
                    {newCatColor === col && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500">
                {activeTab === 'expense'
                  ? 'Presupuesto mensual opcional ($ USD)'
                  : 'Meta mensual estimada ($ USD, opcional)'}
              </label>
              <input
                id="input-new-cat-budget"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={newCatBudget}
                onChange={(e) => setNewCatBudget(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
              />
            </div>

            <button
              id="btn-submit-new-category"
              type="submit"
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white transition-colors ${
                activeTab === 'income'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>
                {activeTab === 'expense'
                  ? 'Agregar categoría de gasto'
                  : 'Agregar categoría de ingreso'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
