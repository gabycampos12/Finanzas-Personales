import React from 'react';
import {
  ArrowLeftRight,
  CalendarClock,
  LayoutDashboard,
  PiggyBank,
  Sliders,
  Wallet,
} from 'lucide-react';

export type TabType = 'dashboard' | 'movements' | 'accounts' | 'budgets' | 'savings' | 'bills';

interface TabsNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  movementsCount?: number;
  accountsCount?: number;
  urgentBillsCount?: number;
  exceededBudgetsCount?: number;
  savingsGoalsCount?: number;
}

export function TabsNavigation({
  activeTab,
  onTabChange,
  movementsCount,
  accountsCount,
  urgentBillsCount,
  exceededBudgetsCount,
  savingsGoalsCount,
}: TabsNavigationProps) {
  const tabs: {
    id: TabType;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string | null;
    badgeVariant?: 'neutral' | 'warning' | 'info';
  }[] = [
    {
      id: 'dashboard',
      label: 'Resumen',
      shortLabel: 'Resumen',
      icon: LayoutDashboard,
    },
    {
      id: 'movements',
      label: 'Movimientos',
      shortLabel: 'Movimientos',
      icon: ArrowLeftRight,
      badge: movementsCount !== undefined && movementsCount > 0 ? movementsCount : null,
      badgeVariant: 'neutral',
    },
    {
      id: 'accounts',
      label: 'Cuentas',
      shortLabel: 'Cuentas',
      icon: Wallet,
      badge: accountsCount !== undefined && accountsCount > 0 ? accountsCount : null,
      badgeVariant: 'neutral',
    },
    {
      id: 'budgets',
      label: 'Presupuesto',
      shortLabel: 'Presup.',
      icon: Sliders,
      badge:
        exceededBudgetsCount !== undefined && exceededBudgetsCount > 0
          ? `${exceededBudgetsCount}!`
          : null,
      badgeVariant: 'warning',
    },
    {
      id: 'savings',
      label: 'Metas Ahorro',
      shortLabel: 'Ahorro',
      icon: PiggyBank,
      badge: savingsGoalsCount !== undefined && savingsGoalsCount > 0 ? savingsGoalsCount : null,
      badgeVariant: 'neutral',
    },
    {
      id: 'bills',
      label: 'Vencimientos',
      shortLabel: 'Facturas',
      icon: CalendarClock,
      badge:
        urgentBillsCount !== undefined && urgentBillsCount > 0
          ? urgentBillsCount
          : null,
      badgeVariant: 'warning',
    },
  ];

  return (
    <nav
      id="main-tabs-navigation"
      aria-label="Pestañas de navegación principal"
      className="sticky top-[53px] z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between overflow-x-auto no-scrollbar px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex w-full items-center gap-1 sm:gap-1.5 min-w-max sm:min-w-0" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-1 min-w-[62px] sm:min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-150 select-none ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/70'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="hidden sm:inline truncate">{tab.label}</span>
                <span className="inline sm:hidden truncate">{tab.shortLabel}</span>

                {/* Badge opcional discreto */}
                {tab.badge !== null && tab.badge !== undefined && (
                  <span
                    className={`ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold leading-none shrink-0 ${
                      isActive
                        ? tab.badgeVariant === 'warning'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-700 text-slate-200'
                        : tab.badgeVariant === 'warning'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
