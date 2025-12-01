import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

// Helper to parse stored DB coordinate values which may be JSON string, comma-separated string, or array
function parseStoredCoord(value: any): [number, number] | null {
  if (value == null) return null;
  try {
    // If it's a JSON string like '[123.45, 10.3]'
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Try JSON parse
      if (trimmed.startsWith('[')) {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr) && arr.length >= 2) return [Number(arr[0]), Number(arr[1])];
      }
      // Try comma-separated 'lng,lat' or 'lat,lng'
      if (trimmed.indexOf(',') !== -1) {
        const parts = trimmed.split(',').map(p => p.trim());
        if (parts.length >= 2) return [Number(parts[0]), Number(parts[1])];
      }
      // otherwise can't parse
      return null;
    }
    // If it's already an array
    if (Array.isArray(value) && value.length >= 2) {
      return [Number(value[0]), Number(value[1])];
    }
    return null;
  } catch (e) {
    return null;
  }
}

export interface LiveRoute {
  id: string;
  scheduleId?: number; // NEW: Track which schedule this route belongs to
  name: string;
  basefare: number;
  pricePerKm: number;
  geometry: any;
  distance_km?: number; // Route distance in kilometers
  // optional exact stored start/end coordinates (normalized to [lng, lat])
  startCoord?: [number, number] | null;
  endCoord?: [number, number] | null;
  // NEW: Driver and bus info
  driverName?: string;
  busPlateNumber?: string;
  startedAt?: string; // When driver started the trip
}

@Injectable({
  providedIn: 'root'
})
export class CommuterService {
  private apiUrl = environment.apiUrl;
  
  // Real-time data streams
  private routesSubject = new BehaviorSubject<LiveRoute[]>([]);
  
  public routes$ = this.routesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeRealTimeData();
  }

  private initializeRealTimeData() {
    // Start polling for real-time updates
    setInterval(() => {
      this.refreshLiveData();
    }, 30000); // Update every 30 seconds
    
    // Initial load
    this.refreshLiveData();
  }

  private refreshLiveData() {
    this.loadActiveRoutes();
    // Removed bus loading since we only need routes for commuters
  }

  // Get all available routes with current schedules
  loadActiveRoutes(): void {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    // ✅ SIMPLE: Just load all routes like before (this endpoint works and is public)
    console.log('Loading routes from:', `${this.apiUrl}/routes`);
    this.http.get<any>(`${this.apiUrl}/routes`, { headers }).subscribe({
      next: (response: any) => {
                  console.log('API response:', response);
        const routesArray = response.routes || [];
                  console.log('Routes loaded:', routesArray.length);
        const liveRoutes: LiveRoute[] = routesArray.map((route: any) => {
          // Parse geometry if it's a string
          let geometry = route.geometry;
          if (typeof geometry === 'string') {
            try {
              geometry = JSON.parse(geometry);
            } catch (e) {
              console.error('Failed to parse geometry for route:', route.name, e);
              geometry = null;
            }
          }
          
          console.log('Route:', route.name, 'Geometry type:', geometry?.type, 'Coords:', geometry?.coordinates?.length);
          
          return {
            id: route.id.toString(),
            name: route.name,
            basefare: route.regular_price,
            geometry: geometry,
            distance_km: route.distance_km || null,
            startCoord: parseStoredCoord(route.start_coordinate),
            endCoord: parseStoredCoord(route.end_coordinate)
          };
        });
        this.routesSubject.next(liveRoutes);
        console.log('✅ Processed routes:', liveRoutes.length);
      },
      error: (error) => {
        console.error('Error loading routes:', error);
        this.routesSubject.next([]);
      }
    });
  }

  // Utility methods
  getCurrentRoutes(): LiveRoute[] {
    return this.routesSubject.value;
  }

  // Get specific route by ID
  getRouteById(routeId: string): LiveRoute | null {
    return this.getCurrentRoutes().find(route => route.id === routeId) || null;
  }

  // Fetch route details (including geometry) from API for a specific route
  getRouteDetails(routeId: string): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.get<any>(`${this.apiUrl}/routes/${routeId}`, { headers });
  }

  /**
   * Calculate fare with passenger type discount via backend API
   * According to Philippine law (RA 9994), Students, Seniors (60+), and PWD get 20% discount
   * @param routeId - The route ID
   * @param passengerType - 'Regular', 'Student', 'Senior', or 'PWD'
   * @returns Observable with fare calculation result
   */
  calculateFareWithDiscount(routeId: string, passengerType: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    });

    const body = {
      route_id: routeId,
      passenger_type: passengerType
    };

    // Backend route is /api/v1/fare/calculate
    return this.http.post<any>(`${this.apiUrl}/v1/fare/calculate`, body, { headers });
  }

  /**
   * Get passenger type from user profile
   */
  getPassengerType(): string {
    const profile = localStorage.getItem('commuterProfile');
    console.log('📋 Getting passenger type from localStorage:', profile);
    if (profile) {
      try {
        const parsed = JSON.parse(profile);
        console.log('✅ Parsed profile:', parsed);
        console.log('🎭 Passenger type:', parsed.passengerType);
        return parsed.passengerType || 'Regular';
      } catch (e) {
        console.error('❌ Error parsing profile:', e);
        return 'Regular';
      }
    }
    console.log('⚠️ No profile found, defaulting to Regular');
    return 'Regular';
  }
}