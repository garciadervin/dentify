/**
 * FeedbackProvider — in-app toast + confirm (no browser Alert).
 *
 * Professional UX: destructive/blocking confirmations render as an in-app
 * modal and lightweight notices as a toast, instead of window.alert (which
 * react-native-web only supports with a single OK button).
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface FeedbackContextValue {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

// Default no-op so screens/components that call useFeedback render safely in
// tests (and degrade gracefully if a provider is ever missing). The real app
// always mounts FeedbackProvider at the root.
const FeedbackContext = createContext<FeedbackContextValue>({
  toast: () => {},
  confirm: () => Promise.resolve(false),
});

const KIND_COLORS: Record<ToastKind, { bg: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }> = {
  success: { bg: '#006B5F', icon: 'check-circle' },
  error: { bg: '#C0392B', icon: 'alert-circle' },
  info: { bg: '#191C1E', icon: 'information' },
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending(opts);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setPending(null);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }, []);

  const colors = toast ? KIND_COLORS[toast.kind] : KIND_COLORS.info;

  return (
    <FeedbackContext.Provider value={{ toast: showToast, confirm }}>
      {children}

      {/* Confirmation modal — mounted only while a confirmation is pending so the
          always-mounted RNW Modal does not emit deprecation warnings on every screen. */}
      {pending && (
        <Modal visible transparent animationType="fade" onRequestClose={() => settle(false)}>
          <View className="flex-1 items-center justify-center bg-black/40 px-8">
            <View className="w-full max-w-[400px] rounded-[20px] bg-surface p-6">
              <Text className="mb-1.5 font-heading-bold text-[17px] text-deep-slate">{pending.title}</Text>
              {pending.message ? (
                <Text className="mb-5 font-sans text-[14px] leading-[20px] text-neutral">{pending.message}</Text>
              ) : null}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => settle(false)}
                  className="flex-1 items-center rounded-[12px] bg-border-light py-3"
                  accessibilityRole="button"
                >
                  <Text className="font-inter-semibold text-[14px] text-deep-slate">
                    {pending.cancelLabel ?? 'Cancelar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => settle(true)}
                  className={`flex-1 items-center rounded-[12px] py-3 ${pending.destructive ? 'bg-error' : 'bg-clinical-blue'}`}
                  accessibilityRole="button"
                >
                  <Text className="font-inter-semibold text-[14px] text-white">
                    {pending.confirmLabel ?? 'Confirmar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <View
          className="absolute inset-x-0 top-14 items-center"
          style={{ pointerEvents: 'none' }}
          testID="app-toast"
        >
          <View className="max-w-[86%] flex-row items-center gap-2 rounded-full px-4 py-2.5" style={{ backgroundColor: colors.bg }}>
            <MaterialCommunityIcons name={colors.icon} size={16} color="#FFFFFF" />
            <Text className="shrink font-inter-semibold text-[13px] text-white" numberOfLines={3}>
              {toast.message}
            </Text>
          </View>
        </View>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  return useContext(FeedbackContext);
}

export default FeedbackProvider;
