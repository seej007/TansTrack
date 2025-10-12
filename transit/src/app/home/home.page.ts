import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

interface Schedule {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  route?: {
    id: number;
    name: string;
    start_location: string;
    end_location: string;
  };
  bus?: {
    bus_number: string;
    model: string;
  };
}

interface Notification {
  icon: string;
  color: string;
  title: string;
  message: string;
  time: string;
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
  greeting: string = 'Good Morning';
  projectedPassengers: number = 38;
  userName: string = 'Driver';

  currentSchedule: Schedule | null = null;
  nextSchedule: Schedule | null = null;
  mapRouteGeoJson: any = null;

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
    private apiService: ApiService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Set user name from AuthService
    const user = this.authService.getCurrentUser();
    if (user && user.name) {
      this.userName = user.name;
    }

    this.updateGreeting();
    this.updateCurrentTime();
    setInterval(() => {
      this.updateGreeting();
      this.updateCurrentTime();
    }, 60000);

    this.loadSchedules();
  }

  updateGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.greeting = 'Good Morning';
    } else if (hour < 18) {
      this.greeting = 'Good Afternoon';
    } else {
      this.greeting = 'Good Evening';
    }
  }

  updateCurrentTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  reloadSchedules() {
    this.loadSchedules();
  }

  loadSchedules() {
    const driverId = Number(this.authService.getDriverId());
    if (!driverId) return;

    this.apiService.getDriverSchedules(driverId).subscribe({
      next: (response) => {
        if (response.success && response.schedules) {
          const now = new Date();
          const todayStr = now.toISOString().split('T')[0];
          const todaySchedules: Schedule[] = response.schedules.today || [];
          const upcomingSchedules: Schedule[] = response.schedules.upcoming || [];

          // Find current schedule: today, accepted/active, and time window
          this.currentSchedule = todaySchedules.find(s => {
            if (s.status !== 'accepted' && s.status !== 'active') return false;
            if (s.date !== todayStr) return false;
            // Check time window
            const start = new Date(`${s.date}T${s.start_time}`);
            const end = new Date(`${s.date}T${s.end_time}`);
            return now >= start && now < end;
          }) || null;

          // Find next schedule: today or future, scheduled/accepted, and start time > now
          // If currentSchedule exists, nextSchedule is the next one after current
          let allUpcoming = [
            ...todaySchedules.filter(s => {
              const start = new Date(`${s.date}T${s.start_time}`);
              return start > now && (s.status === 'scheduled' || s.status === 'accepted');
            }),
            ...upcomingSchedules.filter(s => s.status === 'scheduled' || s.status === 'accepted')
          ];
          // Sort by date and start_time
          allUpcoming = allUpcoming.sort((a, b) => {
            const aDate = new Date(`${a.date}T${a.start_time}`);
            const bDate = new Date(`${b.date}T${b.start_time}`);
            return aDate.getTime() - bDate.getTime();
          });
          this.nextSchedule = allUpcoming.length > 0 ? allUpcoming[0] : null;
          
          // Load route geometry for current schedule
          this.loadRouteGeometry();
        } else {
          this.currentSchedule = null;
          this.nextSchedule = null;
          this.mapRouteGeoJson = null;
        }
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        this.currentSchedule = null;
        this.nextSchedule = null;
      }
    });
  }

  loadRouteGeometry() {
    if (!this.currentSchedule?.route) {
      this.mapRouteGeoJson = null;
      return;
    }

    // Get route details with geometry
    this.apiService.getRoute(this.currentSchedule.route.id).subscribe({
      next: (response: any) => {
        if (response.success && response.route?.geometry) {
          try {
            // Parse geometry from route
            if (typeof response.route.geometry === 'string') {
              this.mapRouteGeoJson = JSON.parse(response.route.geometry);
            } else {
              this.mapRouteGeoJson = response.route.geometry;
            }
          } catch (error) {
            console.error('Error parsing route geometry:', error);
            this.mapRouteGeoJson = null;
          }
        } else {
          this.mapRouteGeoJson = null;
        }
      },
      error: (error: any) => {
        console.error('Error loading route geometry:', error);
        this.mapRouteGeoJson = null;
      }
    });
  }

  getScheduleTime(schedule: Schedule | null): string {
    if (!schedule) return '';
    return `${this.formatTime(schedule.start_time)} - ${this.formatTime(schedule.end_time)}`;
  }

  getScheduleRoute(schedule: Schedule | null): string {
    if (!schedule) return '';
    return schedule.route?.name || '';
  }

  getScheduleDestination(schedule: Schedule | null): string {
    if (!schedule) return '';
    return schedule.route?.end_location || '';
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
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