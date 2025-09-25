import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router'; // ADD THIS IMPORT
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';

interface RouteGeometry {
  type: string; // e.g., "LineString"
  coordinates: [number, number][]; // [lng, lat] pairs
}

interface Schedule {
  id: number;
  route_id: number;
  driver_id: number;
  bus_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  fare_regular?: number;
  fare_aircon?: number;
  notes?: string;
  route?: {
    id: number;
    name: string;
    start_location: string;
    end_location: string;
    distance_km?: number;
    estimated_duration?: number;
    geometry?: RouteGeometry; // ← ADD THIS
  };
  bus?: {
    id: number;
    bus_number: string;
    model: string;
    is_aircon?: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface Summary {
  today_schedules: number;
  future_schedules: number;
  active_today: number;
  completed_today: number;
}

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.page.html',
  styleUrls: ['./schedule.page.scss'],
  standalone: false
})

export class SchedulePage implements OnInit, OnDestroy {
  schedules: Schedule[] = [];
  todaySchedules: Schedule[] = [];
  upcomingSchedules: Schedule[] = [];
  completedSchedules: Schedule[] = [];
  isLoading: boolean = false;
  error: string = '';
  driverId: string = ''; // Keep as string but handle null properly
  selectedSegment: string = 'today';
  summary: Summary = {
    today_schedules: 0,
    future_schedules: 0,
    active_today: 0,
    completed_today: 0
  };
  
