import { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Account, Category, Movement, MovementType, RecurringBill } from './types';
import { DEFAULT_ACCOUNTS, DEFAULT_BILLS, DEFAULT_CATEGORIES, INITIAL_MOVEMENTS } from './data/initialData';
import { initAuth } from './services/firebaseAuth';
import { Navbar } from './components/Navbar';
import { MonthSummary } from './components/MonthSummary';
import { DonutChart } from './components/DonutChart';
import { BarChart6Months } from './components/BarChart6Months';
import { BudgetList } from './components/BudgetList';
import { BillsSection } from './components/BillsSection';
import { AccountsSection } from './components/AccountsSection';
import { MovementsList } from './components/MovementsList';
import { QuickAddModal } from './components/QuickAddModal';
import { CategoriesManagerModal } from './components/CategoriesManagerModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { SupabaseModal } from './components/SupabaseModal';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { exportAllDataToExcelCsv } from './utils/exportToExcel';
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';

const STORAGE_KEY_MOVEMENTS = 'fp_movements_usd_v3';
const STORAGE_KEY_CATEGORIES = 'fp_categories_usd_v3';
const STORAGE_KEY_ACCOUNTS = 'fp_accounts_usd_v4';
const STORAGE_KEY_BILLS = 'fp_bills_usd_v1';

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

  // Current month being inspected (defaults to today's month, e.g. "2026-09")
  const todayMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [currentMonth, setCurrentMonth] = useState<string>(todayMonth);

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

  const handleResetAllData = () => {
    setMovements([]);
    setCategories(DEFAULT_CATEGORIES);
    setAccounts(DEFAULT_ACCOUNTS.map((a) => ({ ...a, initialBalance: 0 })));
    setBills(DEFAULT_BILLS);
    setIsResetConfirmOpen(false);
  };

  const handleExportExcel = () => {
    exportAllDataToExcelCsv({
      movements,
      accounts,
      categories,
      bills,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-24">
      {/* Contenedor central vertical mobile-primero plano */}
      <div className="mx-auto max-w-2xl bg-white min-h-screen border-x border-slate-200">
        {/* Encabezado */}
        <Navbar
          user={user}
          onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
          onOpenSupabase={() => setIsSupabaseModalOpen(true)}
          onExportExcel={handleExportExcel}
          onResetAllData={() => setIsResetConfirmOpen(true)}
          onOpenCategories={() => handleOpenCategoriesManager('expense')}
        />

        {/* 1. Botones de acción rápida superiores */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/60 p-3">
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

        {/* 2. Resumen del mes arriba de todo con el número protagonista */}
        <MonthSummary
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          income={monthIncome}
          expenses={monthExpenses}
          todayMonth={todayMonth}
        />

        {/* 3. Gráfico de dona con reparto de gastos por categoría (ordenado de mayor a menor, <5% en Otros) */}
        <DonutChart
          movements={movements}
          categories={categories}
          currentMonth={currentMonth}
        />

        {/* 4. Gráfico de barras con los últimos 6 meses */}
        <BarChart6Months
          movements={movements}
          currentMonth={currentMonth}
          onSelectMonth={setCurrentMonth}
        />

        {/* 1. Cuentas y Saldos + Transferencias + Edición de Cuentas */}
        <AccountsSection
          accounts={accounts}
          movements={movements}
          onTransfer={handleTransfer}
          onUpdateAccount={handleUpdateAccount}
          onAddAccount={handleAddAccount}
          onDeleteAccount={handleDeleteAccount}
        />

        {/* 2. Sección de Facturas y Pagos del Mes (vencimientos, días restantes, último pago) */}
        <BillsSection
          bills={bills}
          categories={categories}
          onAddBill={handleAddBill}
          onUpdateBill={handleUpdateBill}
          onDeleteBill={handleDeleteBill}
          onMarkAsPaid={handleMarkBillAsPaid}
        />

        {/* 3. Presupuesto opcional por categoría (la barra cambia de color cuando te pasás) */}
        <BudgetList
          categories={categories}
          movements={movements}
          currentMonth={currentMonth}
          onUpdateCategoryBudget={handleUpdateCategoryBudget}
          onOpenCategoriesManager={() => handleOpenCategoriesManager('expense')}
        />

        {/* 4. Lista de movimientos filtrable, con editar y borrar */}
        <MovementsList
          movements={movements}
          categories={categories}
          accounts={accounts}
          currentMonth={currentMonth}
          onEdit={handleEditMovement}
          onDelete={(mov) => setDeleteConfirmMovement(mov)}
        />
      </div>

      {/* Botón flotante móvil para cargar en menos de 5 segundos */}
      <div className="fixed bottom-4 left-0 right-0 z-40 mx-auto flex max-w-sm items-center justify-center gap-3 px-4">
        <button
          id="btn-fab-expense"
          type="button"
          onClick={() => handleOpenAdd('expense')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-none transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 text-red-400" />
          <span>Gasto rápido</span>
        </button>
        <button
          id="btn-fab-income"
          type="button"
          onClick={() => handleOpenAdd('income')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-none transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Ingreso rápido</span>
        </button>
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
