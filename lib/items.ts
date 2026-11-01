import type { ItemId } from './types';

export const ITEMS = {
  tshirt: {
    id: 'tshirt',
    emoji: '👕',
    name: { en: 'T-shirt', hi: 'टी-शर्ट', mr: 'टी-शर्ट' },
    customer: { start: 200, good: 350, max: 400 },
    vendor: { open: 800, floor: 330 },
  },
  hoodie: {
    id: 'hoodie',
    emoji: '🧥',
    name: { en: 'Hoodie', hi: 'हुडी', mr: 'हुडी' },
    customer: { start: 300, good: 350, max: 450 },
    vendor: { open: 1200, floor: 340 },
  },
  jeans: {
    id: 'jeans',
    emoji: '👖',
    name: { en: 'Jeans', hi: 'जींस', mr: 'जीन्स' },
    customer: { start: 500, good: 600, max: 700 },
    vendor: { open: 1600, floor: 560 },
  },
} as const satisfies Record<
  ItemId,
  {
    id: ItemId;
    emoji: string;
    name: { en: string; hi: string; mr: string };
    customer: { start: number; good: number; max: number };
    vendor: { open: number; floor: number };
  }
>;

export type Item = (typeof ITEMS)[ItemId];

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
