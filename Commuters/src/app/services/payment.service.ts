import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';

interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  buyer: {
    email: string;
    phone: string;
  };
  metadata?: any;
}

interface PaymentResponse {
  success: boolean;
  data?: any;
  message?: string;
}

interface ReservationData {
  origin: string;
  destination: string;
  passengerType: string;
  fare: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  
  // Payment API Configuration - frontend should call backend endpoints
  private readonly PAYMENT_CONFIG = {
    // backend base URL (the Laravel API)
    baseUrl: environment.apiUrl || ''
  };
  // For quick sandbox testing (dev-only), also expose paymaya config from environment
  private readonly PAYMAYA = environment.payment?.paymaya || null;

  constructor(private http: HttpClient) {}

  /**
   * Process PayMaya payment
   */
  async processPayMayaPayment(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    // If a PayMaya public key is present in environment, we can call PayMaya directly (dev-only)
    if (this.PAYMAYA && this.PAYMAYA.publicKey && this.PAYMAYA.baseUrl) {
      try {
        const checkoutResp = await this.createCheckoutSession(paymentRequest);
        if (checkoutResp.success) return checkoutResp;
        // fallthrough to backend or simulation
      } catch (err) {
        console.warn('Direct PayMaya call failed, will try backend or simulation', err);
      }
    }

    // Delegate to backend if available
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = {
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      description: paymentRequest.description,
      buyer: paymentRequest.buyer,
      metadata: paymentRequest.metadata || {}
    };

    try {
      const resp: any = await this.http.post(`${this.PAYMENT_CONFIG.baseUrl}/payments/maya/create`, body, { headers }).toPromise();
      if (resp && resp.success && resp.data) {
        return { success: true, data: resp.data };
      }
    } catch (err) {
      console.warn('Backend checkout creation failed, falling back to simulation:', err);
    }

    // fallback to simulation
    const simulated = { requestReferenceNumber: this.generateReferenceNumber(), totalAmount: { value: paymentRequest.amount, currency: paymentRequest.currency } };
    return await this.simulatePaymentCompletion(simulated);
  }

  /**
   * Create PayMaya checkout session
   */
  private async createCheckoutSession(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    if (!this.PAYMAYA || !this.PAYMAYA.publicKey || !this.PAYMAYA.baseUrl) {
      return { success: false, message: 'PayMaya configuration not available in environment' };
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(this.PAYMAYA.publicKey + ':')}`
    });

    const checkoutData = {
      totalAmount: {
        value: paymentRequest.amount,
        currency: paymentRequest.currency
      },
      buyer: {
        firstName: paymentRequest.buyer.email.split('@')[0],
        lastName: 'Customer',
        contact: {
          phone: paymentRequest.buyer.phone,
          email: paymentRequest.buyer.email
        }
      },
      items: [{
        name: paymentRequest.description,
        quantity: 1,
        code: 'BUS_TICKET',
        description: paymentRequest.description,
        amount: {
          value: paymentRequest.amount,
          currency: paymentRequest.currency
        },
        totalAmount: {
          value: paymentRequest.amount,
          currency: paymentRequest.currency
        }
      }],
      redirectUrl: {
        success: `${window.location.origin}/payment/success`,
        failure: `${window.location.origin}/payment/failure`,
        cancel: `${window.location.origin}/payment/cancel`
      },
      requestReferenceNumber: this.generateReferenceNumber(),
      metadata: paymentRequest.metadata || {}
    };

    try {
      const response = await this.http.post(
        `${this.PAYMAYA.baseUrl}/checkout/v1/checkouts`,
        checkoutData,
        { headers }
      ).toPromise();

      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      console.error('Checkout creation error (client):', error);
      return {
        success: false,
        message: error.error?.message || 'Failed to create checkout session (client)'
      };
    }
  }

  /**
   * Simulate payment completion for demo purposes
   * In real implementation, this would be handled by webhooks
   */
  private async simulatePaymentCompletion(checkoutData: any): Promise<PaymentResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate 90% success rate for demo
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      return {
        success: true,
        data: {
          id: this.generatePaymentId(),
          referenceNumber: checkoutData.requestReferenceNumber,
          status: 'PAYMENT_SUCCESS',
          amount: checkoutData.totalAmount.value,
          currency: checkoutData.totalAmount.currency,
          paymentMethod: 'paymaya',
          transactionDate: new Date().toISOString()
        }
      };
    } else {
      return {
        success: false,
        message: 'Payment was declined by your bank. Please try a different payment method.'
      };
    }
  }

  /**
   * Create cash payment reservation
   */
  async createCashReservation(reservationData: ReservationData): Promise<PaymentResponse> {
    // Simulate API call to create reservation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      data: {
        id: this.generateReservationId(),
        reservationNumber: this.generateReservationNumber(),
        expiresAt: new Date(Date.now() + (30 * 60 * 1000)).toISOString(), // 30 minutes from now
        ...reservationData
      }
    };
  }

  /**
   * Verify payment status (for webhook handling)
   */
  async verifyPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    // Forward verification to backend which holds secret keys
    try {
      const resp: any = await this.http.get(`${this.PAYMENT_CONFIG.baseUrl}/payments/maya/verify/${encodeURIComponent(paymentId)}`).toPromise();
      if (resp && resp.success) return { success: true, data: resp.data };
      return { success: false, message: resp?.message || 'Verification failed' };
    } catch (err) {
      console.warn('verifyPaymentStatus failed:', err);
      return { success: false, message: 'Verification failed (client)'};
    }
  }

  /**
   * Handle PayMaya webhook (for backend integration)
   */
  handleWebhook(webhookData: any): PaymentResponse {
    try {
      // Verify webhook signature (implement based on PayMaya documentation)
      // Process the payment status update
      
      return {
        success: true,
        data: {
          paymentId: webhookData.paymentId,
          status: webhookData.status,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        message: 'Webhook processing failed'
      };
    }
  }

  /**
   * Generate reference number
   */
  private generateReferenceNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BUS${timestamp.slice(-8)}${random}`;
  }

  /**
   * Generate payment ID
   */
  private generatePaymentId(): string {
    return 'PAY_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Generate reservation ID
   */
  private generateReservationId(): string {
    return 'RES_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Generate reservation number
   */
  private generateReservationNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `R${timestamp.slice(-6)}${random}`;
  }

  /**
   * Format amount for PayMaya (they expect amount in centavos)
   */
  private formatAmount(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Get payment configuration (for debugging)
   */
  getPaymentConfig() {
    return {
      baseUrl: this.PAYMENT_CONFIG.baseUrl,
      // secret keys are not available in client
      hasSecretKey: false
    };
  }
}