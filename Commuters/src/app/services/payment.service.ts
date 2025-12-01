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
  private readonly PAYMANGO = environment.payment?.paymango || null;

  constructor(private http: HttpClient) {}

 

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