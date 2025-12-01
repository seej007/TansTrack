import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

declare var mapboxgl: any;
import { BusSimulatorService } from '../../services/bus-simulator.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-route-map',
  templateUrl: './route-map.component.html',
  styleUrls: ['./route-map.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class RouteMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() mapId: string = 'route-map';
  @Input() height: string = '220px';
  @Input() routeGeoJson: any = null; 
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  map: any;
  mapLoaded: boolean = false;
  routeMarkers: any[] = []; // Store markers for cleanup
  private busSimSub: Subscription | null = null;
  private simulatedVehicleMarker: any = null;

  constructor(private busSimulatorService: BusSimulatorService) {}

  ngAfterViewInit() {
    mapboxgl.accessToken = 'pk.eyJ1Ijoic2Vlam83IiwiYSI6ImNtY3ZqcWJ1czBic3QycHEycnM0d2xtaXEifQ.DdQ8QFpf5LlgTDtejDgJSA';
    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [123.920994, 10.311008],
      zoom: 12
    });

    this.map.on('load', () => {
      this.mapLoaded = true;
      this.drawRoute();
    });
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true // Use GPS for better accuracy
      },
      trackUserLocation: true, // Track user location continuously
      showUserHeading: true, // Show direction the user is facing (on mobile)
      showUserLocation: true // Show blue dot for user location
    });

    this.map.addControl(geolocateControl);
    geolocateControl.on('load', () => {
      geolocateControl.trigger();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['routeGeoJson'] && this.mapLoaded) {
      this.drawRoute();
    }
  }

  drawRoute() {
    console.log('RouteMapComponent.drawRoute() called');
    console.log('  - mapLoaded:', this.mapLoaded);
    console.log('  - map exists:', !!this.map);
    console.log('  - routeGeoJson received:', this.routeGeoJson);
    
    if (!this.mapLoaded || !this.map) {
      console.log('Skipping drawRoute - map not ready');
      return;
    }

    // Remove previous route layer/source
    if (this.map.getLayer('route-line')) {
      this.map.removeLayer('route-line');
      console.log('Removed previous route-line layer');
    }
    if (this.map.getSource('route')) {
      this.map.removeSource('route');
      console.log('Removed previous route source');
    }

    // Remove previous markers
    this.routeMarkers.forEach(marker => marker.remove());
    this.routeMarkers = [];
    console.log('Removed previous route markers');

    // Draw new route if valid routeGeoJson is provided
    console.log('Validating routeGeoJson for drawing:');
    console.log('  - routeGeoJson exists:', !!this.routeGeoJson);
    console.log('  - type is LineString:', this.routeGeoJson?.type === 'LineString');
    console.log('  - coordinates is array:', Array.isArray(this.routeGeoJson?.coordinates));
    console.log('  - coordinates length:', this.routeGeoJson?.coordinates?.length);
    
    if (this.routeGeoJson && 
        this.routeGeoJson.type === 'LineString' && 
        Array.isArray(this.routeGeoJson.coordinates) && 
        this.routeGeoJson.coordinates.length >= 2) {
        
      console.log('✅ GeoJSON validation passed - drawing route');

      // Add GeoJSON source
      console.log('Adding GeoJSON source with data:', {
        type: 'Feature',
        geometry: this.routeGeoJson
      });
      
      this.map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: this.routeGeoJson
        }
      });
      console.log('✅ GeoJSON source added successfully');

      // Add line layer
      this.map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#0074D9',
          'line-width': 6
        }
      });
      console.log('✅ Route line layer added successfully');

      // Fit map to route
      const bounds = new mapboxgl.LngLatBounds();
      console.log('Calculating bounds for coordinates:', this.routeGeoJson.coordinates);
      
      this.routeGeoJson.coordinates.forEach((coord: [number, number], index: number) => {
        console.log(`Processing coordinate ${index}:`, coord);
        if (coord && coord.length === 2) {
          bounds.extend(coord);
          console.log(`Added coordinate ${index} to bounds:`, coord);
        } else {
          console.warn(`Skipped invalid coordinate ${index}:`, coord);
        }
      });
      
      console.log('Final bounds:', bounds);
      this.map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
      console.log('✅ Map fitted to route bounds');

      // Add route markers (start, end, and waypoints)
      this.addRouteMarkers();

      // Start simulated bus movement (demo) — clean previous simulation first
      try {
        if (this.busSimSub) { this.busSimSub.unsubscribe(); this.busSimSub = null; }
        if (this.simulatedVehicleMarker) { try { this.simulatedVehicleMarker.remove(); } catch(e){} this.simulatedVehicleMarker = null; }
        const coords = this.routeGeoJson.coordinates;
        if (coords && coords.length) {
          // create marker at first coordinate
          this.simulatedVehicleMarker = new mapboxgl.Marker({ color: '#1E90FF' })
            .setLngLat(coords[0])
            .addTo(this.map);

          // subscribe to simulated positions (2s interval)
          this.busSimSub = this.busSimulatorService.simulateAlongLine(coords, 2000).subscribe(pos => {
            try {
              if (this.simulatedVehicleMarker && pos && pos.lng !== undefined && pos.lat !== undefined) {
                this.simulatedVehicleMarker.setLngLat([pos.lng, pos.lat]);
              }
            } catch (err) {
              console.warn('Error moving simulated vehicle marker:', err);
            }
          });
        }
      } catch (e) {
        console.warn('Bus simulation start failed:', e);
      }
      
    } else {
      console.log('❌ GeoJSON validation failed - route not drawn');
    }
  }

  addRouteMarkers() {
    if (!this.routeGeoJson || !this.routeGeoJson.coordinates || this.routeGeoJson.coordinates.length === 0) {
      console.log('No coordinates available for markers');
      return;
    }

    const coordinates = this.routeGeoJson.coordinates;
    console.log('Adding route markers for', coordinates.length, 'coordinates');

    // Add start marker (green)
    const startCoord = coordinates[0];
    const startMarker = new mapboxgl.Marker({ 
      color: '#22c55e', // Green
      scale: 1.2 
    })
      .setLngLat(startCoord)
      .setPopup(new mapboxgl.Popup().setHTML('<div style="padding: 8px;"><strong>Start Point</strong><br>Route begins here</div>'))
      .addTo(this.map);
    
    this.routeMarkers.push(startMarker);
    console.log('✅ Added start marker at:', startCoord);

    // Add end marker (red) - only if different from start
    if (coordinates.length > 1) {
      const endCoord = coordinates[coordinates.length - 1];
      const endMarker = new mapboxgl.Marker({ 
        color: '#ef4444', // Red
        scale: 1.2 
      })
        .setLngLat(endCoord)
        .setPopup(new mapboxgl.Popup().setHTML('<div style="padding: 8px;"><strong>End Point</strong><br>Route ends here</div>'))
        .addTo(this.map);
      
      this.routeMarkers.push(endMarker);
      console.log('✅ Added end marker at:', endCoord);
    }

    // Add waypoint markers (blue) - for intermediate points
    // Only show waypoints if we have a reasonable number (not too many)
    if (coordinates.length > 2 && coordinates.length <= 20) {
      for (let i = 1; i < coordinates.length - 1; i++) {
        const waypointCoord = coordinates[i];
        
        // Only add marker every few points to avoid clutter
        if (i % Math.max(1, Math.floor(coordinates.length / 8)) === 0) {
          const waypointMarker = new mapboxgl.Marker({ 
            color: '#3b82f6', // Blue
            scale: 0.8 
          })
            .setLngLat(waypointCoord)
            .setPopup(new mapboxgl.Popup().setHTML(`<div style="padding: 8px;"><strong>Waypoint ${i}</strong><br>Route passes through here</div>`))
            .addTo(this.map);
          
          this.routeMarkers.push(waypointMarker);
          console.log(`✅ Added waypoint marker ${i} at:`, waypointCoord);
        }
      }
    }

    console.log(`✅ Added ${this.routeMarkers.length} total route markers`);
  }

  ngOnDestroy() {
    if (this.busSimSub) {
      try { this.busSimSub.unsubscribe(); } catch(e){}
      this.busSimSub = null;
    }
    if (this.simulatedVehicleMarker) {
      try { this.simulatedVehicleMarker.remove(); } catch(e){}
      this.simulatedVehicleMarker = null;
    }
    // remove route markers
    this.routeMarkers.forEach(m => { try { m.remove(); } catch(e){} });
    this.routeMarkers = [];
  }
}