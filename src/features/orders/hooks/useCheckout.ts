import { useState, useCallback } from 'react';
import { OrderService } from '../services/OrderService';
import type { CreateOrderParams, ReceiptData } from '../types';

type CheckoutStatus = 'idle' | 'processing' | 'success' | 'error';

interface UseCheckoutReturn {
  status: CheckoutStatus;
  receipt: ReceiptData | null;
  error: string | null;
  /** Returns true on success, false on error. Use the return value — do not read status after awaiting. */
  checkout: (params: CreateOrderParams) => Promise<boolean>;
  reset: () => void;
}

/**
 * Orchestrates the checkout flow: write order → build receipt → signal success.
 * Keeps the state machine in one place so any screen can drive it.
 */
export function useCheckout(): UseCheckoutReturn {
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(async (params: CreateOrderParams): Promise<boolean> => {
    setStatus('processing');
    setError(null);

    try {
      const order = await OrderService.createOrder(params);
      const receiptData = await OrderService.buildReceipt(order.id);
      setReceipt(receiptData);
      setStatus('success');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setStatus('error');
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setReceipt(null);
    setError(null);
  }, []);

  return { status, receipt, error, checkout, reset };
}
