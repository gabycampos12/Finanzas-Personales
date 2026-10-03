import { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Account, Category, Movement, MovementType, RecurringBill, SavingsGoal } from './types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_BILLS,
  DEFAULT_CATEGORIES,
  DEFAULT_SAVINGS_GOALS,
  INITIAL_MOVEMENTS,
} from './data/initialData';
import { initAuth } from './services/firebaseAuth';
import { Navbar } from './components/Navbar';
import { MonthSummary } from './components/MonthSummary';
import { DonutChart } from './components/DonutChart';
import { BarChart6Months } from './components/BarChart6Months';
import { BudgetList } from './components/BudgetList';
import { BillsSection } from './components/BillsSection';
import { AccountsSection } from './components/AccountsSection';
import { MovementsList } from './components/MovementsList';
import { SavingsGoalsSection } from './components/SavingsGoalsSection';
import { QuickAddModal } from './components/QuickAddModal';
import { CategoriesManagerModal } from './components/CategoriesManagerModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { SupabaseModal } from './components/SupabaseModal';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { TabsNavigation, TabType } from './components/TabsNavigation';
import { exportAllDataToExcelCsv } from './utils/exportToExcel';
import { formatCurrency, getMonthLabel } from './utils/formatters';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  PiggyBank,
  Plus,
  Sliders,
  Target,
  Wallet,
} from 'lucide-react';

const STORAGE_KEY_MOVEMENTS = 'fp_movements_usd_v3';
const STORAGE_KEY_CATEGORIES = 'fp_categories_usd_v3';
const STORAGE_KEY_ACCOUNTS = 'fp_accounts_usd_v4';
const STORAGE_KEY_BILLS = 'fp_bills_usd_v1';
const STORAGE_KEY_SAVINGS_GOALS = 'fp_savings_goals_usd_v1';
const STORAGE_KEY_ACTIVE_TAB = 'fp_active_tab_v2';

