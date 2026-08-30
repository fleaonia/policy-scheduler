import type { PolicyCategory } from '../types';

interface CategoryStyle {
  bg: string;
  border: string;
  dot: string;
}

export const CATEGORY_STYLE: Record<PolicyCategory, CategoryStyle> = {
  third_party: { bg: 'bg-sage-100', border: 'border-sage-400', dot: 'bg-sage-500' },
  os_update: { bg: 'bg-[#e7edf0]', border: 'border-slate-blue', dot: 'bg-slate-blue' },
  office_update: { bg: 'bg-[#f6ecd9]', border: 'border-gold', dot: 'bg-gold' },
  custom: { bg: 'bg-[#f1ece3]', border: 'border-ink-soft', dot: 'bg-ink-soft' },
};
