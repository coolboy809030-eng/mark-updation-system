import React, { useState } from 'react';
import {
  Shield,
  Lock,
  KeyRound,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminPin: string;
}

const ADMIN_PIN_STORAGE_KEY = 'pis_admin_master_pin_v1';

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminPin
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    try {
      return parseInt(
        sessionStorage.getItem('pis_admin_failed_attempts') || '0',
        10
      );
    } catch {
      return 0;
    }
  });

  const [lockUntil, setLockUntil] = useState<number>(() => {
    try {
      return parseInt(
        sessionStorage.getItem('pis_admin_lock_until') || '0',
        10
      );
    } catch {
      return 0;
    }
  });

  if (!isOpen) return null;

  const hasConfiguredPin = Boolean(adminPin && adminPin.trim());

  const isLocked = lockUntil > Date.now();

  const handleSetupPin = () => {
    setError('');
    setPin('');
    setConfirmPin('');
    setIsSetupMode(true);
  };

  const handleCancelSetup = () => {
    setError('');
    setPin('');
    setConfirmPin('');
    setIsSetupMode(false);
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPin = pin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!/^\d{4}$/.test(cleanPin)) {
      setError('Admin PIN must contain exactly 4 digits.');
      return;
    }

    if (cleanPin !== cleanConfirmPin) {
      setError('PIN and Confirm PIN do not match.');
      return;
    }

    try {
      localStorage.setItem(ADMIN_PIN_STORAGE_KEY, cleanPin);
    } catch {
      setError('Unable to save Admin PIN in this browser.');
      return;
    }

    setError('');
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      setPin('');
      setConfirmPin('');
      setIsSetupMode(false);

      /*
       * Reloading allows App.tsx to read the newly saved
       * admin PIN from localStorage.
       */
      window.location.reload();
    }, 700);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((lockUntil - Date.now()) / 1000)
      );

      setError(
        `Admin login temporarily locked. Try again in ${remainingSeconds} seconds.`
      );
      return;
    }

    const cleanPin = pin.trim();
    const expected = (adminPin || '').trim();

    if (!expected) {
      setError('Admin authentication is not configured.');
      return;
    }

    if (cleanPin === expected) {
      setIsSuccess(true);
      setError('');

      setFailedAttempts(0);
      setLockUntil(0);

      try {
        sessionStorage.removeItem('pis_admin_failed_attempts');
        sessionStorage.removeItem('pis_admin_lock_until');
      } catch {
        // ignore
      }

      setTimeout(() => {
        setIsSuccess(false);
        setPin('');
        onSuccess();
      }, 400);

      return;
    }

    const nextCount = failedAttempts + 1;

    setFailedAttempts(nextCount);

    try {
      sessionStorage.setItem(
        'pis_admin_failed_attempts',
        String(nextCount)
      );
    } catch {
      // ignore
    }

    if (nextCount >= 3) {
      const lockDuration = 60 * 1000;
      const newLockUntil = Date.now() + lockDuration;

      setLockUntil(newLockUntil);

      try {
        sessionStorage.setItem(
          'pis_admin_lock_until',
          String(newLockUntil)
        );
      } catch {
        // ignore
      }

      setError(
        'Three incorrect attempts detected. Admin login is locked for 60 seconds.'
      );
    } else {
      setError(
        `Incorrect Admin PIN. Attempt ${nextCount}/3.`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              {isSetupMode ? (
                <KeyRound className="h-6 w-6" />
              ) : (
                <Shield className="h-6 w-6" />
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold">
                {isSetupMode ? 'Set Admin PIN' : 'Admin Login'}
              </h2>

              <p className="text-xs text-slate-300">
                Academic Hero
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="mb-4 h-14 w-14 text-green-600" />

              <h3 className="text-lg font-bold text-slate-800">
                {isSetupMode
                  ? 'Admin PIN Saved'
                  : 'Login Successful'}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {isSetupMode
                  ? 'The application will reload.'
                  : 'Opening Office Master...'}
              </p>
            </div>
          ) : isSetupMode ? (
            <form onSubmit={handleSaveNewPin} className="space-y-5">

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Create a new Admin PIN
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-800">
                      Use a 4-digit PIN. This is a local browser
                      credential foundation and is not yet
                      production-grade backend authentication.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  New Admin PIN
                </label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) =>
                      setPin(
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 4)
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-center text-xl tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="••••"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Confirm Admin PIN
                </label>

                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) =>
                      setConfirmPin(
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 4)
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-center text-xl tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="••••"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelSetup}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Save PIN
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Examination Incharge / Administrator
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Admin authentication is required to access
                      Office Master and protected administrative
                      functions.
                    </p>
                  </div>
                </div>
              </div>

              {isLocked ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Login temporarily locked
                      </p>

                      <p className="mt-1 text-xs text-amber-800">
                        Please wait before trying again.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Admin PIN
                    </label>

                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={pin}
                        onChange={(e) =>
                          setPin(
                            e.target.value
                              .replace(/\D/g, '')
                              .slice(0, 4)
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-center text-xl tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="••••"
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Login to Office Master
                  </button>
                </>
              )}

              {!hasConfiguredPin && (
                <div className="border-t border-slate-200 pt-5">
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                      <p className="text-xs leading-5 text-amber-800">
                        No Admin PIN is currently configured in this
                        browser.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSetupPin}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Set / Reset Admin PIN
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLoginModal;