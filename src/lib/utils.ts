import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

export function getField<T = unknown>(obj: Record<string, T> | null | undefined, key: string): T | undefined {
  return obj?.[key];
}

export function getStrField(obj: Record<string, unknown> | null | undefined, ...keys: string[]): string | null {
  if (!obj) return null;
  for (const key of keys) {
    const v = obj[key];
    if (v != null) {
      if (typeof v === 'string') return v;
      if (Array.isArray(v)) return v.join(', ');
      return String(v);
    }
  }
  return null;
}
