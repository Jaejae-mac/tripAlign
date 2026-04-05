import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind 클래스를 조건부로 조합합니다 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
