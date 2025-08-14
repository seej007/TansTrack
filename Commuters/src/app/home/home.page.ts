import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
currentTime: string = '';
ticket: any[] = [];
ticketName: string = '';
validUntil: string = '';
trips: any[] = [];
recentTrips: any[] = [];
supportMessage: string = '';

  constructor(private toastController: ToastController) {}

 ngOnInit() {
    this.updateCurrentTime();
    setInterval(() => {
      this.updateCurrentTime();
    }, 60000);
  }

  updateCurrentTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }
  addTicket() {
    if (this.ticketName && this.validUntil) {
      this.ticket.push({
        name: this.ticketName,
        validUntil: this.validUntil
      });
      this.ticketName = '';
      this.validUntil = '';
    }
  }
  viewTicket() {
    // Logic to view ticket details
    console.log('Viewing ticket:', this.ticket);
  }
  removeTicket(index: number) {
    this.ticket.splice(index, 1);
  }
  getTicketIcon(ticketName: string): string {
    switch (ticketName.toLowerCase()) {
      case 'single ride':
        return 'bus-outline';
      case 'day pass':
        return 'calendar-outline';
      case 'monthly pass':
        return 'calendar-number-outline';
      default:
        return 'ticket-outline';
    }
  }
activateTicket(ticket: any) {
    

    console.log(`Activating ticket: ${ticket.name}`);
    
}
getRecentTrips() {
    // Simulated recent trips data
    this.recentTrips = [
      { route: 'Route A', date: '2023-10-01', time: '08:30 AM' },
      { route: 'Route B', date: '2023-10-02', time: '09:15 AM' },
      { route: 'Route C', date: '2023-10-03', time: '07:45 AM' }
    ];
  }

  // Support Methods
  async sendSupportMessage() {
    if (this.supportMessage.trim()) {
      console.log('Sending support message:', this.supportMessage);
      
      // Simulate sending message
      const toast = await this.toastController.create({
        message: 'Message sent! Our support team will respond shortly.',
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      
      this.supportMessage = '';
    }
  }

  async connectToLiveAgent() {
    console.log('Connecting to live agent...');
    
    const toast = await this.toastController.create({
      message: 'Connecting you to a live agent. Please wait...',
      duration: 3000,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
    
    // In a real app, this would initiate a live chat or call
  }
}