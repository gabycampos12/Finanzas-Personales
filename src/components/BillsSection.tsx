import { useState, type FormEvent } from 'react';
import { Category, RecurringBill } from '../types';
import { formatCurrency, formatFullDate, getTodayString } from '../utils/formatters';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Plus,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';

interface BillsSectionProps {
  bills: RecurringBill[];
  categories: Category[];
  onAddBill: (bill: Omit<RecurringBill, 'id'>) => void;
  onUpdateBill: (id: string, updates: Partial<RecurringBill>) => void;
  onDeleteBill: (id: string) => void;
  onMarkAsPaid: (bill: RecurringBill) => void;
}

export function BillsSection({
  bills,
  categories,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onMarkAsPaid,
}: BillsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState(getTodayString());
  const [formLastPaidDate, setFormLastPaidDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  const expenseCategories = categories.filter((c) => c.type !== 'income');

  const getDaysRemaining = (dueDateStr: string) => {
    if (!dueDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = dueDateStr.split('-').map(Number);
    const due = new Date(year, month - 1, day);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleOpenAdd = () => {
    setEditingBillId(null);
    setFormName('');
    setFormCategory(expenseCategories[0]?.name || 'Internet');
    setFormAmount('');
    setFormDueDate(getTodayString());
    setFormLastPaidDate('');
    setFormNote('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (bill: RecurringBill) => {
    setEditingBillId(bill.id);
    setFormName(bill.name);
    setFormCategory(bill.category);
    setFormAmount(String(bill.amount));
    setFormDueDate(bill.dueDate);
    setFormLastPaidDate(bill.lastPaidDate || '');
    setFormNote(bill.note || '');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBillId(null);
    setFormError('');
  };

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Por favor ingresa un nombre para la factura o pago');
      return;
    }

    const cleanAmount = parseFloat(formAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setFormError('Ingresa un monto válido mayor a 0');
      return;
    }

    if (!formDueDate) {
      setFormError('Selecciona la fecha en que debes pagar');
      return;
    }

    if (editingBillId) {
      onUpdateBill(editingBillId, {
        name: cleanName,
        category: formCategory,
        amount: cleanAmount,
        dueDate: formDueDate,
        lastPaidDate: formLastPaidDate.trim() || undefined,
        note: formNote.trim() || undefined,
      });
    } else {
      onAddBill({
        name: cleanName,
        category: formCategory,
        amount: cleanAmount,
        dueDate: formDueDate,
        lastPaidDate: formLastPaidDate.trim() || undefined,
        note: formNote.trim() || undefined,
      });
    }

    handleCloseForm();
  };

  // Sort bills by due date ascending
  const sortedBills = [...bills].sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));
  const totalBillsAmount = bills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <section id="section-bills" className="border-b border-slate-200 bg-white p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">Facturas y Pagos del Mes</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Controla tus vencimientos, días restantes y el último pago realizado
          </p>
        </div>

        <button
          id="btn-add-bill"
          type="button"
          onClick={handleOpenAdd}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Agregar pago</span>
        </button>
      </div>

      {/* Resumen de totales */}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-xs">
        <div>
          <span className="text-slate-500">Total en facturas programadas:</span>
          <span className="ml-1.5 font-bold text-slate-900">{formatCurrency(totalBillsAmount)}</span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-slate-600">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>{bills.length} pagos registrados</span>
        </div>
      </div>

      {/* Lista de facturas y pagos */}
      <div className="mt-3 space-y-2.5">
        {sortedBills.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            No tienes pagos o facturas programadas. Haz clic en "+ Agregar pago" para registrar tus servicios.
          </div>
        ) : (
          sortedBills.map((bill) => {
            const daysRemaining = getDaysRemaining(bill.dueDate);
            const categoryObj = categories.find((c) => c.name === bill.category);
            const categoryColor = categoryObj?.color || '#64748b';
            const categoryIcon = categoryObj?.icon || '🏷️';

            // Status badge styling
            let statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            let statusText = `Faltan ${daysRemaining} días`;
            let isUrgent = false;

            if (daysRemaining < 0) {
              statusBadgeClass = 'bg-red-50 text-red-700 border-red-200 font-bold';
              statusText = `Vencido hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) > 1 ? 's' : ''}`;
              isUrgent = true;
            } else if (daysRemaining === 0) {
              statusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse';
              statusText = '¡Vence hoy!';
              isUrgent = true;
            } else if (daysRemaining === 1) {
              statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
              statusText = 'Vence mañana';
            } else if (daysRemaining <= 3) {
              statusBadgeClass = 'bg-orange-50 text-orange-800 border-orange-200 font-semibold';
              statusText = `Faltan ${daysRemaining} días`;
            }

            return (
              <div
                key={bill.id}
                id={`bill-card-${bill.id}`}
                className={`rounded-xl border p-3 text-xs transition-colors ${
                  isUrgent ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-white'
                }`}
              >
                {/* Fila principal */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-base select-none">{categoryIcon}</span>
                      <span
                        className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: categoryColor }}
                      >
                        {bill.category}
                      </span>
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {bill.name}
                      </h3>
                    </div>
                    {bill.note && (
                      <p className="mt-0.5 text-[11px] text-slate-500 truncate">{bill.note}</p>
                    )}
                  </div>

                  {/* Monto y Días Restantes */}
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {formatCurrency(bill.amount)}
                    </div>
                    <span
                      className={`inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[10px] ${statusBadgeClass}`}
                    >
                      {statusText}
                    </span>
                  </div>
                </div>

                {/* Fechas de pago: Próximo pago y Último pago */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      <strong className="text-slate-700">Próximo pago:</strong>{' '}
                      {formatFullDate(bill.dueDate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500">
                    <span>
                      <strong className="text-slate-600">Último pago:</strong>{' '}
                      {bill.lastPaidDate ? formatFullDate(bill.lastPaidDate) : 'Sin registrar'}
                    </span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-slate-50">
                  <button
                    id={`btn-mark-paid-${bill.id}`}
                    type="button"
                    onClick={() => onMarkAsPaid(bill)}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Marcar como pagado</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-edit-bill-${bill.id}`}
                      type="button"
                      onClick={() => handleOpenEdit(bill)}
                      title="Modificar factura o pago"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      id={`btn-delete-bill-${bill.id}`}
                      type="button"
                      onClick={() => onDeleteBill(bill.id)}
                      title="Eliminar factura"
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

      {/* Modal / Formulario para Agregar o Editar Factura */}
      {isFormOpen && (
        <div
          id="modal-bill-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            id="modal-bill-content"
            className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingBillId ? 'Editar factura o pago' : 'Nueva factura o pago'}
                </h3>
                <p className="text-xs text-slate-500">
                  Indica el servicio, monto, fecha de vencimiento y último pago
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="mt-4 space-y-3">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre del servicio o factura
                </label>
                <input
                  id="input-bill-name"
                  type="text"
                  placeholder="Ej. Internet, Colegio Matías, Tarjeta TDC, Alquiler..."
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormError('');
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                />
              </div>

              {/* Categoría y Monto */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Categoría
                  </label>
                  <select
                    id="select-bill-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.icon ? `${c.icon} ` : ''}{c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Monto ($ USD)
                  </label>
                  <input
                    id="input-bill-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={formAmount}
                    onChange={(e) => {
                      setFormAmount(e.target.value);
                      setFormError('');
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fecha de próximo pago / vencimiento */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fecha del próximo pago (vencimiento)
                </label>
                <input
                  id="input-bill-due-date"
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                />
              </div>

              {/* Fecha del último pago realizado */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fecha del último pago realizado (opcional)
                </label>
                <input
                  id="input-bill-last-paid-date"
                  type="date"
                  value={formLastPaidDate}
                  onChange={(e) => setFormLastPaidDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                />
              </div>

              {/* Nota opcional */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nota o concepto (opcional)
                </label>
                <input
                  id="input-bill-note"
                  type="text"
                  placeholder="Ej. Pago con transferencia o tarjeta"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Botones de guardar / cancelar */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-bill-submit"
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {editingBillId ? 'Guardar cambios' : 'Agregar factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
