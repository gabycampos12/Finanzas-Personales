import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency, getMonthLabel, shiftMonth } from '../utils/formatters';

interface MonthSummaryProps {
  currentMonth: string; // YYYY-MM
  onMonthChange: (newMonth: string) => void;
  income: number;
  expenses: number;
  todayMonth: string;
}

export function MonthSummary({
  currentMonth,
  onMonthChange,
  income,
  expenses,
  todayMonth,
}: MonthSummaryProps) {
  const remaining = income - expenses;
  const isPositive = remaining >= 0;

  return (
    <section id="section-month-summary" className="border-b border-slate-200 bg-white p-4">
      {/* Selector de mes */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            id="btn-prev-month"
            type="button"
            onClick={() => onMonthChange(shiftMonth(currentMonth, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-sm font-semibold text-slate-800">
            {getMonthLabel(currentMonth)}
          </span>
          <button
            id="btn-next-month"
            type="button"
            onClick={() => onMonthChange(shiftMonth(currentMonth, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {currentMonth !== todayMonth && (
          <button
            id="btn-current-month-jump"
            type="button"
            onClick={() => onMonthChange(todayMonth)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Ir a este mes
          </button>
        )}
      </div>

      {/* LO QUE QUEDA - NÚMERO PROTAGONISTA */}
      <div
        id="card-hero-remaining"
        className={`mt-4 rounded-xl border p-4 text-center ${
          isPositive
            ? 'border-emerald-200 bg-emerald-50/70'
            : 'border-red-200 bg-red-50/70'
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {isPositive ? 'Saldo disponible este mes' : 'Déficit este mes'}
        </span>
        <div
          id="hero-remaining-amount"
          className={`mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl ${
            isPositive ? 'text-emerald-700' : 'text-red-600'
          }`}
        >
          {formatCurrency(remaining)}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {isPositive
            ? 'Disponible para gastar o destinar al ahorro'
            : 'Tus gastos de este mes superaron tus ingresos'}
        </p>
      </div>

      {/* Sub-bloques: Ingresos y Gastos */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div
          id="card-month-income"
          className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span>Ingresos</span>
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {formatCurrency(income)}
          </div>
        </div>

        <div
          id="card-month-expenses"
          className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <TrendingDown className="h-3.5 w-3.5 text-slate-600" />
            <span>Gastos</span>
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {formatCurrency(expenses)}
          </div>
        </div>
      </div>
    </section>
  );
}
