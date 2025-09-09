import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

interface Schedule {
  time: string;
  route: string;
  destination: string;
}

interface Notification {
  title: string;
  message: string;
  time: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  currentTime: string = '';
  currentPassengers: number = 24;
  projectedPassengers: number = 38;
  
  currentSchedule: Schedule = {
    time: '08:30 AM - 10:30 AM',
    route: 'Ocean Central Station',
    destination: 'Downtown Terminal'
  };
  
  nextSchedule: Schedule = {
    time: '11:00 AM - 12:30 PM',
    route: 'Expo Boulevard Express',
    destination: 'Parks Downtown Terminal'
  };
  
  recentNotifications: Notification[] = [
    {
      title: 'Schedule Update',
      message: 'Your next route has been updated to start 15 minutes early.',
      time: 'Sep 16, 2023',
      icon: 'time',
      color: 'primary'
    },
    {
      title: 'Route Information',
      message: 'New stop added to Route 45. Check schedule for details.',
      time: 'Sep 15, 2023',
      icon: 'information-circle',
      color: 'success'
    },
    {
      title: 'Maintenance Reminder',
      message: 'Vehicle maintenance scheduled for tomorrow at 3:00 PM.',
      time: 'Sep 14, 2023',
      icon: 'build',
      color: 'warning'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

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

  async navigateToProfile() {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: async () => {
            try {
              await this.authService.performLogout();
              
              const toast = await this.toastController.create({
                message: 'Successfully logged out',
                duration: 2000,
                color: 'success',
                position: 'bottom'
              });
              await toast.present();
              
            } catch (error) {
              console.error('Logout error:', error);
              
              const toast = await this.toastController.create({
                message: 'Error during logout. Please try again.',
                duration: 3000,
                color: 'danger',
                position: 'bottom'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }
}