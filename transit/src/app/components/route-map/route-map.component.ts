import { Component, OnInit, Input, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import mapboxgl from 'mapbox-gl';
import { MapService, MapboxRoute } from '../../services/map.service';
import { environment } from '../../../environments/environment';

interface RouteStop {
  name: string;
  coordinates: { lat: number; lng: number };
  isNext?: boolean;
  isPassed?: boolean;
}

@Component({
  selector: 'app-route-map',
  templateUrl: './route-map.component.html',
  styleUrls: ['./route-map.component.scss'],
  standalone: false
})
export class RouteMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() mapId: string = 'route-map';
  @Input() height: string = '220px';
  @Input() showControls: boolean = false;
  @Input() showDirections: boolean = false;

  // Properties for GPS tracking
  @Input() enableTracking: boolean = false;
  
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  private map!: mapboxgl.Map;
  private markers: mapboxgl.Marker[] = [];
  private routeSource: mapboxgl.GeoJSONSource | null = null;
  private directionsLoaded = false;
  
  // Mapbox access token from environment
  private accessToken = environment.mapbox.accessToken;
  
  // Sample route data for TransiTrack in Cebu
  routeStops: RouteStop[] = [
    { name: 'Cebu City Hall', coordinates: { lat: 10.2931, lng: 123.9017 }, isPassed: true },
    { name: 'Fuente Osmeña Circle', coordinates: { lat: 10.3108, lng: 123.8912 }, isPassed: true },
    { name: 'Ayala Center Cebu', coordinates: { lat: 10.3187, lng: 123.9054 }, isNext: true },
    { name: 'SM City Cebu', coordinates: { lat: 10.3115, lng: 123.9154 } },
    { name: 'Cebu IT Park', coordinates: { lat: 10.3307, lng: 123.9063 } },
    { name: 'University of San Carlos', coordinates: { lat: 10.3499, lng: 123.9113 } }
  ];
  
  currentLocation = { lat: 10.2980, lng: 123.8980 }; // Current bus location near Cebu City
  currentRoute: MapboxRoute | null = null;
  
  private userLocationMarker: mapboxgl.Marker | null = null;
  private userLocationRadius: mapboxgl.Marker | null = null;
  isFollowingUser: boolean = false;
  private trackingSubscription: any;

  // New inputs for route ID and showing buses
  @Input() routeId: string = '';
  @Input() showBuses: boolean = true;

  // Store bus markers
  private busMarkers: mapboxgl.Marker[] = [];

  // Store the selected bus route
  selectedBusRoute: any = null;

  constructor(public mapService: MapService) {
    // Token is set in MapService
  }

  ngOnInit() {
    // Subscribe to route changes from the map service
    this.mapService.currentRoute$.subscribe(route => {
      this.currentRoute = route;
      if (route && this.map) {
        this.updateRouteOnMap(route);
      }
    });
    
    // Subscribe to bus updates for the selected route
    this.mapService.activeBuses$.subscribe(buses => {
      if (this.map && this.showBuses) {
        this.updateBusesOnMap(buses);
      }
    });
    
    // Select the route if routeId is provided
    if (this.routeId) {
      this.mapService.selectBusRoute(this.routeId);
      this.selectedBusRoute = this.mapService.getBusRouteById(this.routeId);
    }
    
    // Subscribe to position updates if tracking is enabled
    if (this.enableTracking) {
      this.startGPSTracking();
    }
  }
  
  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
    }, 100);
  }
  
  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    this.markers = [];
    this.busMarkers = [];
    
    // Clean up tracking subscription
    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
    }
    this.mapService.stopGpsTracking();
  }
  
  private initMap(): void {
    try {
      // Create map centered on Cebu
      this.map = this.mapService.createCebuMap(this.mapId, true);

      // Add controls if enabled
      if (this.showControls) {
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        this.map.addControl(new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }), 'top-right');
      }

      // Wait for map to load before adding markers and routes
      this.map.on('load', () => {
        // Add route markers
        this.addRouteMarkers();
        
        // Add current bus location
        this.addCurrentLocation();
        
        // Add source and layer for route line
        this.initRouteSource();
        
        // Generate and draw route
        this.generateRoute();
        
        // Add directions if enabled
        if (this.showDirections && !this.directionsLoaded) {
          this.addDirectionsControl();
        }
        
        // Enable GPS tracking if requested
        if (this.enableTracking) {
          this.startGPSTracking();
        }
      });
      
    } catch (err) {
      console.error('Error initializing route map:', err);
    }
  }
  
  private addRouteMarkers(): void {
    this.routeStops.forEach(stop => {
      // Create marker element
      const el = document.createElement('div');
      el.className = 'route-stop-marker';
      
      if (stop.isNext) {
        el.classList.add('next-stop');
      } else if (stop.isPassed) {
        el.classList.add('passed-stop');
      }
      
      // Create popup with stop info
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<strong>${stop.name}</strong>
                 ${stop.isNext ? '<br><span class="next-stop-text">Next Stop</span>' : ''}
                 ${stop.isPassed ? '<br><span class="passed-stop-text">Completed</span>' : ''}`);
      
      // Create and add the marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([stop.coordinates.lng, stop.coordinates.lat])
        .setPopup(popup)
        .addTo(this.map);
      
      // Store marker reference
      this.markers.push(marker);
      
      // Open popup for next stop
      if (stop.isNext) {
        marker.togglePopup();
      }
    });
  }
  
  private addCurrentLocation(): void {
    // Create bus marker element
    const el = document.createElement('div');
    el.className = 'bus-location-marker';
    
    // Create popup with bus info
    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML('<strong>Bus Location</strong><br>Currently En Route');
    
    // Create and add the marker
    const marker = new mapboxgl.Marker(el)
      .setLngLat([this.currentLocation.lng, this.currentLocation.lat])
      .setPopup(popup)
      .addTo(this.map);
    
    // Store marker reference
    this.markers.push(marker);
  }
  
  private initRouteSource(): void {
    // Add empty source for route line
    this.map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
    });
    
    // Add route casing layer first (outline)
    this.map.addLayer({
      id: 'route-casing',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#2d5f99',
        'line-width': 7,
        'line-opacity': 0.6
      }
    });
    
    // Add main route line layer
    this.map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#007aff',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
    
    this.routeSource = this.map.getSource('route') as mapboxgl.GeoJSONSource;
  }
  
  private generateRoute(): void {
    // Convert route stops to waypoints for Mapbox Directions API
    const waypoints = this.routeStops.map(stop => [stop.coordinates.lng, stop.coordinates.lat]);
    
    // Get route from Mapbox Directions API
    this.mapService.getRouteWithWaypoints(waypoints as [number, number][])
      .then(route => {
        console.log('Route generated:', route);
        this.updateRouteOnMap(route);
      })
      .catch(err => {
        console.error('Error generating route:', err);
        this.drawFallbackRoute();
      });
  }
  
  private updateRouteOnMap(route: MapboxRoute): void {
    if (!this.map || !this.routeSource) return;
    
    // Convert coordinates from [lat, lng] to [lng, lat] for Mapbox
    const coordinates = route.coordinates.map(coord => [coord[1], coord[0]]);
    
    // Create route feature with properties
    const routeFeature = {
      type: 'Feature' as const,
      properties: {
        distance: route.distance,
        duration: route.duration,
        name: route.name
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: coordinates
      }
    };
    
    // Update route source with new coordinates
    this.routeSource.setData(routeFeature);
    
    // If we have congestion data, update it
    if (route.congestion) {
      // Create congestion segments
      const features = this.createCongestionFeatures(coordinates, route.congestion);
      
      // If we have congestion features, create or update the source
      if (features.length > 0) {
        if (this.map.getSource('route-traffic-source')) {
          (this.map.getSource('route-traffic-source') as mapboxgl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: features
          });
        } else {
          // Create a new source and layer for traffic if it doesn't exist
          this.map.addSource('route-traffic-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: features
            }
          });
          
          this.map.addLayer({
            id: 'route-traffic',
            type: 'line',
            source: 'route-traffic-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': [
                'match',
                ['get', 'congestion'],
                'low', '#00ff00',      // Green for low congestion
                'moderate', '#ffff00', // Yellow for moderate
                'heavy', '#ff9900',    // Orange for heavy
                'severe', '#ff0000',   // Red for severe
                '#007aff'              // Default blue
              ],
              'line-width': 4,
              'line-opacity': 0.9
            }
          });
        }
      }
    }
    
    // Fit map to show entire route
    if (this.showControls) {
      this.fitMapToRoute(coordinates);
    }
  }
  
  /**
   * Creates GeoJSON features for congestion segments
   */
  private createCongestionFeatures(coordinates: number[][], congestion?: string[]): any[] {
    if (!congestion || congestion.length === 0) return [];
    
    const features: any[] = [];
    let currentCongestion = congestion[0];
    let currentCoords = [coordinates[0]];
    
    // Build segments with the same congestion level
    for (let i = 1; i < coordinates.length; i++) {
      if (i < congestion.length && congestion[i] !== currentCongestion) {
        // End previous segment
        if (currentCoords.length > 1) {
          features.push({
            type: 'Feature',
            properties: {
              congestion: currentCongestion
            },
            geometry: {
              type: 'LineString',
              coordinates: currentCoords
            }
          });
        }
        
        // Start new segment
        currentCongestion = congestion[i];
        currentCoords = [coordinates[i-1], coordinates[i]];
      } else {
        currentCoords.push(coordinates[i]);
      }
    }
    
    // Add the last segment
    if (currentCoords.length > 1) {
      features.push({
        type: 'Feature',
        properties: {
          congestion: currentCongestion
        },
        geometry: {
          type: 'LineString',
          coordinates: currentCoords
        }
      });
    }
    
    return features;
  }
  
  private drawFallbackRoute(): void {
    if (!this.map || !this.routeSource) return;
    
    // Create route coordinates from stops (fallback if API fails)
    const coordinates = this.routeStops.map(stop => [stop.coordinates.lng, stop.coordinates.lat]);
    
    // Insert current location after first stop
    coordinates.splice(1, 0, [this.currentLocation.lng, this.currentLocation.lat]);
    
    // Update route source with fallback coordinates
    this.routeSource.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    });
    
    // Fit map to show entire route
    if (this.showControls) {
      this.fitMapToRoute(coordinates);
    }
  }
  
  private fitMapToRoute(coordinates: number[][]): void {
    // Create bounds that include all route points
    const bounds = coordinates.reduce((bounds, coord) => {
      return bounds.extend(coord as [number, number]);
    }, new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));
    
    // Fit map to bounds with padding
    this.map.fitBounds(bounds, {
      padding: 50
    });
  }
  
  private addDirectionsControl(): void {
    try {
      // Add Mapbox Directions control
      const MapboxDirections = (window as any).MapboxDirections;
      if (MapboxDirections) {
        const directions = new MapboxDirections({
          accessToken: environment.mapbox.accessToken,
          unit: 'imperial',
          profile: 'mapbox/driving',
          alternatives: true,
          congestion: true,
          controls: {
            instructions: true
          }
        });
        
        this.map.addControl(directions, 'top-left');
        this.directionsLoaded = true;
      } else {
        console.warn('MapboxDirections not loaded. Make sure the script is included.');
      }
    } catch (err) {
      console.error('Error adding directions control:', err);
    }
  }
  
  /**
   * Start GPS tracking
   */
  startGPSTracking(): void {
    // Subscribe to position updates
    this.trackingSubscription = this.mapService.startGpsTracking().subscribe(position => {
      if (position) {
        this.updateUserLocationOnMap(position.latitude, position.longitude, position.accuracy);
      }
    });
  }
  
  /**
   * Stop GPS tracking
   */
  stopGPSTracking(): void {
    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
      this.trackingSubscription = null;
    }
    this.mapService.stopGpsTracking();
    
    // Remove user location markers
    if (this.userLocationMarker) {
      this.userLocationMarker.remove();
      this.userLocationMarker = null;
    }
    if (this.userLocationRadius) {
      this.userLocationRadius.remove();
      this.userLocationRadius = null;
    }
  }
  
  /**
   * Toggle GPS tracking
   */
  toggleGPSTracking(): boolean {
    if (this.mapService.isTrackingEnabled()) {
      this.stopGPSTracking();
      return false;
    } else {
      this.startGPSTracking();
      return true;
    }
  }
  
  /**
   * Toggle following user's location
   */
  toggleFollowUser(): boolean {
    this.isFollowingUser = !this.isFollowingUser;
    return this.isFollowingUser;
  }
  
  /**
   * Update user location marker and radius on the map
   * @param lat Latitude
   * @param lng Longitude
   * @param accuracy Accuracy in meters
   */
  private updateUserLocationOnMap(lat: number, lng: number, accuracy: number): void {
    if (!this.map) return;
    
    // Create marker if it doesn't exist
    if (!this.userLocationMarker) {
      // Create user location dot
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      
      this.userLocationMarker = new mapboxgl.Marker({
        element: el,
        rotationAlignment: 'map'
      })
      .setLngLat([lng, lat])
      .addTo(this.map);
      
      // Create accuracy radius circle
      const radiusEl = document.createElement('div');
      radiusEl.className = 'user-location-radius';
      radiusEl.style.width = `${accuracy * 2}px`;
      radiusEl.style.height = `${accuracy * 2}px`;
      
      this.userLocationRadius = new mapboxgl.Marker({
        element: radiusEl,
        rotationAlignment: 'map'
      })
      .setLngLat([lng, lat])
      .addTo(this.map);
    } else {
      // Update existing markers
      this.userLocationMarker.setLngLat([lng, lat]);
      
      if (this.userLocationRadius) {
        // Update radius size and position
        const radiusEl = this.userLocationRadius.getElement();
        radiusEl.style.width = `${accuracy * 2}px`;
        radiusEl.style.height = `${accuracy * 2}px`;
        this.userLocationRadius.setLngLat([lng, lat]);
      }
    }
    
    // Center map on user if following
    if (this.isFollowingUser) {
      this.map.easeTo({
        center: [lng, lat],
        duration: 500
      });
    }
  }

  /**
   * Update bus markers on the map
   * @param buses All active buses
   */
  private updateBusesOnMap(buses: any[]): void {
    // Clear existing bus markers
    this.busMarkers.forEach(marker => marker.remove());
    this.busMarkers = [];
    
    if (!this.routeId) return;
    
    // Filter buses for this route
    const routeBuses = buses.filter(bus => bus.routeId === this.routeId);
    
    // Add markers for each bus
    routeBuses.forEach(bus => {
      // Create bus marker element
      const el = document.createElement('div');
      el.className = 'bus-marker';
      
      // Add status class
      if (bus.status === 'delayed') {
        el.classList.add('delayed');
      } else if (bus.status === 'ahead-of-schedule') {
        el.classList.add('ahead');
      } else {
        el.classList.add('on-time');
      }
      
      // Create popup with bus info
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div class="bus-popup">
            <div class="bus-header">
              <strong>Bus ${bus.busId.split('-').pop()}</strong>
              <span class="plate-number">${bus.plateNumber}</span>
            </div>
            <div class="bus-occupancy">
              <span class="label">Occupancy:</span>
              <span class="value">${bus.occupancy}/${bus.capacity}</span>
              <div class="occupancy-bar">
                <div class="occupancy-fill" style="width: ${(bus.occupancy / bus.capacity) * 100}%"></div>
              </div>
            </div>
            <div class="bus-next-stop">
              <span class="label">Next Stop:</span>
              <span class="value">${bus.nextStop}</span>
            </div>
            ${bus.status !== 'on-time' ? `
            <div class="bus-status ${bus.status}">
              <span class="label">Status:</span>
              <span class="value">${bus.status === 'delayed' ? `Delayed by ${bus.delayMinutes} mins` : 'Ahead of schedule'}</span>
            </div>
            ` : ''}
          </div>
        `);
      
      // Create and add the marker
      const marker = new mapboxgl.Marker({
        element: el,
        rotation: bus.heading,
        rotationAlignment: 'map',
        pitchAlignment: 'map'
      })
      .setLngLat(bus.coordinates)
      .setPopup(popup)
      .addTo(this.map);
      
      // Store marker reference
      this.busMarkers.push(marker);
    });
  }

  /**
   * Get timepoints (stops with scheduled times) for the selected route
   */
  getTimepoints(): any[] {
    if (!this.selectedBusRoute) return [];
    return this.selectedBusRoute.stops.filter((stop: any) => stop.isTimepoint);
  }
}
