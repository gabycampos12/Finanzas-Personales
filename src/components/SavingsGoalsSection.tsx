import { useState, type FormEvent } from 'react';
import { Account, SavingsGoal } from '../types';
import { formatCurrency, formatFullDate, getTodayString } from '../utils/formatters';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Minus,
  PiggyBank,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

interface SavingsGoalsSectionProps {
  goals: SavingsGoal[];
  accounts: Account[];
  onAddGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  onUpdateGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  onDeleteGoal: (id: string) => void;
  onDepositToGoal: (goalId: string, amount: number) => void;
  onWithdrawFromGoal: (goalId: string, amount: number) => void;
}

const GOAL_EMOJIS = [
  '🛡️', '✈️', '💻', '🚗', '🏠', '🏖️', '🎓', '🎁',
  '💍', '📱', '💰', '🚀', '🏕️', '🎸', '👟', '🩺'
];

const GOAL_COLORS = [
  '#059669', // Emerald
  '#0284c7', // Sky
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#ea580c', // Orange
  '#db2777', // Pink
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#e11d48', // Rose
  '#4f46e5', // Indigo
];

export function SavingsGoalsSection({
  goals,
  accounts,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onDepositToGoal,
  onWithdrawFromGoal,
}: SavingsGoalsSectionProps) {
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formCurrentAmount, setFormCurrentAmount] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formIcon, setFormIcon] = useState('🛡️');
  const [formColor, setFormColor] = useState(GOAL_COLORS[0]);
  const [formAccountId, setFormAccountId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  // Quick adjust amount modal (+ Aportar / - Retirar)
  const [adjustModal, setAdjustModal] = useState<{
    goal: SavingsGoal;
    type: 'deposit' | 'withdraw';
  } | null>(null);
  const [adjustAmountStr, setAdjustAmountStr] = useState('');
  const [adjustError, setAdjustError] = useState('');

  // Delete confirm state
  const [deleteConfirmGoal, setDeleteConfirmGoal] = useState<SavingsGoal | null>(null);

  // Calculations
  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const globalPercentage = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
  const completedGoalsCount = goals.filter((g) => g.currentAmount >= g.targetAmount).length;
  const inProgressGoalsCount = goals.length - completedGoalsCount;

  // Filtered goals
  const filteredGoals = goals.filter((g) => {
    const isCompleted = g.currentAmount >= g.targetAmount;
    if (filter === 'in_progress') return !isCompleted;
    if (filter === 'completed') return isCompleted;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setFormName('');
    setFormTargetAmount('');
    setFormCurrentAmount('');
    setFormTargetDate('');
    setFormIcon('🛡️');
    setFormColor(GOAL_COLORS[0]);
    setFormAccountId(accounts[0]?.id || '');
    setFormNote('');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTargetAmount(String(goal.targetAmount));
    setFormCurrentAmount(String(goal.currentAmount));
    setFormTargetDate(goal.targetDate || '');
    setFormIcon(goal.icon || '🛡️');
    setFormColor(goal.color || GOAL_COLORS[0]);
    setFormAccountId(goal.accountId || '');
    setFormNote(goal.note || '');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Por favor ingresa un nombre para la meta');
      return;
    }

    const targetVal = parseFloat(formTargetAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(targetVal) || targetVal <= 0) {
      setFormError('Ingresa un monto objetivo válido mayor a $ 0');
      return;
    }

    const currentVal = formCurrentAmount.trim()
      ? parseFloat(formCurrentAmount.replace(/[^0-9.]/g, ''))
      : 0;

    if (isNaN(currentVal) || currentVal < 0) {
      setFormError('El monto actual debe ser un número válido');
      return;
    }

    if (editingGoal) {
      onUpdateGoal(editingGoal.id, {
        name: cleanName,
        targetAmount: targetVal,
        currentAmount: currentVal,
        targetDate: formTargetDate || undefined,
        icon: formIcon,
        color: formColor,
        accountId: formAccountId || undefined,
        note: formNote.trim() || undefined,
      });
    } else {
      onAddGoal({
        name: cleanName,
        targetAmount: targetVal,
        currentAmount: currentVal,
        targetDate: formTargetDate || undefined,
        icon: formIcon,
        color: formColor,
        accountId: formAccountId || undefined,
        note: formNote.trim() || undefined,
      });
    }

    setIsFormModalOpen(false);
  };

  const handleOpenAdjust = (goal: SavingsGoal, type: 'deposit' | 'withdraw') => {
    setAdjustModal({ goal, type });
    setAdjustAmountStr('');
    setAdjustError('');
  };

  const handleConfirmAdjust = (e: FormEvent) => {
    e.preventDefault();
    if (!adjustModal) return;

    const val = parseFloat(adjustAmountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(val) || val <= 0) {
      setAdjustError('Ingresa un monto válido mayor a $ 0');
      return;
    }

    if (adjustModal.type === 'deposit') {
      onDepositToGoal(adjustModal.goal.id, val);
    } else {
      if (val > adjustModal.goal.currentAmount) {
        setAdjustError(`El retiro no puede superar el monto ahorrado actual (${formatCurrency(adjustModal.goal.currentAmount)})`);
        return;
      }
      onWithdrawFromGoal(adjustModal.goal.id, val);
    }

    setAdjustModal(null);
  };

  const getDaysRemainingText = (targetDate?: string) => {
    if (!targetDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = targetDate.split('-').map(Number);
    const target = new Date(year, month - 1, day);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Fecha límite superada';
    if (diffDays === 0) return 'Fecha límite: Hoy';
    if (diffDays === 1) return 'Falta 1 día';
    return `Faltan ${diffDays} días`;
  };

  return (
    <section id="section-savings-goals" className="bg-white p-4">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h2 className="text-base font-bold text-slate-900">Metas de Ahorro</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Define tus objetivos financieros, registra aportes y monitorea tu progreso en tiempo real
          </p>
        </div>

        <button
          id="btn-add-savings-goal"
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 shrink-0"
        >
          <Plus className="h-4 w-4 text-emerald-400" />
          <span>Nueva Meta</span>
        </button>
      </div>

      {/* Tarjeta de Resumen Global de Ahorro */}
      <div className="mt-4 rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50/80 via-white to-teal-50/50 p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Total Ahorrado en Metas
            </span>
            <div className="mt-0.5 text-2xl font-black text-slate-900">
              {formatCurrency(totalSaved)}
            </div>
            <div className="text-xs text-slate-600">
              de un objetivo global de <strong className="font-semibold text-slate-800">{formatCurrency(totalTarget)}</strong>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{globalPercentage.toFixed(0)}% Alcanzado</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {completedGoalsCount} de {goals.length} metas logradas
            </div>
          </div>
        </div>

        {/* Barra de progreso global */}
        <div className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-emerald-100/70">
          <div
            style={{ width: `${globalPercentage}%` }}
            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
          />
        </div>
      </div>

      {/* Filtros de metas */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({goals.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('in_progress')}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              filter === 'in_progress'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            En curso ({inProgressGoalsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              filter === 'completed'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completadas ({completedGoalsCount})
          </button>
        </div>
      </div>

      {/* Listado de Metas */}
      <div className="mt-3.5 space-y-3">
        {filteredGoals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <PiggyBank className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-2 text-xs font-bold text-slate-700">No hay metas en esta vista</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              {filter !== 'all'
                ? 'Prueba cambiando el filtro a "Todas" o crea tu primera meta.'
                : 'Crea tu primera meta de ahorro haciendo clic en "Nueva Meta" arriba.'}
            </p>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const percentage =
              goal.targetAmount > 0
                ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
                : 0;
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const daysRemainingText = getDaysRemainingText(goal.targetDate);
            const account = accounts.find((a) => a.id === goal.accountId);

            return (
              <div
                key={goal.id}
                id={`goal-card-${goal.id}`}
                className={`rounded-2xl border p-4 transition-all duration-200 ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Cabecera de la tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl select-none shrink-0">{goal.icon || '🎯'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: goal.color || '#059669' }}
                        />
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {goal.name}
                        </h3>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            ¡Lograda!
                          </span>
                        )}
                      </div>

                      {/* Metadatos limpios */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        {account && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Wallet className="h-3 w-3 text-slate-400" />
                            {account.name}
                          </span>
                        )}
                        {account && goal.targetDate && <span>·</span>}
                        {goal.targetDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {formatFullDate(goal.targetDate)}
                            {daysRemainingText && (
                              <strong className="text-slate-600">({daysRemainingText})</strong>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones de edición y borrado */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(goal)}
                      title="Editar meta"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmGoal(goal)}
                      title="Eliminar meta"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Nota opcional */}
                {goal.note && (
                  <p className="mt-2 text-xs text-slate-500 italic bg-slate-50 rounded-lg p-2 border border-slate-100">
                    "{goal.note}"
                  </p>
                )}

                {/* Progreso visual y números */}
                <div className="mt-3.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500">Ahorrado: </span>
                      <strong className="text-sm font-extrabold text-slate-900">
                        {formatCurrency(goal.currentAmount)}
                      </strong>
                      <span className="text-[11px] text-slate-400"> de {formatCurrency(goal.targetAmount)}</span>
                    </div>

                    <div className="text-right font-extrabold text-xs text-slate-800">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: goal.color || (isCompleted ? '#059669' : '#0284c7'),
                      }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    {isCompleted ? (
                      <span className="font-semibold text-emerald-700">
                        🎉 ¡Felicidades! Meta completada con éxito.
                      </span>
                    ) : (
                      <span>
                        Faltan <strong className="font-semibold text-slate-700">{formatCurrency(remaining)}</strong> para alcanzarla
                      </span>
                    )}
                  </div>
                </div>

                {/* Botones de acción rápida: Aportar / Retirar */}
                <div className="mt-3.5 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleOpenAdjust(goal, 'deposit')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>+ Aportar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAdjust(goal, 'withdraw')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5 text-slate-500" />
                    <span>- Retirar</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL CREAR / EDITAR META */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingGoal ? 'Editar Meta de Ahorro' : 'Crear Nueva Meta de Ahorro'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="mt-4 space-y-3.5">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nombre de la meta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Fondo de emergencia, Viaje a España, Comprar auto"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Montos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Monto Objetivo ($) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="Ej: 1000"
                    value={formTargetAmount}
                    onChange={(e) => setFormTargetAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Monto ya ahorrado ($)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={formCurrentAmount}
                    onChange={(e) => setFormCurrentAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Fecha límite y Cuenta */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Fecha objetivo (opcional)
                  </label>
                  <input
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Cuenta asignada (opcional)
                  </label>
                  <select
                    value={formAccountId}
                    onChange={(e) => setFormAccountId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
                  >
                    <option value="">Sin cuenta asignada</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selector de Emoji */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ícono representativo
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 max-h-24 overflow-y-auto">
                  {GOAL_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormIcon(emoji)}
                      className={`h-8 w-8 rounded-lg text-base flex items-center justify-center transition-transform ${
                        formIcon === emoji
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
                <div className="flex items-center gap-2">
                  {GOAL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`h-6 w-6 rounded-full transition-transform ${
                        formColor === c ? 'ring-2 ring-slate-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Nota */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nota o motivación
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ahorro para imprevistos o fondo de tranquilidad"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  {editingGoal ? 'Guardar Cambios' : 'Crear Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL APORTAR / RETIRAR */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{adjustModal.goal.icon || '🎯'}</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {adjustModal.type === 'deposit' ? 'Aportar a la meta' : 'Retirar de la meta'}
                  </h3>
                  <div className="text-[11px] text-slate-500">{adjustModal.goal.name}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjust} className="mt-4 space-y-3">
              {adjustError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{adjustError}</span>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100 flex justify-between">
                <span>Ahorro actual:</span>
                <strong className="font-bold text-slate-900">
                  {formatCurrency(adjustModal.goal.currentAmount)}
                </strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {adjustModal.type === 'deposit' ? 'Monto a Aportar ($ USD)' : 'Monto a Retirar ($ USD)'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  required
                  placeholder="Ej: 50.00"
                  value={adjustAmountStr}
                  onChange={(e) => setAdjustAmountStr(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModal(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors ${
                    adjustModal.type === 'deposit'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {adjustModal.type === 'deposit' ? 'Confirmar Aporte' : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMACIÓN BORRAR META */}
      {deleteConfirmGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">¿Eliminar esta meta de ahorro?</h3>
            <p className="mt-2 text-xs text-slate-600">
              Se eliminará la meta <strong>"{deleteConfirmGoal.name}"</strong> con{' '}
              {formatCurrency(deleteConfirmGoal.currentAmount)} ahorrados. Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmGoal(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteGoal(deleteConfirmGoal.id);
                  setDeleteConfirmGoal(null);
                }}
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
