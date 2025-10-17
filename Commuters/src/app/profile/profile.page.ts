import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

interface PaymentMethod {
  type: 'gcash' | 'paymaya' | 'card';
  number: string;
  name: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  // User profile data
  userProfile = {
    name: '',
    email: '',
    phone: '',
    passengerType: 'Regular' as 'Regular' | 'Student' | 'Senior' | 'PWD'
  };

  // Payment methods
  paymentMethods: PaymentMethod[] = [];
  
  // New payment method form
  newPaymentMethod = {
    type: 'gcash' as 'gcash' | 'paymaya' | 'card',
    number: '',
    name: ''
  };

  isEditing = false;
  showAddPaymentForm = false;

  constructor(
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    // Load from localStorage or API
    const savedProfile = localStorage.getItem('commuterProfile');
    if (savedProfile) {
      this.userProfile = JSON.parse(savedProfile);
    }

    const savedPayments = localStorage.getItem('paymentMethods');
    if (savedPayments) {
      this.paymentMethods = JSON.parse(savedPayments);
    }
  }

  saveProfile() {
    localStorage.setItem('commuterProfile', JSON.stringify(this.userProfile));
    this.isEditing = false;
    this.showToast('Profile saved successfully!', 'success');
  }

  addPaymentMethod() {
    if (!this.newPaymentMethod.number || !this.newPaymentMethod.name) {
      this.showToast('Please fill in all fields', 'warning');
      return;
    }

    const newMethod: PaymentMethod = {
      type: this.newPaymentMethod.type,
      number: this.newPaymentMethod.number,
      name: this.newPaymentMethod.name,
      isDefault: this.paymentMethods.length === 0 // First one is default
    };

    this.paymentMethods.push(newMethod);
    localStorage.setItem('paymentMethods', JSON.stringify(this.paymentMethods));
    
    // Reset form
    this.newPaymentMethod = {
      type: 'gcash',
      number: '',
      name: ''
    };
    this.showAddPaymentForm = false;
    this.showToast('Payment method added!', 'success');
  }

  async removePaymentMethod(index: number) {
    const alert = await this.alertController.create({
      header: 'Remove Payment Method',
      message: 'Are you sure you want to remove this payment method?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            this.paymentMethods.splice(index, 1);
            localStorage.setItem('paymentMethods', JSON.stringify(this.paymentMethods));
            this.showToast('Payment method removed', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  setDefaultPayment(index: number) {
    this.paymentMethods.forEach((method, i) => {
      method.isDefault = i === index;
    });
    localStorage.setItem('paymentMethods', JSON.stringify(this.paymentMethods));
    this.showToast('Default payment method updated', 'success');
  }

  getPaymentIcon(type: string): string {
    switch(type) {
      case 'gcash': return 'phone-portrait';
      case 'paymaya': return 'wallet';
      case 'card': return 'card';
      default: return 'cash';
    }
  }

  getPaymentLabel(type: string): string {
    switch(type) {
      case 'gcash': return 'GCash';
      case 'paymaya': return 'PayMaya';
      case 'card': return 'Credit/Debit Card';
      default: return type;
    }
  }

  maskNumber(number: string): string {
    if (number.length <= 4) return number;
    return '•••• ' + number.slice(-4);
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

}
