import { useMemo, useState } from 'react';
import { Category, Movement } from '../types';
import { formatCurrency } from '../utils/formatters';

interface DonutChartProps {
  movements: Movement[];
  categories: Category[];
  currentMonth: string; // YYYY-MM
}

interface SlicedData {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon?: string;
  startAngle: number;
  endAngle: number;
}

export function DonutChart({ movements, categories, currentMonth }: DonutChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Filter expenses for this month and compute slices
  const { slices, totalExpenses } = useMemo(() => {
    const monthExpenses = movements.filter(
      (m) => m.type === 'expense' && m.date.startsWith(currentMonth)
    );

    const total = monthExpenses.reduce((acc, m) => acc + m.amount, 0);
    if (total === 0) {
      return { slices: [], totalExpenses: 0 };
    }

    // Sum by category
    const catMap = new Map<string, number>();
    monthExpenses.forEach((m) => {
      catMap.set(m.category, (catMap.get(m.category) || 0) + m.amount);
    });

    // Map to array and sort descending
    const sorted = Array.from(catMap.entries())
      .map(([name, amount]) => {
        const catConfig = categories.find((c) => c.name === name);
        return {
          name,
          amount,
          percentage: (amount / total) * 100,
          color: catConfig?.color || '#64748b',
          icon: catConfig?.icon || (name === 'Otros' ? '📦' : '🏷️'),
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Group items < 5% into "Otros" as required
    const primaryItems: typeof sorted = [];
    let othersAmount = 0;

    sorted.forEach((item) => {
      if (item.name === 'Otros') {
        othersAmount += item.amount;
      } else if (item.percentage < 5) {
        othersAmount += item.amount;
      } else {
        primaryItems.push(item);
      }
    });

    if (othersAmount > 0) {
      primaryItems.push({
        name: 'Otros',
        amount: othersAmount,
        percentage: (othersAmount / total) * 100,
        color: '#64748b', // Slate neutral color for "Otros"
        icon: '📦',
      });
    }

    // Re-sort to maintain order of mayor a menor
    primaryItems.sort((a, b) => b.amount - a.amount);

    // Calculate angles
    let currentAngle = 0;
    const computedSlices: SlicedData[] = primaryItems.map((item) => {
      const sliceAngle = (item.amount / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;
      return {
        ...item,
        startAngle,
        endAngle,
      };
    });

    return { slices: computedSlices, totalExpenses: total };
  }, [movements, categories, currentMonth]);

  // SVG dimensions
  const size = 240;
  const center = size / 2;
  const radius = 96;
  const innerRadius = 64;

  const createArc = (startAngle: number, endAngle: number, isHovered: boolean) => {
    // If it's a full circle (1 slice with 100%)
    if (endAngle - startAngle >= 2 * Math.PI - 0.001) {
      return `
        M ${center} ${center - (isHovered ? radius + 4 : radius)}
        A ${isHovered ? radius + 4 : radius} ${isHovered ? radius + 4 : radius} 0 1 1 ${center - 0.001} ${center - (isHovered ? radius + 4 : radius)}
        L ${center - 0.001} ${center - innerRadius}
        A ${innerRadius} ${innerRadius} 0 1 0 ${center} ${center - innerRadius}
        Z
      `;
    }

    const currentRadius = isHovered ? radius + 4 : radius;
    const x1 = center + currentRadius * Math.cos(startAngle - Math.PI / 2);
    const y1 = center + currentRadius * Math.sin(startAngle - Math.PI / 2);
    const x2 = center + currentRadius * Math.cos(endAngle - Math.PI / 2);
    const y2 = center + currentRadius * Math.sin(endAngle - Math.PI / 2);

    const ix1 = center + innerRadius * Math.cos(endAngle - Math.PI / 2);
    const iy1 = center + innerRadius * Math.sin(endAngle - Math.PI / 2);
    const ix2 = center + innerRadius * Math.cos(startAngle - Math.PI / 2);
    const iy2 = center + innerRadius * Math.sin(startAngle - Math.PI / 2);

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return `
      M ${x1} ${y1}
      A ${currentRadius} ${currentRadius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${ix1} ${iy1}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}
      Z
    `;
  };

  return (
    <section id="section-donut-chart" className="border-b border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Reparto de gastos</h2>
          <p className="text-xs text-slate-500">
            Ordenado de mayor a menor
          </p>
        </div>
      </div>

      {totalExpenses === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No hay gastos cargados en este mes.
        </div>
      ) : (
        <div className="mt-3 flex flex-col items-center">
          {/* Gráfico SVG Plano */}
          <div className="relative">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="overflow-visible"
            >
              {slices.map((slice) => {
                const isHovered = hoveredCategory === slice.name;
                return (
                  <path
                    key={slice.name}
                    d={createArc(slice.startAngle, slice.endAngle, isHovered)}
                    fill={slice.color}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredCategory(slice.name)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() =>
                      setHoveredCategory(hoveredCategory === slice.name ? null : slice.name)
                    }
                  />
                );
              })}
            </svg>

            {/* Texto central en la dona */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Total gastos
              </span>
              <span className="text-base font-extrabold text-slate-900">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          </div>

          {/* Lista desglosada y legible */}
          <div className="mt-4 w-full divide-y divide-slate-100">
            {slices.map((slice) => {
              const isSelected = hoveredCategory === slice.name;
              return (
                <div
                  key={slice.name}
                  onMouseEnter={() => setHoveredCategory(slice.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() =>
                    setHoveredCategory(hoveredCategory === slice.name ? null : slice.name)
                  }
                  className={`flex cursor-pointer items-center justify-between py-2 text-xs transition-colors ${
                    isSelected ? 'bg-slate-50 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm shrink-0 select-none">{slice.icon || '🏷️'}</span>
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-slate-900">{slice.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(slice.amount)}
                    </span>
                    <span className="w-9 text-right font-medium text-slate-500">
                      {slice.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
