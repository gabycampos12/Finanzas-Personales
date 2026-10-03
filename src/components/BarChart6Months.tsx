import { useMemo, useState } from 'react';
import { Movement } from '../types';
import { formatCurrency } from '../utils/formatters';

interface BarChart6MonthsProps {
  movements: Movement[];
  currentMonth: string; // YYYY-MM
  onSelectMonth?: (monthKey: string) => void;
}

export function BarChart6Months({
  movements,
  currentMonth,
  onSelectMonth,
}: BarChart6MonthsProps) {
  const [selectedBar, setSelectedBar] = useState<string | null>(null);

  // Compute 6 months backwards from currentMonth
  const data = useMemo(() => {
    const [currYear, currMonthNum] = currentMonth.split('-').map(Number);
    const months: { key: string; label: string; income: number; expenses: number }[] = [];

    const monthNamesShort = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currYear, currMonthNum - 1 - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      const label = `${monthNamesShort[d.getMonth()]}`;

      // Sum income and expenses
      let income = 0;
      let expenses = 0;
      movements.forEach((mov) => {
        if (mov.date.startsWith(key)) {
          if (mov.type === 'income') income += mov.amount;
          if (mov.type === 'expense') expenses += mov.amount;
        }
      });

      months.push({ key, label, income, expenses });
    }

    // Maximum value for scaling the bars with 15% headroom
    const peak = Math.max(
      ...months.map((m) => Math.max(m.income, m.expenses)),
      0
    );
    const maxVal = peak > 0 ? peak * 1.15 : 1000;

    return { months, maxVal, peak };
  }, [movements, currentMonth]);

  const activeItem =
    data.months.find((m) => m.key === (selectedBar || currentMonth)) ||
    data.months[data.months.length - 1];
  const diff = activeItem ? activeItem.income - activeItem.expenses : 0;

  return (
    <section id="section-bar-chart-6months" className="border-b border-slate-200 bg-white p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Evolución de los últimos 6 meses</h2>
          <p className="text-xs text-slate-500">Comparativa mensual de ingresos vs. gastos</p>
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
            <span className="text-slate-600 font-medium">Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-700" />
            <span className="text-slate-600 font-medium">Gastos</span>
          </div>
        </div>
      </div>

      {/* Gráfico de barras plano responsive */}
      <div className="mt-4">
        <div className="relative flex h-48 items-end justify-between gap-2 border-b border-slate-200 pb-1 pt-6">
          {/* Línea de guía de referencia superior */}
          {data.peak > 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-6 border-b border-dashed border-slate-200 flex justify-end">
              <span className="text-[10px] text-slate-400 bg-white px-1 -translate-y-1/2">
                {formatCurrency(Math.round(data.maxVal))}
              </span>
            </div>
          )}

          {data.months.map((item) => {
            const incomeHeight = item.income > 0 ? Math.max((item.income / data.maxVal) * 100, 4) : 0;
            const expenseHeight = item.expenses > 0 ? Math.max((item.expenses / data.maxVal) * 100, 4) : 0;
            const isSelected = selectedBar === item.key || currentMonth === item.key;

            return (
              <div
                key={item.key}
                onClick={() => {
                  setSelectedBar(item.key);
                  if (onSelectMonth) onSelectMonth(item.key);
                }}
                className={`group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer rounded-t-lg transition-colors z-10 ${
                  isSelected ? 'bg-slate-100/70 ring-1 ring-slate-300' : 'hover:bg-slate-50/80'
                }`}
              >
                {/* Columnas */}
                <div className="flex w-full items-end justify-center gap-1 px-1 h-full pb-1">
                  {/* Barra Ingreso */}
                  <div
                    style={{ height: `${incomeHeight}%` }}
                    className="w-full max-w-[16px] rounded-t-sm bg-emerald-600 transition-all duration-300 group-hover:brightness-105"
                    title={`Ingresos: ${formatCurrency(item.income)}`}
                  />
                  {/* Barra Gasto */}
                  <div
                    style={{ height: `${expenseHeight}%` }}
                    className="w-full max-w-[16px] rounded-t-sm bg-slate-700 transition-all duration-300 group-hover:brightness-110"
                    title={`Gastos: ${formatCurrency(item.expenses)}`}
                  />
                </div>

                {/* Etiqueta del mes */}
                <span
                  className={`mt-1.5 text-[11px] font-semibold tracking-tight pb-1 ${
                    item.key === currentMonth
                      ? 'text-slate-900 font-bold underline underline-offset-4'
                      : 'text-slate-600'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Detalle del mes seleccionado o activo */}
        {activeItem && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs">
            <div className="text-slate-600 font-medium">
              Mes: <span className="font-bold text-slate-900">{activeItem.label} ({activeItem.key})</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-700 font-semibold">
                +{formatCurrency(activeItem.income)}
              </span>
              <span className="text-slate-700 font-semibold">
                -{formatCurrency(activeItem.expenses)}
              </span>
              <span
                className={`font-black ${
                  diff >= 0 ? 'text-emerald-800' : 'text-red-600'
                }`}
              >
                {diff >= 0 ? 'Quedó:' : 'Déficit:'} {formatCurrency(Math.abs(diff))}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
