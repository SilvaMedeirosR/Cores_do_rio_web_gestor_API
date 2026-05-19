export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastPayload {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

type Listener = (t: ToastPayload) => void;
const listeners = new Set<Listener>();

export function toast(message: string, type: ToastType = "info", duration = 3500) {
  const id = Math.random().toString(36).slice(2, 9);
  listeners.forEach(fn => fn({ id, message, type, duration }));
}

export const toastSuccess = (msg: string, d = 3000) => toast(msg, "success", d);
export const toastError   = (msg: string, d = 4000) => toast(msg, "error",   d);
export const toastWarning = (msg: string, d = 3500) => toast(msg, "warning", d);
export const toastInfo    = (msg: string, d = 3000) => toast(msg, "info",    d);

export function subscribeToast(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
