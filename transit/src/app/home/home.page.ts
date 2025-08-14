import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

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
    private router: Router
  ) {}

  ngOnInit() {
    this.updateCurrentTime();
    // Update time every minute
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

  navigateToProfile() {
    this.router.navigate(['/tabs/student']);
  }
}
