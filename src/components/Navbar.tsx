import { User } from 'firebase/auth';
import { Database, FileDown, FileSpreadsheet, RotateCcw, ShieldCheck, Tag } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  user: User | null;
  onOpenGoogleSheets: () => void;
  onOpenSupabase: () => void;
  onExportExcel: () => void;
  onResetAllData: () => void;
  onOpenCategories?: () => void;
}

export function Navbar({
  user,
  onOpenGoogleSheets,
  onOpenSupabase,
  onExportExcel,
  onResetAllData,
  onOpenCategories,
}: NavbarProps) {
  return (
    <header id="main-header" className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-2xs">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm shadow-xs">
            $
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Finanzas Personales</h1>
            <span className="text-[11px] text-slate-500">Planilla simple y real</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botón PWA Instalable */}
          <PWAInstallButton />

          {/* Botón Exportar a Excel / CSV */}
          <button
            id="btn-export-excel-nav"
            type="button"
            onClick={onExportExcel}
            title="Exportar a Excel / CSV (Copia de seguridad)"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900"
          >
            <FileDown className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Excel/CSV</span>
          </button>

          {/* Botón Supabase */}
          <button
            id="btn-open-supabase-nav"
            type="button"
            onClick={onOpenSupabase}
            title="Sincronizar con base de datos Supabase"
            className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50/80 px-2 py-1.5 text-xs font-semibold text-emerald-900 shadow-2xs hover:bg-emerald-100"
          >
            <Database className="h-3.5 w-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Supabase</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {onOpenCategories && (
            <button
              id="btn-open-categories-nav"
              type="button"
              onClick={onOpenCategories}
              title="Administrar categorías de gastos e ingresos"
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Tag className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden md:inline">Categorías</span>
            </button>
          )}

          <button
            id="btn-reset-data-top"
            type="button"
            onClick={onResetAllData}
            title="Empezar de cero"
            className="flex items-center rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            id="btn-open-google-sheets"
            type="button"
            onClick={onOpenGoogleSheets}
            title="Google Sheets"
            className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
              user
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden md:inline">Sheets</span>
            {user && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}
          </button>
        </div>
      </div>
    </header>
  );
}

