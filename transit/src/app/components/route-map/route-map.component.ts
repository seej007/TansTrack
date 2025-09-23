import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

declare var mapboxgl: any;

@Component({
  selector: 'app-route-map',
  templateUrl: './route-map.component.html',
  styleUrls: ['./route-map.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class RouteMapComponent implements AfterViewInit, OnChanges {
  @Input() mapId: string = 'route-map';
  @Input() height: string = '220px';
  @Input() showControls: boolean = false;      
  @Input() showDirections: boolean = false; 
  @Input() geoJson: any = null;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  map: any;
  mapLoaded: boolean = false;
  pendingGeoJson: any = null;
  driverMarker: any = null;
  driverIndex: number = 0;
  driverAnimationInterval: any = null;
  trackingActive: boolean = false;

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
      // Draw route if geoJson is present or pending
      this.drawRoute();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['geoJson']) {
      if (this.geoJson && this.geoJson.coordinates && this.geoJson.coordinates.length >= 2) {
        this.startTrackingDriver();
      } else {
        this.removeDriverMarker();
        this.trackingActive = false;
      }
    }
  }

  drawRoute() {
    if (!this.mapLoaded || !this.map) return;

    // Use pendingGeoJson if set
    const routeGeoJson = this.pendingGeoJson || this.geoJson;
    this.pendingGeoJson = null;

    // Remove previous source/layer if exists
    if (this.map.getLayer('route-line')) {
      this.map.removeLayer('route-line');
    }
    if (this.map.getSource('route')) {
      this.map.removeSource('route');
    }

    if (routeGeoJson && routeGeoJson.type === 'LineString' && routeGeoJson.coordinates.length > 0) {
      this.map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: routeGeoJson
        }
      });
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

      // Fit map to route bounds
      const bounds = new mapboxgl.LngLatBounds();
      routeGeoJson.coordinates.forEach((coord: number[]) => bounds.extend(coord));
      this.map.fitBounds(bounds, { padding: 40 });
    }
    
    if (routeGeoJson && routeGeoJson.coordinates.length > 0) {
    if (this.driverMarker) {
      this.driverMarker.remove();
    }
    this.driverIndex = 0;
    this.driverMarker = new mapboxgl.Marker({ color: 'red' })
      .setLngLat(routeGeoJson.coordinates[0])
      .addTo(this.map);

    // Start animation
    if (this.driverAnimationInterval) {
      clearInterval(this.driverAnimationInterval);
    }
    this.driverAnimationInterval = setInterval(() => this.moveDriver(routeGeoJson), 1000);
  }
  }

  moveDriver(routeGeoJson: any) {
  if (!routeGeoJson || !routeGeoJson.coordinates || routeGeoJson.coordinates.length === 0) return;

  // Move marker along the route
  if (this.driverIndex < routeGeoJson.coordinates.length - 1) {
    this.driverIndex++;
    this.driverMarker.setLngLat(routeGeoJson.coordinates[this.driverIndex]);

    // Shrink the route line
    const remainingCoords = routeGeoJson.coordinates.slice(this.driverIndex);
    if (this.map.getSource('route')) {
      this.map.getSource('route').setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: remainingCoords
        }
      });
    }
  } else {
    clearInterval(this.driverAnimationInterval);
  }
  }

  startTrackingDriver() {
    if (!this.geoJson || !this.geoJson.coordinates || this.geoJson.coordinates.length < 2) {
      // No route assigned, do not track
      this.removeDriverMarker();
      this.trackingActive = false;
      return;
    }
    this.trackingActive = true;
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          if (!this.trackingActive) return;
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          this.updateDriverMarker([lng, lat]);
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
  }

  updateDriverMarker(coords: [number, number]) {
    if (!this.map) return;
    if (!this.driverMarker) {
      this.driverMarker = new mapboxgl.Marker({ color: 'red' })
        .setLngLat(coords)
        .addTo(this.map);
    } else {
      this.driverMarker.setLngLat(coords);
    }
  }

  removeDriverMarker() {
    if (this.driverMarker) {
      this.driverMarker.remove();
      this.driverMarker = null;
    }
  }
}