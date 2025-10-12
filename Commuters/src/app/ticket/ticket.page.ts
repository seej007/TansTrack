import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface TicketData {
  ticketId: string;
  origin: string;
  destination: string;
  passengerType: string;
  fare: number;
  busNumber: string;
  driverName: string;
  route: string;
  timestamp: Date;
  status: 'valid' | 'used' | 'expired';
}

@Component({
  selector: 'app-ticket',
  templateUrl: './ticket.page.html',
  styleUrls: ['./ticket.page.scss'],
  standalone: false
})
export class TicketPage implements OnInit {
  ticket: TicketData | null = null;
  qrCodeData: string = '';
  loading: boolean = true;
  error: string = '';

  // Mock data - in real app, this would come from payment success
  private mockTicketData: TicketData = {
    ticketId: 'TKT-2025092901',
    origin: 'Downtown Terminal',
    destination: 'University Main Gate',
    passengerType: 'Student',
    fare: 12.00,
    busNumber: 'ABC-123',
    driverName: 'John Doe',
    route: 'Route 1: Downtown - University',
    timestamp: new Date(),
    status: 'valid'
  };

  // Additional mock ticket details
  ticketDetails = {
    distance: '8.5 km',
    estimatedDuration: '25 minutes',
    originalFare: 15.00,
    discount: 3.00,
    paymentMethod: 'PayMaya',
    transactionId: 'TXN-2025092901',
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    boardingInstructions: [
      'Present QR code to driver when boarding',
      'Keep ticket visible during journey',
      'Valid for single use only'
    ]
  };

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.loadTicketData();
  }

  loadTicketData() {
    // In real app, get ticket data from route params or service
    // For now, using mock data
    setTimeout(() => {
      this.ticket = this.mockTicketData;
      this.generateQRCode();
      this.loading = false;
    }, 1000);
  }

  generateQRCode() {
    if (!this.ticket) return;

    // QR Code contains ticket verification data
    const qrData = {
      id: this.ticket.ticketId,
      origin: this.ticket.origin,
      destination: this.ticket.destination,
      fare: this.ticket.fare,
      bus: this.ticket.busNumber,
      timestamp: this.ticket.timestamp.getTime(),
      passenger: this.ticket.passengerType
    };

    this.qrCodeData = JSON.stringify(qrData);
  }

  shareTicket() {
    if (!this.ticket) return;

    const shareData = {
      title: 'Bus Ticket',
      text: `Ticket ${this.ticket.ticketId} - ${this.ticket.origin} to ${this.ticket.destination}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback for browsers that don't support Web Share API
      this.copyToClipboard(shareData.text);
    }
  }

  private copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Show success message
      console.log('Ticket details copied to clipboard');
    });
  }

  downloadTicket() {
    if (!this.ticket) return;

    const ticketText = `
Bus Ticket - ${this.ticket.ticketId}
From: ${this.ticket.origin}
To: ${this.ticket.destination}
Passenger: ${this.ticket.passengerType}
Fare: ₱${this.ticket.fare.toFixed(2)}
Bus: ${this.ticket.busNumber}
Driver: ${this.ticket.driverName}
Route: ${this.ticket.route}
Date: ${this.ticket.timestamp.toLocaleString()}
Status: ${this.ticket.status.toUpperCase()}
    `;

    const blob = new Blob([ticketText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${this.ticket.ticketId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'valid': return 'success';
      case 'used': return 'warning';
      case 'expired': return 'danger';
      default: return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'valid': return 'checkmark-circle';
      case 'used': return 'time';
      case 'expired': return 'close-circle';
      default: return 'help-circle';
    }
  }
}