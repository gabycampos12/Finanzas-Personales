import { useState } from 'react';
import { User } from 'firebase/auth';
import { Account, Category, Movement } from '../types';
import { exportToNewGoogleSheet, syncToExistingSheet } from '../services/googleSheets';
import { googleSignIn, logout } from '../services/firebaseAuth';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  LogOut,
  UploadCloud,
  X,
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onAuthChange: (user: User | null, token: string | null) => void;
  movements: Movement[];
  categories: Category[];
  accounts: (Account & { balance: number })[];
}

export function GoogleSheetsModal({
  isOpen,
  onClose,
  user,
  onAuthChange,
  movements,
  categories,
  accounts,
}: GoogleSheetsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);
  const [sheetIdInput, setSheetIdInput] = useState<string>('');
  const [confirmPendingAction, setConfirmPendingAction] = useState<
    'export_new' | 'sync_existing' | null
  >(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthChange(res.user, res.accessToken);
        setSuccessMsg('Conectado con Google exitosamente.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logout();
      onAuthChange(null, null);
      setSuccessMsg('Sesión cerrada.');
      setCreatedSheetUrl(null);
    } catch (err: any) {
      setError(err?.message || 'Error al cerrar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  const executeExportNew = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // Get access token via auth
      const token = await import('../services/firebaseAuth').then((m) => m.getAccessToken());
      if (!token) {
        throw new Error('No hay sesión activa de Google con permisos de Sheets.');
      }

      const res = await exportToNewGoogleSheet(token, movements, categories, accounts);
      setCreatedSheetUrl(res.spreadsheetUrl);
      setSuccessMsg('¡Planilla creada y sincronizada con éxito en tu Google Drive!');
    } catch (err: any) {
      setError(err?.message || 'Error al exportar a Google Sheets.');
    } finally {
      setIsLoading(false);
      setConfirmPendingAction(null);
    }
  };

  const executeSyncExisting = async () => {
    if (!sheetIdInput.trim()) {
      setError('Ingresa el ID de la planilla existente de Google Sheets.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = await import('../services/firebaseAuth').then((m) => m.getAccessToken());
      if (!token) {
        throw new Error('No hay sesión activa de Google.');
      }

      // Extract ID if full URL pasted
      let sheetId = sheetIdInput.trim();
      const match = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) sheetId = match[1];

      await syncToExistingSheet(token, sheetId, movements, categories, accounts);
      setSuccessMsg('Movimientos sincronizados en la planilla existente.');
    } catch (err: any) {
      setError(err?.message || 'Error al sincronizar con la planilla.');
    } finally {
      setIsLoading(false);
      setConfirmPendingAction(null);
    }
  };

  return (
    <div
      id="modal-sheets-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        id="modal-sheets-content"
        className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-5 text-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sincronización con Google Sheets</h3>
              <p className="text-[11px] text-slate-500">
                Guarda tus datos en tu Google Drive
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Diálogo de Confirmación Destructiva Requerido por Skill */}
          {confirmPendingAction ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 text-xs text-slate-800">
              <div className="font-bold text-amber-900">¿Confirmas la operación?</div>
              <p className="mt-1 text-slate-700">
                {confirmPendingAction === 'export_new'
                  ? `Se va a crear una planilla nueva en tu cuenta de Google con ${movements.length} movimientos, ${accounts.length} cuentas y tus presupuestos actuales.`
                  : 'Se van a actualizar las filas de la pestaña "Movimientos" en la planilla indicada.'}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmPendingAction(null)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={
                    confirmPendingAction === 'export_new'
                      ? executeExportNew
                      : executeSyncExisting
                  }
                  className="flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Sí, exportar
                </button>
              </div>
            </div>
          ) : !user ? (
            /* Estado no autenticado: Botón oficial de Sign in with Google */
            <div className="flex flex-col items-center py-4 text-center">
              <p className="text-xs text-slate-600 mb-4">
                Conecta tu cuenta de Google para exportar o sincronizar tus ingresos y gastos
                directamente en una planilla de cálculo de Google Sheets.
              </p>

              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoading}
                className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-none"
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="h-4 w-4"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>Iniciar sesión con Google</span>
              </button>
            </div>
          ) : (
            /* Estado autenticado: Opciones de sincronización */
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    {user.displayName?.[0] || user.email?.[0] || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-900">
                      {user.displayName || user.email}
                    </div>
                    <div className="text-[10px] text-slate-500">Conectado</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-600"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Salir</span>
                </button>
              </div>

              {/* Botón principal: Exportar a nueva planilla */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setConfirmPendingAction('export_new')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Exportar todo a nueva planilla en Google Sheets</span>
              </button>

              {createdSheetUrl && (
                <a
                  href={createdSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <span>Abrir planilla en Google Sheets</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {/* Sincronizar con planilla existente */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  O sincronizar con ID / URL de planilla existente
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={sheetIdInput}
                    onChange={(e) => setSheetIdInput(e.target.value)}
                    placeholder="Pega el ID o enlace de la hoja"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmPendingAction('sync_existing')}
                    disabled={isLoading || !sheetIdInput.trim()}
                    className="shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
