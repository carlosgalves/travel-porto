import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toHex(color: string): string {
  if (!color) return '#000000';
  const s = color.trim();
  return s.startsWith('#') ? s : `#${s}`;
}