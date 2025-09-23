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
    geometry?: any; // GeoJSON or coordinates
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

          // Find current schedule: today, accepted/active, and time window
          this.currentSchedule = todaySchedules.find(s => {
            if (s.date !== todayStr) return false;
            const start = new Date(`${s.date}T${s.start_time}`);
            const end = new Date(`${s.date}T${s.end_time}`);
            return (s.status === 'accepted' || s.status === 'active') && now >= start && now < end;
          }) || null;

          // If no current schedule for today, pick the next upcoming accepted/active schedule
          if (!this.currentSchedule) {
            this.currentSchedule = upcomingSchedules.find(s => 
              (s.status === 'accepted' || s.status === 'active')
            ) || null;
          }

          // All assigned routes (scheduled, accepted, active, completed)
          this.allRoutes = [
            ...todaySchedules,
            ...upcomingSchedules
          ];

          // Set map route GeoJSON for current schedule
          if (this.currentSchedule && this.currentSchedule.route) {
            let coords: number[][] = [];

            // Use geometry coordinates if available
            if (
              this.currentSchedule.route.geometry &&
              Array.isArray(this.currentSchedule.route.geometry.coordinates) &&
              this.currentSchedule.route.geometry.coordinates.length >= 2
            ) {
              coords = this.currentSchedule.route.geometry.coordinates.map((coord: any[]) => [
                parseFloat(coord[0]),
                parseFloat(coord[1])
              ]);
            }

            // If still no valid coordinates, fallback to mock
            if (coords.length < 2) {
              coords = [
                [123.920994, 10.311008],
                [123.970000, 11.050000]
              ];
            }

            // Call the directions API to get the road-following route
            this.setRoadPathway(coords);
          } else {
            // Fallback straight line
            this.mapRouteGeoJson = {
              type: 'LineString',
              coordinates: [
                [123.920994, 10.311008],
                [123.970000, 11.050000]
              ]
            };
          }
          
          if (this.currentSchedule && this.currentSchedule.route) {
            let coords: number[][] = [];

            // Use geometry coordinates if available
            if (
              this.currentSchedule.route.geometry &&
              Array.isArray(this.currentSchedule.route.geometry.coordinates) &&
              this.currentSchedule.route.geometry.coordinates.length >= 2
            ) {
              coords = this.currentSchedule.route.geometry.coordinates.map((coord: any[]) => [
                parseFloat(coord[0]),
                parseFloat(coord[1])
              ]);
            }

            // Only show route if there are valid coordinates
            if (coords.length >= 2) {
              this.setRoadPathway(coords);
            } else {
              // No valid route, do not show any pathway
              this.mapRouteGeoJson = null;
            }
          } else {
            // No accepted/active schedule: do NOT show any route
            this.mapRouteGeoJson = null;
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
    // If schedule is accepted, start it first
    if (schedule.status === 'accepted') {
      this.apiService.startSchedule(schedule.id).subscribe({
        next: (startResponse) => {
          if (startResponse.success) {
            schedule.status = 'active';
            // Now complete the schedule
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
      // If already active, just complete
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

  async setRoadPathway(coords: number[][]) {
    const coordsStr = coords.map(coord => coord.join(',')).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}?geometries=geojson&overview=full&access_token=pk.eyJ1Ijoic2Vlam83IiwiYSI6ImNtY3ZqcWJ1czBic3QycHEycnM0d2xtaXEifQ.DdQ8QFpf5LlgTDtejDgJSA`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const geometry = data.routes[0].geometry;
        this.mapRouteGeoJson = geometry;
        console.log('Mapbox Directions GeoJSON:', geometry);
      } else {
        // Fallback to straight line if no route found
        this.mapRouteGeoJson = {
          type: 'LineString',
          coordinates: coords
        };
      }
    } catch (error) {
      console.error('Mapbox Directions error:', error);
      // Fallback to straight line
      this.mapRouteGeoJson = {
        type: 'LineString',
        coordinates: coords
      };
    }
  }
}