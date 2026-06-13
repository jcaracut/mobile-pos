import { useCallback, useMemo, useReducer } from 'react';
import type { CartItem, CartTotals } from '../types';
import type { Product } from '@core/database/models';

// ── State shape ───────────────────────────────────────────────────────────────

interface CartState {
  items: CartItem[];
  taxRate: number;
}

// ── Actions ───────────────────────────────────────────────────────────────────

type CartAction =
  | { type: 'ADD_ITEM'; product: Product }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'SET_QUANTITY'; productId: string; quantity: number }
  | { type: 'SET_DISCOUNT'; productId: string; discountAmount: number }
  | { type: 'CLEAR' }
  | { type: 'SET_TAX_RATE'; rate: number };

// ── Reducer ───────────────────────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const idx = state.items.findIndex((i) => i.product.id === action.product.id);
      if (idx >= 0) {
        const updated = [...state.items];
        const existing = updated[idx];
        if (existing) {
          updated[idx] = { ...existing, quantity: existing.quantity + 1 };
        }
        return { ...state, items: updated };
      }
      return {
        ...state,
        items: [...state.items, { product: action.product, quantity: 1, discountAmount: 0 }],
      };
    }

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.product.id !== action.productId) };

    case 'SET_QUANTITY': {
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter((i) => i.product.id !== action.productId) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.productId ? { ...i, quantity: action.quantity } : i
        ),
      };
    }

    case 'SET_DISCOUNT':
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.productId
            ? { ...i, discountAmount: Math.max(0, action.discountAmount) }
            : i
        ),
      };

    case 'CLEAR':
      return { ...state, items: [] };

    case 'SET_TAX_RATE':
      return { ...state, taxRate: Math.max(0, action.rate) };
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseCartReturn {
  items: CartItem[];
  totals: CartTotals;
  taxRate: number;
  itemCount: number;
  isEmpty: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setDiscount: (productId: string, discountAmount: number) => void;
  setTaxRate: (rate: number) => void;
  clearCart: () => void;
}

export function useCart(initialTaxRate = 0.12): UseCartReturn {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    taxRate: initialTaxRate,
  });

  const totals = useMemo<CartTotals>(() => {
    const discountCents = state.items.reduce((s, i) => s + i.discountAmount, 0);
    const subtotalCents = state.items.reduce(
      (s, i) => s + i.product.price * i.quantity - i.discountAmount,
      0
    );
    const taxCents = Math.round(subtotalCents * state.taxRate);
    return {
      subtotalCents,
      discountCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
    };
  }, [state.items, state.taxRate]);

  const itemCount = useMemo(
    () => state.items.reduce((s, i) => s + i.quantity, 0),
    [state.items]
  );

  const addItem = useCallback((product: Product) => dispatch({ type: 'ADD_ITEM', product }), []);
  const removeItem = useCallback(
    (productId: string) => dispatch({ type: 'REMOVE_ITEM', productId }),
    []
  );
  const setQuantity = useCallback(
    (productId: string, quantity: number) => dispatch({ type: 'SET_QUANTITY', productId, quantity }),
    []
  );
  const setDiscount = useCallback(
    (productId: string, discountAmount: number) =>
      dispatch({ type: 'SET_DISCOUNT', productId, discountAmount }),
    []
  );
  const setTaxRate = useCallback((rate: number) => dispatch({ type: 'SET_TAX_RATE', rate }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  return {
    items: state.items,
    totals,
    taxRate: state.taxRate,
    itemCount,
    isEmpty: state.items.length === 0,
    addItem,
    removeItem,
    setQuantity,
    setDiscount,
    setTaxRate,
    clearCart,
  };
}
