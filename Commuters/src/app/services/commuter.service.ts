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
  name: string;
  basefare: number;
  pricePerKm: number;
  geometry: any;
  distance_km?: number; // Route distance in kilometers
  // optional exact stored start/end coordinates (normalized to [lng, lat])
  startCoord?: [number, number] | null;
  endCoord?: [number, number] | null;
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

    console.log('Loading routes from:', `${this.apiUrl}/routes`);
    this.http.get<any>(`${this.apiUrl}/routes`, { headers }).subscribe({
      next: (response) => {
        console.log('Routes API response:', response);
        if (response.success && response.routes) {
          const liveRoutes: LiveRoute[] = response.routes.map((route: any) => ({
            id: route.id.toString(),
            name: route.name,
            basefare: route.regular_price || 15,
            pricePerKm: Math.max((route.aircon_price - route.regular_price) / route.distance_km, 2.5) || 2.5,
            geometry: route.geometry ? JSON.parse(route.geometry) : null,
            distance_km: route.distance_km || null, // Include distance from backend
            startCoord: parseStoredCoord(route.start_coordinates),
            endCoord: parseStoredCoord(route.end_coordinates)
          }));
          this.routesSubject.next(liveRoutes);
          
          // Routes loaded successfully - no need to load buses for commuters
        }
      },
      error: (error) => {
        console.error('Error loading routes:', error);
        // Show empty state instead of fallback data
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
   * When a stored route only contains start/end coordinates (straight line),
   * request Mapbox Directions to get a navigable LineString geometry.
   * Expects coords as [lng, lat]
   */
  getRoutedGeometryFromCoords(start: [number, number], end: [number, number]): Observable<any> {
    // Build the Mapbox Directions URL with geojson geometry
    const coords = `${start[0]},${start[1]};${end[0]},${end[1]}`;
    const mbToken = environment.mapbox?.accessToken || '';
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${encodeURIComponent(mbToken)}`;
    return this.http.get<any>(url);
  }

  // Calculate distance using Haversine formula
  calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}