import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

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
    geometry?: any;
  };
  bus?: {
    bus_number: string;
    model: string;
  };
}

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
  standalone: false,
})
export class MapPage implements OnInit {
  schedules: Schedule[] = [];
  currentSchedule: Schedule | null = null;
  allRoutes: Schedule[] = [];
  mapRouteGeoJson: any = null; 
  selectedSegment: string = 'current';

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadDriverSchedules();
  }

  loadDriverSchedules() {
    const driverId = Number(this.authService.getDriverId());
    if (!driverId) return;

    this.apiService.getDriverSchedules(driverId).subscribe({
      next: (response) => {
        if (response.success && response.schedules) {
          const now = new Date();
          const todayStr = now.toISOString().split('T')[0];
          const todaySchedules: Schedule[] = response.schedules.today || [];
          const upcomingSchedules: Schedule[] = response.schedules.upcoming || [];

          // Find current schedule
          this.currentSchedule = todaySchedules.find(s => {
            if (s.date !== todayStr) return false;
            const start = new Date(`${s.date}T${s.start_time}`);
            const end = new Date(`${s.date}T${s.end_time}`);
            return (s.status === 'accepted' || s.status === 'active') && now >= start && now < end;
          }) || null;

          if (!this.currentSchedule) {
            this.currentSchedule = upcomingSchedules.find(s => 
              (s.status === 'accepted' || s.status === 'active')
            ) || null;
          }

          this.allRoutes = [...todaySchedules, ...upcomingSchedules];

          if (this.currentSchedule?.route?.geometry) {
            let geometry = this.currentSchedule.route.geometry;

            if (typeof geometry === 'string') {
              try {
                geometry = JSON.parse(geometry);
              } catch (e) {
                console.error('Invalid geometry JSON:', geometry);
                geometry = null;
              }
            }

            if (geometry && !geometry.type && geometry.coordinates) {
              geometry = {
                type: 'LineString',
                coordinates: geometry.coordinates
              };
            }

            if (geometry && geometry.type === 'LineString') {
              geometry.coordinates = geometry.coordinates.map(
                (pair: any[]) => pair.map(Number)
              );
            }
            this.mapRouteGeoJson = geometry;
            console.log('Route geometry loaded:', this.mapRouteGeoJson);
          } else {
            this.mapRouteGeoJson = null;
            console.warn('No geometry for current schedule');
          }
        }
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        this.currentSchedule = null;
        this.allRoutes = [];
        this.mapRouteGeoJson = null;
      }
    });
  }

  getScheduleTime(schedule: Schedule): string {
    return `${this.formatTime(schedule.start_time)} - ${this.formatTime(schedule.end_time)}`;
  }

  getScheduleRoute(schedule: Schedule): string {
    return schedule.route?.name || '';
  }

  getScheduleDestination(schedule: Schedule): string {
    return schedule.route?.end_location || '';
  }

  refreshSchedules() {
    this.loadDriverSchedules();
  }

  startSchedule(schedule: Schedule) {
    this.apiService.startSchedule(schedule.id).subscribe({
      next: (response) => {
        if (response.success) {
          schedule.status = 'active';
          this.loadDriverSchedules();
        }
      },
      error: (error) => {
        console.error('Error starting schedule:', error);
      }
    });
  }

  completeSchedule(schedule: Schedule) {
    if (schedule.status === 'accepted') {
      this.apiService.startSchedule(schedule.id).subscribe({
        next: (startResponse) => {
          if (startResponse.success) {
            schedule.status = 'active';
            this.apiService.completeSchedule(schedule.id).subscribe({
              next: (completeResponse) => {
                if (completeResponse.success) {
                  schedule.status = 'completed';
                  this.loadDriverSchedules();
                }
              },
              error: (error) => {
                console.error('Error completing schedule after starting:', error);
              }
            });
          }
        },
        error: (error) => {
          console.error('Error starting schedule before completing:', error);
        }
      });
    } else {
      this.apiService.completeSchedule(schedule.id).subscribe({
        next: (response) => {
          if (response.success) {
            schedule.status = 'completed';
            this.loadDriverSchedules();
          }
        },
        error: (error) => {
          console.error('Error completing schedule:', error);
        }
      });
    }
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
}