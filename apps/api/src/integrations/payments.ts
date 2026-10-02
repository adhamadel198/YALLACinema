import { randomUUID } from 'node:crypto';
import type { PaymentMethod } from '../domain/types.ts';

export type ChargeResult = { ok: true; paymentRef: string } | { ok: false; reason: string };

/**
 * Payment provider boundary (BRD 7.4). The real provider (cards + local wallets) is not chosen yet;
 * card details will be collected on the provider's hosted page, never by this API.
 */
export interface PaymentProvider {
  charge(input: { amount: number; currency: 'EGP'; method: PaymentMethod; reference: string }): Promise<ChargeResult>;
  refund(paymentRef: string): Promise<void>;
}

/** Approves every charge. Development only. */
export const sandboxPayments: PaymentProvider = {
  async charge() {
    return { ok: true, paymentRef: `sandbox_${randomUUID().slice(0, 8)}` };
  },
  async refund() {},
};
