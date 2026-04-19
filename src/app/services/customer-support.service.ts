import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CustomerSupportService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
  }

  // Support Tickets
  getUserTickets(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/support/tickets`,
      { headers: this.getHeaders() }
    );
  }

  getTicketDetails(ticketId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/support/tickets/${ticketId}`,
      { headers: this.getHeaders() }
    );
  }

  createTicket(ticketData: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/support/tickets/create`,
      ticketData,
      { headers: this.getHeaders() }
    );
  }

  updateTicket(ticketId: string, ticketData: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/support/tickets/${ticketId}`,
      ticketData,
      { headers: this.getHeaders() }
    );
  }

  closeTicket(ticketId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/support/tickets/${ticketId}/close`,
      {},
      { headers: this.getHeaders() }
    );
  }

  deleteTicket(ticketId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/support/tickets/${ticketId}`,
      { headers: this.getHeaders() }
    );
  }

  // Ticket Responses
  addTicketResponse(ticketId: string, responseData: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/support/tickets/${ticketId}/responses`,
      responseData,
      { headers: this.getHeaders() }
    );
  }

  // FAQ
  getFAQs(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/support/faq`,
      { headers: this.getHeaders() }
    );
  }

  getFAQByCategory(category: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/support/faq/category/${category}`,
      { headers: this.getHeaders() }
    );
  }

  markFAQHelpful(faqId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/support/faq/${faqId}/helpful`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // Contact Form
  sendContactMessage(messageData: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/support/contact`,
      messageData,
      { headers: this.getHeaders() }
    );
  }

  // Support Categories
  getSupportCategories(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/support/categories`,
      { headers: this.getHeaders() }
    );
  }
}