export default function App() {
  // Load state from localStorage or use initial rich sample data in USD
  const [movements, setMovements] = useState<Movement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_MOVEMENTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const BANNED_CATEGORIES = ['mesada', 'colegio', 'tdc', 'skincare'];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      let list: Category[] = [];
      if (saved) {
        const parsed: Category[] = JSON.parse(saved);
        list = parsed.map((cat) => {
          if (cat.icon) return cat;
          const match = DEFAULT_CATEGORIES.find(
            (d) => d.name.toLowerCase() === cat.name.toLowerCase()
          );
          return { ...cat, icon: match?.icon || (cat.type === 'income' ? '💵' : '🏷️') };
        });
      } else {
        list = [...DEFAULT_CATEGORIES];
      }

      // Eliminar categorías solicitadas por el usuario: mesada, colegio, tdc, skincare
      list = list.filter((c) => !BANNED_CATEGORIES.includes(c.name.toLowerCase().trim()));

      // Ajustar a $20 el presupuesto de la categoría Matías
      list = list.map((c) => {
        const normalized = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalized === 'matias') {
          return { ...c, monthlyBudget: 20 };
        }
        return c;
      });

      // Crear o verificar la categoría Deudas con $10 de presupuesto
      const hasDeudas = list.some((c) => c.name.toLowerCase().trim() === 'deudas');
      if (!hasDeudas) {
        list.push({
          id: 'cat-deudas',
          name: 'Deudas',
          type: 'expense',
          icon: '💳',
          color: '#e11d48',
          monthlyBudget: 10,
          isDefault: true,
        });
      }

      return list;
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CATEGORIES;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (saved) {
        const parsed: Account[] = JSON.parse(saved);
        return parsed.map((a) => (a.name.toLowerCase() === 'aritm' ? { ...a, name: 'Airtm' } : a));
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ACCOUNTS;
  });

  const [bills, setBills] = useState<RecurringBill[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BILLS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_BILLS;
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVINGS_GOALS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SAVINGS_GOALS;
  });

  // Current month being inspected (defaults to today's month, e.g. "2026-09")
  const todayMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [currentMonth, setCurrentMonth] = useState<string>(todayMonth);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
      if (
        saved &&
        ['dashboard', 'movements', 'accounts', 'budgets', 'savings', 'bills'].includes(saved)
      ) {
        return saved as TabType;
      }
    } catch (e) {
      console.error(e);
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTab);
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

  // Auth state for Google Sheets
  const [user, setUser] = useState<User | null>(null);

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<MovementType>('expense');
  const [movementToEdit, setMovementToEdit] = useState<Movement | null>(null);

  const [isCategoriesManagerOpen, setIsCategoriesManagerOpen] = useState(false);
  const [categoriesModalTab, setCategoriesModalTab] = useState<'expense' | 'income'>('expense');

  const handleOpenCategoriesManager = (tab: 'expense' | 'income' = 'expense') => {
    setCategoriesModalTab(tab);
    setIsCategoriesManagerOpen(true);
  };
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Confirmation dialogs
  const [deleteConfirmMovement, setDeleteConfirmMovement] = useState<Movement | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
    } catch (e) {
      console.error(e);
    }
  }, [movements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error(e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
      console.error(e);
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(bills));
    } catch (e) {
      console.error(e);
    }
  }, [bills]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVINGS_GOALS, JSON.stringify(savingsGoals));
    } catch (e) {
      console.error(e);
    }
  }, [savingsGoals]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = initAuth((currentUser) => {
      setUser(currentUser);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Compute month totals for currentMonth
  const { monthIncome, monthExpenses } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    movements.forEach((m) => {
      if (m.date.startsWith(currentMonth)) {
        if (m.type === 'income') inc += m.amount;
        if (m.type === 'expense') exp += m.amount;
      }
    });
    return { monthIncome: inc, monthExpenses: exp };
  }, [movements, currentMonth]);

  // Accounts with computed real-time balances
  const accountsWithBalances = useMemo(() => {
    return accounts.map((acc) => {
      let balance = acc.initialBalance;
      movements.forEach((mov) => {
        if (mov.type === 'income' && mov.accountId === acc.id) {
          balance += mov.amount;
        } else if (mov.type === 'expense' && mov.accountId === acc.id) {
          balance -= mov.amount;
        } else if (mov.type === 'transfer') {
          if (mov.accountId === acc.id) balance -= mov.amount;
          if (mov.toAccountId === acc.id) balance += (mov.amount - (mov.fee || 0));
        }
      });
      return { ...acc, balance };
    });
  }, [accounts, movements]);

  // Computed badge numbers and stats for tabs and dashboard hub
  const movementsInMonthCount = useMemo(() => {
    return movements.filter((m) => m.date.startsWith(currentMonth)).length;
  }, [movements, currentMonth]);

  const totalCapitalBalance = useMemo(() => {
    return accountsWithBalances.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accountsWithBalances]);

  const totalSavedInGoals = useMemo(() => {
    return savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  }, [savingsGoals]);

  const activeSavingsGoalsCount = useMemo(() => {
    return savingsGoals.filter((g) => g.currentAmount < g.targetAmount).length || savingsGoals.length;
  }, [savingsGoals]);

  const urgentBillsCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bills.filter((b) => {
      if (!b.dueDate) return false;
      const [y, m, d] = b.dueDate.split('-').map(Number);
      const due = new Date(y, m - 1, d);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 5;
    }).length;
  }, [bills]);

  const { budgetedCategoriesCount, exceededBudgetsCount } = useMemo(() => {
    const expenseCategories = categories.filter((c) => c.type !== 'income');
    let budgeted = 0;
    let exceeded = 0;
    expenseCategories.forEach((cat) => {
      const budget = cat.monthlyBudget || 0;
      if (budget > 0) {
        budgeted++;
        const spent = movements
          .filter(
            (m) =>
              m.type === 'expense' &&
              m.category === cat.name &&
              m.date.startsWith(currentMonth)
          )
          .reduce((sum, m) => sum + m.amount, 0);
        if (spent > budget) exceeded++;
      }
    });
    return { budgetedCategoriesCount: budgeted, exceededBudgetsCount: exceeded };
  }, [categories, movements, currentMonth]);

  // --- Handlers ---
  const handleOpenAdd = (type: MovementType) => {
    setMovementToEdit(null);
    setQuickAddType(type);
    setIsQuickAddOpen(true);
  };

  const handleSaveMovement = (
    movData: Omit<Movement, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    if (editingId) {
      setMovements((prev) =>
        prev.map((m) =>
          m.id === editingId
            ? { ...m, ...movData }
            : m
        )
      );
    } else {
      const newMovement: Movement = {
        ...movData,
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: Date.now(),
      };
      setMovements((prev) => [newMovement, ...prev]);
    }
  };

  const handleEditMovement = (mov: Movement) => {
    setMovementToEdit(mov);
    setQuickAddType(mov.type);
    setIsQuickAddOpen(true);
  };

  const handleDeleteMovementConfirm = () => {
    if (deleteConfirmMovement) {
      setMovements((prev) => prev.filter((m) => m.id !== deleteConfirmMovement.id));
      setDeleteConfirmMovement(null);
    }
  };

  const handleTransfer = (transferData: {
    amount: number;
    fromAccountId: string;
    toAccountId: string;
    date: string;
    fee?: number;
    note?: string;
  }) => {
    const newMovement: Movement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'transfer',
      amount: transferData.amount,
      category: 'Transferencia',
      accountId: transferData.fromAccountId,
      toAccountId: transferData.toAccountId,
      date: transferData.date,
      fee: transferData.fee,
      note: transferData.note,
      createdAt: Date.now(),
    };
    setMovements((prev) => [newMovement, ...prev]);
  };

  const handleUpdateCategoryBudget = (categoryId: string, newBudget: number | undefined) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, monthlyBudget: newBudget } : c))
    );
  };

  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const cat: Category = {
      ...newCat,
      id: `cat-${Date.now()}`,
    };
    setCategories((prev) => [...prev, cat]);
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>, oldName?: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    // Si se editó el nombre de la categoría, actualizamos todos los movimientos asociados
    if (oldName && updates.name && oldName !== updates.name) {
      setMovements((prev) =>
        prev.map((m) => (m.category === oldName ? { ...m, category: updates.name! } : m))
      );
    }
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const handleAddAccount = (newAcc: Omit<Account, 'id'>) => {
    const acc: Account = {
      ...newAcc,
      id: `acc-${Date.now()}`,
    };
    setAccounts((prev) => [...prev, acc]);
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddBill = (newBill: Omit<RecurringBill, 'id'>) => {
    const bill: RecurringBill = {
      ...newBill,
      id: `bill-${Date.now()}`,
    };
    setBills((prev) => [...prev, bill]);
  };

  const handleUpdateBill = (id: string, updates: Partial<RecurringBill>) => {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const handleDeleteBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  const handleMarkBillAsPaid = (bill: RecurringBill) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const [dueY, dueM, dueD] = bill.dueDate.split('-').map(Number);
    const nextDue = new Date(dueY, dueM, dueD);
    const nextY = nextDue.getFullYear();
    const nextM = String(nextDue.getMonth() + 1).padStart(2, '0');
    const nextD = String(dueD).padStart(2, '0');
    const nextDueDateStr = `${nextY}-${nextM}-${nextD}`;

    handleUpdateBill(bill.id, {
      lastPaidDate: todayStr,
      dueDate: nextDueDateStr,
    });
  };

  // --- Handlers para Metas de Ahorro ---
  const handleAddSavingsGoal = (newGoal: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const goal: SavingsGoal = {
      ...newGoal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };
    setSavingsGoals((prev) => [goal, ...prev]);
  };

  const handleUpdateSavingsGoal = (id: string, updates: Partial<SavingsGoal>) => {
    setSavingsGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const handleDeleteSavingsGoal = (id: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleDepositToSavingsGoal = (goalId: string, amount: number) => {
    setSavingsGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g))
    );
  };

  const handleWithdrawFromSavingsGoal = (goalId: string, amount: number) => {
    setSavingsGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, currentAmount: Math.max(0, g.currentAmount - amount) } : g
      )
    );
  };

  const handleResetAllData = () => {
    setMovements([]);
    setCategories(DEFAULT_CATEGORIES);
    setAccounts(DEFAULT_ACCOUNTS.map((a) => ({ ...a, initialBalance: 0 })));
    setBills(DEFAULT_BILLS);
    setSavingsGoals([]);
    setIsResetConfirmOpen(false);
  };

  const handleExportExcel = () => {
    exportAllDataToExcelCsv({
      movements,
      accounts,
      categories,
      bills,
      savingsGoals,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-12">
      {/* Contenedor central vertical con ancho óptimo para pestañas y paneles */}
      <div className="mx-auto max-w-3xl bg-white min-h-screen border-x border-slate-200">
        {/* Encabezado */}
        <Navbar
          user={user}
          onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
          onOpenSupabase={() => setIsSupabaseModalOpen(true)}
          onExportExcel={handleExportExcel}
          onResetAllData={() => setIsResetConfirmOpen(true)}
          onOpenCategories={() => handleOpenCategoriesManager('expense')}
        />

        {/* Barra de pestañas fijas por sección */}
        <TabsNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          movementsCount={movementsInMonthCount}
          accountsCount={accounts.length}
          urgentBillsCount={urgentBillsCount}
          exceededBudgetsCount={exceededBudgetsCount}
          savingsGoalsCount={activeSavingsGoalsCount}
        />

        {/* Botones de acción rápida superiores únicos y accesibles en todas las vistas */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/70 p-3">
          <button
            id="btn-quick-add-expense-top"
            type="button"
            onClick={() => handleOpenAdd('expense')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            <ArrowDownLeft className="h-4 w-4 text-red-400" />
            <span>+ Registrar Gasto</span>
          </button>
          <button
            id="btn-quick-add-income-top"
            type="button"
            onClick={() => handleOpenAdd('income')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            <span>+ Registrar Ingreso</span>
          </button>
        </div>

        {/* CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA */}
        <main id="main-tab-content">
          {activeTab === 'dashboard' && (
            <div id="panel-dashboard" role="tabpanel" aria-labelledby="tab-btn-dashboard" className="space-y-0">
              {/* Resumen del mes */}
              <MonthSummary
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                income={monthIncome}
                expenses={monthExpenses}
                todayMonth={todayMonth}
              />

              {/* Gráfico de dona con reparto de gastos por categoría */}
              <DonutChart
                movements={movements}
                categories={categories}
                currentMonth={currentMonth}
              />

              {/* Gráfico de barras con los últimos 6 meses */}
              <BarChart6Months
                movements={movements}
                currentMonth={currentMonth}
                onSelectMonth={setCurrentMonth}
              />

              {/* Tarjetas de acceso rápido a las otras secciones */}
              <div className="p-4 bg-slate-50/60 border-t border-slate-200">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Acceso directo a secciones
                  </h3>
                  <span className="text-[11px] text-slate-400">Todo a 1 clic sin scrollear</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Ir a Movimientos */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('movements')}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <ArrowLeftRight className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          Movimientos
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {movementsInMonthCount} registros en {getMonthLabel(currentMonth)}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Ir a Cuentas */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('accounts')}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          Cuentas y Saldos
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Total: <strong className="text-slate-700">{formatCurrency(totalCapitalBalance)}</strong> ({accounts.length} cuentas)
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Ir a Presupuestos */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('budgets')}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        exceededBudgetsCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'
                      }`}>
                        <Sliders className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                          Presupuestos
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {exceededBudgetsCount > 0 ? (
                            <span className="text-amber-600 font-semibold">{exceededBudgetsCount} límite(s) excedido(s)</span>
                          ) : (
                            `${budgetedCategoriesCount} categorías con presupuesto`
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Ir a Metas de Ahorro */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('savings')}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <PiggyBank className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                          Metas de Ahorro
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {savingsGoals.length} metas · Ahorrado: <strong className="text-slate-700">{formatCurrency(totalSavedInGoals)}</strong>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Ir a Facturas */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('bills')}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        urgentBillsCount > 0 ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                          Vencimientos y Facturas
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {urgentBillsCount > 0 ? (
                            <span className="text-orange-600 font-semibold">{urgentBillsCount} factura(s) por vencer</span>
                          ) : (
                            `${bills.length} pagos recurrentes al día`
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'movements' && (
            <div id="panel-movements" role="tabpanel" aria-labelledby="tab-btn-movements">
              <MovementsList
                movements={movements}
                categories={categories}
                accounts={accounts}
                currentMonth={currentMonth}
                onEdit={handleEditMovement}
                onDelete={(mov) => setDeleteConfirmMovement(mov)}
                onExportExcel={handleExportExcel}
              />
            </div>
          )}

          {activeTab === 'accounts' && (
            <div id="panel-accounts" role="tabpanel" aria-labelledby="tab-btn-accounts">
              <AccountsSection
                accounts={accounts}
                movements={movements}
                onTransfer={handleTransfer}
                onUpdateAccount={handleUpdateAccount}
                onAddAccount={handleAddAccount}
                onDeleteAccount={handleDeleteAccount}
              />
            </div>
          )}

          {activeTab === 'budgets' && (
            <div id="panel-budgets" role="tabpanel" aria-labelledby="tab-btn-budgets">
              <BudgetList
                categories={categories}
                movements={movements}
                currentMonth={currentMonth}
                onUpdateCategoryBudget={handleUpdateCategoryBudget}
                onOpenCategoriesManager={() => handleOpenCategoriesManager('expense')}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={handleAddCategory}
              />
            </div>
          )}

          {activeTab === 'savings' && (
            <div id="panel-savings" role="tabpanel" aria-labelledby="tab-btn-savings">
              <SavingsGoalsSection
                goals={savingsGoals}
                accounts={accounts}
                onAddGoal={handleAddSavingsGoal}
                onUpdateGoal={handleUpdateSavingsGoal}
                onDeleteGoal={handleDeleteSavingsGoal}
                onDepositToGoal={handleDepositToSavingsGoal}
                onWithdrawFromGoal={handleWithdrawFromSavingsGoal}
              />
            </div>
          )}

          {activeTab === 'bills' && (
            <div id="panel-bills" role="tabpanel" aria-labelledby="tab-btn-bills">
              <BillsSection
                bills={bills}
                categories={categories}
                onAddBill={handleAddBill}
                onUpdateBill={handleUpdateBill}
                onDeleteBill={handleDeleteBill}
                onMarkAsPaid={handleMarkBillAsPaid}
              />
            </div>
          )}
        </main>
      </div>

      {/* Modal de Carga Rápida / Edición */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSave={handleSaveMovement}
        categories={categories}
        accounts={accounts}
        initialType={quickAddType}
        movementToEdit={movementToEdit}
        onOpenCategoriesManager={handleOpenCategoriesManager}
      />

      {/* Modal Administrador de Categorías */}
      <CategoriesManagerModal
        isOpen={isCategoriesManagerOpen}
        onClose={() => setIsCategoriesManagerOpen(false)}
        categories={categories}
        initialTab={categoriesModalTab}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Modal Google Sheets */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        user={user}
        onAuthChange={(newUser) => setUser(newUser)}
        movements={movements}
        categories={categories}
        accounts={accountsWithBalances}
      />

      {/* Modal Supabase */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        accounts={accounts}
        categories={categories}
        movements={movements}
        bills={bills}
        onDataImported={(imported) => {
          setAccounts(imported.accounts);
          setCategories(imported.categories);
          setMovements(imported.movements);
          setBills(imported.bills);
        }}
      />

      {/* Diálogo confirmación borrar movimiento */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmMovement}
        title="¿Borrar este movimiento?"
        message={`Se eliminará el movimiento de ${
          deleteConfirmMovement?.note || deleteConfirmMovement?.category
        }. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, borrar"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={handleDeleteMovementConfirm}
        onCancel={() => setDeleteConfirmMovement(null)}
      />

      {/* Diálogo confirmación Empezar de Cero */}
      <ConfirmationDialog
        isOpen={isResetConfirmOpen}
        title="¿Querés empezar de cero?"
        message="Se van a borrar todos los movimientos cargados (incluyendo los datos de ejemplo) y las cuentas quedarán en cero para que cargues tu información real desde el principio."
        confirmLabel="Sí, borrar todo"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={handleResetAllData}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
}
