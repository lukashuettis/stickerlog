import clsx, { type ClassValue } from 'clsx'

/** Tailwind-friendly class name combiner. */
export function cn(...classes: ClassValue[]): string {
  return clsx(...classes)
}
