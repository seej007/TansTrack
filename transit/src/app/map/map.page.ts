import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
    start_coordinates?: string;
    end_coordinates?: string;
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
  targetScheduleId: number | null = null; // For navigation from schedule page
  targetRouteId: number | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    // Check if we're navigating from a specific schedule
    this.route.queryParams.subscribe(params => {
      if (params['scheduleId']) {
        this.targetScheduleId = Number(params['scheduleId']);
        console.log('Map page: Targeting schedule ID', this.targetScheduleId);
      }
      if (params['routeId']) {
        this.targetRouteId = Number(params['routeId']);
        console.log('Map page: Targeting route ID', this.targetRouteId);
      }
    });

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

          // Find current schedule - prioritize target schedule if navigating from schedule page
          if (this.targetScheduleId) {
            // Look for the specific schedule we're targeting
            this.currentSchedule = [...todaySchedules, ...upcomingSchedules].find(s => 
              s.id === this.targetScheduleId
            ) || null;
            
            if (this.currentSchedule) {
              console.log('Map page: Found target schedule:', this.currentSchedule.id);
            } else {
              console.warn('Map page: Target schedule not found:', this.targetScheduleId);
            }
          }
          
          // Fallback to automatic current schedule detection if no target or target not found
          if (!this.currentSchedule) {
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
          }

          this.allRoutes = [...todaySchedules, ...upcomingSchedules];

          // Create simple route geometry from start/end coordinates
          console.log('🗺️ Processing route for map display');
          console.log('Current schedule:', this.currentSchedule);
          
          if (this.currentSchedule?.route) {
            const route = this.currentSchedule.route;
            console.log('Route data received:', route);
            console.log('Route geometry field:', route.geometry);
            console.log('Start coordinates:', route.start_coordinates);
            console.log('End coordinates:', route.end_coordinates);
            
            let startCoords: [number, number] | null = null;
            let endCoords: [number, number] | null = null;

            // Try to get coordinates from start_coordinates and end_coordinates fields
            if (route.start_coordinates && route.end_coordinates) {
              console.log('📍 Found coordinate fields, parsing...');
              try {
                const startCoordsParsed = route.start_coordinates.split(',').map((c: string) => parseFloat(c.trim()));
                const endCoordsParsed = route.end_coordinates.split(',').map((c: string) => parseFloat(c.trim()));
                
                console.log('Parsed start coords:', startCoordsParsed);
                console.log('Parsed end coords:', endCoordsParsed);
                
                if (startCoordsParsed.length === 2 && !isNaN(startCoordsParsed[0]) && !isNaN(startCoordsParsed[1])) {
                  startCoords = [startCoordsParsed[0], startCoordsParsed[1]];
                  console.log('✅ Valid start coords:', startCoords);
                }
                
                if (endCoordsParsed.length === 2 && !isNaN(endCoordsParsed[0]) && !isNaN(endCoordsParsed[1])) {
                  endCoords = [endCoordsParsed[0], endCoordsParsed[1]];
                  console.log('✅ Valid end coords:', endCoords);
                }
              } catch (e) {
                console.warn('❌ Failed to parse coordinates:', e);
              }
            } else {
              console.log('❌ No coordinate fields found');
            }

            // Check if there's existing geometry data (like from Mapbox Directions API)
            if (route.geometry) {
              console.log('🗺️ Found geometry field, analyzing...');
              try {
                let geometryData = route.geometry;
                
                // Handle potential JSON string
                if (typeof geometryData === 'string') {
                  console.log('Parsing geometry string...');
                  console.log('Raw geometry string:', geometryData);
                  console.log('String length:', geometryData.length);
                  
                  try {
                    // Handle double-encoded JSON
                    let parsedData = geometryData;
                    let attempts = 0;
                    
                    while (typeof parsedData === 'string' && attempts < 3) {
                      console.log(`Parse attempt ${attempts + 1}:`, parsedData);
                      parsedData = JSON.parse(parsedData);
                      attempts++;
                    }
                    
                    geometryData = parsedData;
                    console.log('Successfully parsed geometry after', attempts, 'attempts:', geometryData);
                    
                  } catch (e) {
                    console.error('Failed to parse geometry string:', e);
                    console.log('Attempting to clean the string...');
                    
                    // Try to clean and parse again
                    try {
                      let cleaned = geometryData.replace(/\\/g, '').trim();
                      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                        cleaned = cleaned.slice(1, -1);
                      }
                      geometryData = JSON.parse(cleaned);
                      console.log('Successfully parsed cleaned geometry:', geometryData);
                    } catch (e2) {
                      console.error('All parsing attempts failed:', e2);
                      return;
                    }
                  }
                }
                
                console.log('Processed geometry data:', geometryData);
                console.log('Validation checks:');
                console.log('  - geometryData exists:', !!geometryData);
                console.log('  - geometryData type:', typeof geometryData);
                console.log('  - type is LineString:', geometryData?.type === 'LineString');
                console.log('  - coordinates is array:', Array.isArray(geometryData?.coordinates));
                console.log('  - coordinates length:', geometryData?.coordinates?.length);
                console.log('  - coordinates length >= 2:', (geometryData?.coordinates?.length || 0) >= 2);
                
                // Fallback: If still a string but contains coordinates, try regex extraction
                if (typeof geometryData === 'string' && geometryData.includes('coordinates')) {
                  console.log('🔍 Attempting regex extraction of coordinates...');
                  const coordinateMatch = geometryData.match(/"coordinates":\[([^\]]+)\]/);
                  if (coordinateMatch) {
                    try {
                      const coordinatesStr = '[' + coordinateMatch[1] + ']';
                      console.log('Extracted coordinates string:', coordinatesStr);
                      const coordinates = JSON.parse(coordinatesStr);
                      
                      geometryData = {
                        type: 'LineString',
                        coordinates: coordinates
                      };
                      console.log('✅ Successfully created geometry from regex:', geometryData);
                    } catch (e) {
                      console.error('Regex extraction failed:', e);
                    }
                  }
                }
                
                if (geometryData && geometryData.type === 'LineString' && Array.isArray(geometryData.coordinates) && geometryData.coordinates.length >= 2) {
                  console.log('✅ Valid LineString geometry found with', geometryData.coordinates.length, 'points');
                  console.log('Raw coordinates:', geometryData.coordinates);
                  
                  // Ensure coordinates are numbers (in case they're parsed as strings)
                  const processedCoordinates = geometryData.coordinates.map((coord: any, index: number) => {
                    if (Array.isArray(coord) && coord.length >= 2) {
                      const processed = [parseFloat(coord[0]), parseFloat(coord[1])];
                      console.log(`Coordinate ${index}:`, coord, '→', processed);
                      return processed;
                    }
                    console.warn(`Invalid coordinate at index ${index}:`, coord);
                    return coord;
                  });
                  
                  // Check if this looks like waypoints (few points) or actual route geometry (many points)
                  if (processedCoordinates.length <= 10) {
                    console.log('🛣️ Detected waypoints - fetching driving route from Mapbox');
                    this.fetchDrivingRouteFromWaypoints(processedCoordinates);
                  } else {
                    console.log('🗺️ Using existing detailed geometry (many points)');
                    // Create the geometry object exactly as expected by route-map component
                    this.mapRouteGeoJson = {
                      type: 'LineString',
                      coordinates: processedCoordinates
                    };
                    
                    console.log('✅ Final mapRouteGeoJson created:', this.mapRouteGeoJson);
                    console.log('✅ Coordinates count:', processedCoordinates.length);
                    console.log('✅ First coordinate:', processedCoordinates[0]);
                    console.log('✅ Last coordinate:', processedCoordinates[processedCoordinates.length - 1]);
                  }
                } else {
                  console.log('❌ Invalid geometry structure - failing validation');
                  // Try to fetch from Mapbox if we have coordinates
                  if (startCoords && endCoords) {
                    console.log('🔍 Fetching proper route geometry from Mapbox...');
                    this.fetchRouteFromMapbox(startCoords, endCoords);
                  } else {
                    this.mapRouteGeoJson = null;
                    console.log('❌ Could not create route geometry - no coordinates available');
                  }
                }
              } catch (e) {
                console.warn('❌ Failed to parse geometry field:', e);
                // Try to fetch from Mapbox if we have coordinates
                if (startCoords && endCoords) {
                  console.log('🔍 Fetching proper route geometry from Mapbox...');
                  this.fetchRouteFromMapbox(startCoords, endCoords);
                } else {
                  this.mapRouteGeoJson = null;
                  console.log('❌ Could not create route geometry - no coordinates available');
                }
              }
            } else if (startCoords && endCoords) {
              // No geometry field, fetch from Mapbox
              console.log('🔍 No geometry field, fetching from Mapbox...');
              this.fetchRouteFromMapbox(startCoords, endCoords);
            } else {
              this.mapRouteGeoJson = null;
              console.log('❌ No geometry and no coordinates available');
            }
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

  async fetchRouteFromMapbox(startCoords: [number, number], endCoords: [number, number]) {
    const accessToken = 'pk.eyJ1Ijoic2Vlam83IiwiYSI6ImNtY3ZqcWJ1czBic3QycHEycnM0d2xtaXEifQ.DdQ8QFpf5LlgTDtejDgJSA';
    const coordsString = `${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordsString}?geometries=geojson&overview=full&access_token=${accessToken}`;
    
    console.log('🌐 Fetching route from Mapbox:', url);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Mapbox API response:', data);
      
      if (data.routes && data.routes.length > 0) {
        const routeGeometry = data.routes[0].geometry;
        console.log('✅ Got route geometry from Mapbox:', routeGeometry);
        
        this.mapRouteGeoJson = routeGeometry;
        console.log('✅ Updated mapRouteGeoJson with Mapbox route');
      } 
    } catch (error) {
      console.error('❌ Error fetching route from Mapbox:', error);
      // Fallback to simple line
      this.mapRouteGeoJson = {
        type: 'LineString',
        coordinates: [startCoords, endCoords]
      };
      console.log('Using fallback simple line geometry due to error');
    }
  }

  async fetchDrivingRouteFromWaypoints(waypoints: [number, number][]) {
    const accessToken = 'pk.eyJ1Ijoic2Vlam83IiwiYSI6ImNtY3ZqcWJ1czBic3QycHEycnM0d2xtaXEifQ.DdQ8QFpf5LlgTDtejDgJSA';
    
    // Create coordinates string for Mapbox Directions API (lng,lat;lng,lat;...)
    const coordsString = waypoints.map(coord => `${coord[0]},${coord[1]}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordsString}?geometries=geojson&overview=full&steps=true&access_token=${accessToken}`;
    
    console.log('🛣️ Fetching driving route through waypoints from Mapbox');
    console.log('Waypoints:', waypoints);
    console.log('URL:', url);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Mapbox waypoint routing response:', data);
      
      if (data.routes && data.routes.length > 0) {
        const routeGeometry = data.routes[0].geometry;
        console.log('✅ Got detailed driving route geometry from Mapbox');
        console.log('Route has', routeGeometry.coordinates.length, 'coordinate points');
        
        this.mapRouteGeoJson = routeGeometry;
        console.log('✅ Updated mapRouteGeoJson with detailed driving route');
      } else {
        console.warn('❌ No waypoint routes found in Mapbox response');
        console.log('Response data:', data);
        
        // Fallback to simple line through waypoints
        this.mapRouteGeoJson = {
          type: 'LineString',
          coordinates: waypoints
        };
        console.log('Using fallback waypoint line geometry');
      }
    } catch (error) {
      console.error('❌ Error fetching waypoint route from Mapbox:', error);
      
      // Fallback to simple line through waypoints
      this.mapRouteGeoJson = {
        type: 'LineString',
        coordinates: waypoints
      };
      console.log('Using fallback waypoint line geometry due to error');
    }
  }

  
}