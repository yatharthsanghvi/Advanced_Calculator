// types.ts
import { lightTheme, darkTheme } from './theme';
export type Theme = typeof lightTheme;

export type HistoryItem = {
  id: string;
  type: 'calculation' | 'conversion' | 'tip';
  expression?: string;
  result: string;
  timestamp: number;
  category?: string;
};

export type ConversionType = {
  from: string;
  to: string;
  label: string;
  multiplier: number;
  category: string;
};