  private subscription?: Subscription;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router // ADD THIS TO CONSTRUCTOR
  ) {}

  ngOnInit() {
    // Get the logged-in driver ID with proper null handling
    const driverId = this.authService.getDriverId();
    
    if (!driverId) {
      console.error('No driver ID found - redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
    
    this.driverId = driverId; // Now we know it's not null
    console.log(`Schedule page initialized for driver ID: ${this.driverId}`);
    this.loadSchedules();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onSegmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }

  async loadSchedules() {
    // Security check - make sure user is still logged in
    if (!this.driverId) {
      console.error('No driver ID - user not logged in');
      this.router.navigate(['/login']);
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Loading your schedules...',
      duration: 10000
    });
    await loading.present();

    this.isLoading = true;
    this.error = '';

    try {
      const driverIdNum = parseInt(this.driverId);
      console.log(`Loading schedules for logged-in driver ${driverIdNum}`);
      
      this.subscription = this.apiService.getDriverSchedules(driverIdNum).subscribe({
        next: (response) => {
          console.log('Schedules response:', response);
          
          if (response.success && response.schedules) {
            this.schedules = response.schedules.all || [];
            this.todaySchedules = response.schedules.today || [];
            this.upcomingSchedules = response.schedules.upcoming || [];
            this.completedSchedules = this.schedules.filter(s => s.status === 'completed');
            
            this.updateSummary();
            console.log(`Loaded ${this.schedules.length} schedules for driver ${this.driverId}`);
          } else {
            this.error = 'No schedules found for your account';
            console.log('No schedules found for this driver');
          }
        },
        error: (error) => {
          console.error('Error loading schedules:', error);
          this.error = 'Failed to load your schedules. Please try again.';
        }
      });
      
    } catch (error) {
      console.error('Error in loadSchedules:', error);
      this.error = 'Error loading schedules';
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  private updateSummary() {
    // Use the categorized arrays from the API response
    const todaySchedules = this.todaySchedules || [];
    const upcomingSchedules = this.upcomingSchedules || [];
    const allSchedules = this.schedules || [];

    // Count active and completed for today
    const activeToday = todaySchedules.filter(s => s.status === 'active').length;
    const completedToday = todaySchedules.filter(s => s.status === 'completed').length;

    this.summary = {
      today_schedules: todaySchedules.length,
      future_schedules: upcomingSchedules.length,
      active_today: activeToday,
      completed_today: completedToday
    };
  }

  private loadMockSchedules() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    this.schedules = [
      {
        id: 1,
        route_id: 1,
        driver_id: parseInt(this.driverId),
        bus_id: 1,
        date: today,
        start_time: '08:30:00',
        end_time: '10:30:00',
        status: 'scheduled',
        fare_regular: 15.00,
        fare_aircon: 20.00,
        notes: 'Please arrive 15 minutes early for vehicle inspection.',
        route: {
          id: 1,
          name: 'Route 101',
          start_location: 'Downtown Terminal',
          end_location: 'Airport',
          distance_km: 25,
          estimated_duration: 120
        },
        bus: {
          id: 1,
          bus_number: 'BUS-001',
          model: 'Toyota Coaster',
          is_aircon: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        route_id: 2,
        driver_id: parseInt(this.driverId),
        bus_id: 2,
        date: tomorrow,
        start_time: '14:00:00',
        end_time: '16:00:00',
        status: 'scheduled',
        fare_regular: 12.00,
        fare_aircon: 16.00,
        notes: 'Rush hour route - expect heavy traffic.',
        route: {
          id: 2,
          name: 'Route 102',
          start_location: 'Mall',
          end_location: 'University',
          distance_km: 18,
          estimated_duration: 90
        },
        bus: {
          id: 2,
          bus_number: 'BUS-002',
          model: 'Isuzu NPR',
          is_aircon: false
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    this.todaySchedules = this.schedules.filter(s => s.date === today);
    this.upcomingSchedules = this.schedules.filter(s => s.date > today);
    this.completedSchedules = [];
    this.updateSummary();
  }

  getRouteDetails(schedule: Schedule): string {
    return schedule.route?.name || `Route ${schedule.route_id}`;
  }

  getBusDetails(schedule: Schedule): string {
    if (schedule.bus) {
      return `${schedule.bus.bus_number} - ${schedule.bus.model}`;
    }
    return `Bus ${schedule.bus_id}`;
  }

  canAccept(schedule: Schedule): boolean {
    return schedule.status === 'scheduled';
  }

  canDecline(schedule: Schedule): boolean {
    return schedule.status === 'scheduled';
  }

  canStart(schedule: Schedule): boolean {
    return schedule.status === 'accepted';
  }

  canComplete(schedule: Schedule): boolean {
    return schedule.status === 'active';
  }

  async acceptSchedule(schedule: Schedule) {
    const alert = await this.alertController.create({
      header: 'Accept Schedule',
      message: `Accept the schedule for ${schedule.route?.name}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Accept',
          handler: async () => {
            try {
              const response = await this.apiService.post(`schedules/${schedule.id}/accept`, {}).toPromise();
              if (response && response.success) {
                await this.loadSchedules();
                const toast = await this.toastController.create({
                  message: 'Schedule accepted successfully!',
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
              }
            } catch (error) {
              console.error('Error accepting schedule:', error);
              const toast = await this.toastController.create({
                message: 'Failed to accept schedule',
                duration: 2000,
                color: 'danger'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async declineSchedule(schedule: Schedule) {
    const alert = await this.alertController.create({
      header: 'Decline Schedule',
      message: `Decline the schedule for ${schedule.route?.name}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Decline',
          handler: async () => {
            try {
              const response = await this.apiService.declineSchedule(schedule.id).toPromise();
              if (response.success) {
                schedule.status = 'declined';
                this.updateSummary();
                const toast = await this.toastController.create({
                  message: 'Schedule declined',
                  duration: 2000,
                  color: 'warning'
                });
                await toast.present();
              }
            } catch (error) {
              console.error('Error declining schedule:', error);
              const toast = await this.toastController.create({
                message: 'Failed to decline schedule',
                duration: 2000,
                color: 'danger'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async startSchedule(schedule: Schedule) {
    try {
      const response = await this.apiService.startSchedule(schedule.id).toPromise();
      if (response.success) {
        // Reload schedules after starting
        await this.loadSchedules();
        const toast = await this.toastController.create({
          message: 'Trip started successfully!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Error starting schedule:', error);
      const toast = await this.toastController.create({
        message: 'Failed to start trip',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async completeSchedule(schedule: Schedule) {
    try {
      const response = await this.apiService.completeSchedule(schedule.id).toPromise();
      if (response.success) {
        // Reload schedules after completing
        await this.loadSchedules();
        const toast = await this.toastController.create({
          message: 'Trip completed successfully!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Error completing schedule:', error);
      const toast = await this.toastController.create({
        message: 'Failed to complete trip',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'scheduled': return 'primary';
      case 'accepted': return 'secondary';
      case 'completed': return 'medium';
      case 'declined':
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  }

  formatTime(timeString: string): string {
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  async refreshSchedules(event?: any) {
    await this.loadSchedules();
    if (event) {
      event.target.complete();
    }
  }
}