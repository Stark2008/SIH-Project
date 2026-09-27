import { v4 as uuidv4 } from 'uuid';

export interface PaymentIntentResponse {
  providerTxId: string;
  status: 'PENDING' | 'AUTHORIZED' | 'FAILED';
  clientSecret?: string;
}

/**
 * MOCK PAYMENT PROVIDER
 * DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION
 * 
 * Simulates an external payment gateway like Stripe or Razorpay.
 */
export class MockPaymentProvider {
  /**
   * Simulates creating a payment intent with a 3rd party provider.
   */
  async createPaymentIntent(amount: number, currency: string, idempotencyKey: string): Promise<PaymentIntentResponse> {
    console.log(`[MOCK PROVIDER] Creating intent for ${amount} ${currency} with key ${idempotencyKey}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      providerTxId: `mock_tx_${uuidv4().replace(/-/g, '')}`,
      status: 'PENDING',
      clientSecret: `mock_secret_${uuidv4()}`
    };
  }

  /**
   * Simulates checking the real-time status of a transaction on the provider's end.
   */
  async getPaymentStatus(providerTxId: string): Promise<'PENDING' | 'CAPTURED' | 'FAILED' | 'CANCELLED'> {
    console.log(`[MOCK PROVIDER] Checking status for ${providerTxId}`);
    // In a real system this would call out to the provider API.
    // Here we just return a static response or randomly simulate states.
    return 'CAPTURED'; 
  }

  /**
   * Simulates a refund.
   */
  async refundPayment(providerTxId: string): Promise<boolean> {
    console.log(`[MOCK PROVIDER] Refunding ${providerTxId}`);
    return true;
  }
}
