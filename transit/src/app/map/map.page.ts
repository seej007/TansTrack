import { Component, OnInit } from '@angular/core';

interface CurrentRoute {
  name: string;
  status: 'active' | 'paused' | 'completed';
  nextStop: string;
  nextStopDistance: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
  standalone: false
})
export class MapPage implements OnInit {
  
  currentRoute: CurrentRoute = {
    name: 'Ocean Central Station',
    status: 'active',
    nextStop: 'Main Street Station',
    nextStopDistance: '0.5 mi'
  };

  constructor() { }

  ngOnInit() {
  }

  onSegmentChange(event: any) {
    const selectedValue = event.detail.value;
    console.log('Map view changed to:', selectedValue);
    // Handle map view change logic here
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'medium';
      default:
        return 'medium';
    }
  }
}
