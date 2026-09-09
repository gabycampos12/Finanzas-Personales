import { useState, useEffect, type FormEvent } from 'react';
import { User } from '@supabase/supabase-js';
import {
  supabase,
  SUPABASE_URL,
  syncAllLocalDataToSupabase,
  fetchAccountsFromSupabase,
  fetchCategoriesFromSupabase,
  fetchMovementsFromSupabase,
  fetchBillsFromSupabase,
} from '../services/supabase';
import { Account, Category, Movement, RecurringBill } from '../types';
import {
  Database,
  CloudUpload,
  CloudDownload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
  LogOut,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  movements: Movement[];
  bills: RecurringBill[];
  onDataImported: (data: {
    accounts: Account[];
    categories: Category[];
    movements: Movement[];
    bills: RecurringBill[];
  }) => void;
}

export function SupabaseModal({
  isOpen,
  onClose,
  accounts,
  categories,
  movements,
  bills,
  onDataImported,
}: SupabaseModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setStatusMessage({ type: 'error', text: 'Por favor ingresa tu correo y contraseña.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user && data.session) {
          setUser(data.user);
          setStatusMessage({ type: 'success', text: '¡Cuenta creada y sesión iniciada con éxito!' });
        } else {
          setStatusMessage({
            type: 'info',
            text: '¡Cuenta creada! Revisa tu correo electrónico para confirmar la cuenta.',
          });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setUser(data.user);
        setStatusMessage({ type: 'success', text: '¡Sesión iniciada con éxito!' });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({
        type: 'error',
        text: error.message || 'Error en la autenticación.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setStatusMessage({ type: 'info', text: 'Sesión cerrada.' });
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePushAll = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      await syncAllLocalDataToSupabase({
        accounts,
        categories,
        movements,
        bills,
        userId: user?.id,
      });
      setStatusMessage({
        type: 'success',
        text: `¡Sincronización exitosa! Se subieron ${movements.length} movimientos, ${accounts.length} cuentas, ${categories.length} categorías y ${bills.length} facturas a Supabase.`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      const msg = error.message || 'Error al sincronizar con Supabase';
      if (msg.includes('row-level security') || msg.includes('policy')) {
        setStatusMessage({
          type: 'error',
          text: 'Las políticas de seguridad (RLS) de Supabase requieren que inicies sesión abajo con tu correo o desactives RLS en tus tablas para acceso anónimo.',
        });
      } else {
        setStatusMessage({ type: 'error', text: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePullAll = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const [remoteAccounts, remoteCategories, remoteMovements, remoteBills] = await Promise.all([
        fetchAccountsFromSupabase(),
        fetchCategoriesFromSupabase(),
        fetchMovementsFromSupabase(),
        fetchBillsFromSupabase(),
      ]);

      if (
        remoteAccounts.length === 0 &&
        remoteCategories.length === 0 &&
        remoteMovements.length === 0 &&
        remoteBills.length === 0
      ) {
        setStatusMessage({
          type: 'info',
          text: 'La base de datos en Supabase está vacía. Usa el botón "Subir datos a Supabase" para cargar tu información local.',
        });
        return;
      }

      onDataImported({
        accounts: remoteAccounts.length > 0 ? remoteAccounts : accounts,
        categories: remoteCategories.length > 0 ? remoteCategories : categories,
        movements: remoteMovements,
        bills: remoteBills,
      });

      setStatusMessage({
        type: 'success',
        text: `¡Datos descargados con éxito! Se cargaron ${remoteMovements.length} movimientos y ${remoteBills.length} facturas desde Supabase.`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({
        type: 'error',
        text: error.message || 'Error al descargar datos de Supabase.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sincronización con Supabase</h3>
              <p className="text-xs text-slate-500">Base de datos PostgreSQL en tiempo real</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Estado de Conexión */}
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Conexión activa
            </span>
            <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 font-mono text-[10px] text-emerald-900">
              PostgreSQL
            </span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-800 break-all">
            URL: {SUPABASE_URL}
          </div>
        </div>

        {/* Mensaje de estado / alertas */}
        {statusMessage && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs ${
              statusMessage.type === 'success'
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-900'
                : statusMessage.type === 'error'
                ? 'border border-red-300 bg-red-50 text-red-900'
                : 'border border-blue-300 bg-blue-50 text-blue-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            )}
            <div>{statusMessage.text}</div>
          </div>
        )}

        {/* Sección de Autenticación de Supabase (Para RLS) */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              Seguridad y Cuenta Supabase
            </span>
            {user ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> Conectado
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Opcional para RLS</span>
            )}
          </div>

          {user ? (
            <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200">
              <div className="truncate text-xs text-slate-700">
                <span className="font-semibold">Usuario:</span> {user.email || user.id}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold ml-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                Salir
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-2 mt-2">
              <p className="text-[11px] text-slate-500">
                Si activaste las políticas de seguridad (RLS) en Supabase, inicia sesión para que tus datos se guarden bajo tu usuario:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-[11px] text-emerald-700 hover:underline"
                >
                  {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crear una'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogIn className="h-3.5 w-3.5" />
                  )}
                  {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Acciones Principales de Sincronización */}
        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={handlePushAll}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            <span>Subir datos actuales a Supabase (Respaldo en la nube)</span>
          </button>

          <button
            type="button"
            onClick={handlePullAll}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
            ) : (
              <CloudDownload className="h-4 w-4 text-slate-600" />
            )}
            <span>Descargar datos desde Supabase (Restaurar)</span>
          </button>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3 text-center text-[11px] text-slate-500">
          Tus cambios se guardan localmente y también se pueden respaldar en tu base de datos de Supabase en cualquier momento.
        </div>
      </div>
    </div>
  );
}
