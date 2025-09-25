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
  @Input() geoJson: any = null; 
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  map: any;
  mapLoaded: boolean = false;

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
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['geoJson'] && this.mapLoaded) {
      this.drawRoute();
    }
  }

  drawRoute() {
    if (!this.mapLoaded || !this.map) return;

    // Remove previous route layer/source
    if (this.map.getLayer('route-line')) {
      this.map.removeLayer('route-line');
    }
    if (this.map.getSource('route')) {
      this.map.removeSource('route');
    }

    // Draw new route if valid geoJson is provided
    if (this.geoJson && 
        this.geoJson.type === 'LineString' && 
        Array.isArray(this.geoJson.coordinates) && 
        this.geoJson.coordinates.length >= 2) {

      // Add GeoJSON source
      this.map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: this.geoJson
        }
      });

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

      // Fit map to route
      const bounds = new mapboxgl.LngLatBounds();
      this.geoJson.coordinates.forEach((coord: [number, number]) => {
        if (coord && coord.length === 2) {
          bounds.extend(coord);
        }
      });
      this.map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
    }
  }
}