import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone } from 'lucide-react';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-500"
        title="Instalar aplicación en tu dispositivo"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
          title="Cómo instalar en iPhone o iPad"
        >
          <Smartphone className="h-3.5 w-3.5 text-slate-600" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Instalar en iPhone o iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                    1
                  </span>
                  <p>
                    Toca el botón <strong className="text-slate-800">Compartir</strong> (<Share2 className="inline h-3.5 w-3.5 text-blue-600" />) en la barra inferior de Safari.
                  </p>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                    2
                  </span>
                  <p>
                    Desplaza hacia abajo y selecciona <strong className="text-slate-800">Agregar a inicio</strong> (+).
                  </p>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                    3
                  </span>
                  <p>
                    Toca <strong className="text-slate-800">Agregar</strong> arriba a la derecha. ¡Listo! Tendrás el ícono en tu pantalla como una app nativa.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback button on desktop when prompt hasn't triggered yet or browser install icon is in address bar
  return (
    <button
      id="btn-pwa-install-default"
      type="button"
      onClick={() => {
        alert('Para instalar esta app:\n• En Chrome/Edge: haz clic en el ícono de instalación (computadora o flecha) en la barra de direcciones.\n• En móvil: abre el menú (⋮) y selecciona "Instalar aplicación" o "Agregar a la pantalla principal".');
      }}
      className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50"
      title="Instalar como app en tu computadora o móvil"
    >
      <Download className="h-3.5 w-3.5 text-slate-600" />
      <span>Instalar App</span>
    </button>
  );
}
