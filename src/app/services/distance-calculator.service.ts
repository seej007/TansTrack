import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DistanceCalculatorService {

  constructor() { }

  /**
   * Calculate total distance of a route from GeoJSON geometry
   * @param geometry GeoJSON object with route coordinates
   * @returns Distance in kilometers
   */
  calculateRouteDistance(geometry: any): number {
    if (!geometry) {
      return 0;
    }

    let coordinates: any[] | null = null;

    // Handle two formats:
    // 1. Direct geometry object: { "type": "LineString", "coordinates": [...] }
    // 2. Feature collection: { "features": [{ "geometry": { "type": "LineString", "coordinates": [...] } }] }
    
    if (geometry.type === 'LineString' && geometry.coordinates) {
      // Direct geometry object
      coordinates = geometry.coordinates;
    } else if (geometry.features && geometry.features[0]) {
      // Feature collection
      coordinates = geometry.features[0].geometry?.coordinates;
    }
    
    if (!coordinates || coordinates.length < 2) {
      return 0;
    }

    let totalDistance = 0;

    // Calculate distance between each consecutive pair of points
    for (let i = 0; i < coordinates.length - 1; i++) {
      const point1 = coordinates[i];
      const point2 = coordinates[i + 1];
      
      if (point1 && point2 && point1.length === 2 && point2.length === 2) {
        totalDistance += this.haversineDistance(
          point1[1], // lat1
          point1[0], // lng1
          point2[1], // lat2
          point2[0]  // lng2
        );
      }
    }

    return Math.round(totalDistance * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * @param lat1 Latitude of first point
   * @param lng1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lng2 Longitude of second point
   * @returns Distance in kilometers
   */
  haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const earthRadiusKm = 6371; // Earth's radius in kilometers

    // Convert degrees to radians
    const lat1Rad = this.toRadians(lat1);
    const lng1Rad = this.toRadians(lng1);
    const lat2Rad = this.toRadians(lat2);
    const lng2Rad = this.toRadians(lng2);

    // Calculate differences
    const latDiff = lat2Rad - lat1Rad;
    const lngDiff = lng2Rad - lng1Rad;

    // Haversine formula
    const a = Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(lngDiff / 2) * Math.sin(lngDiff / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  /**
   * Calculate straight-line distance between start and end coordinates
   * @param startCoord [lng, lat] array
   * @param endCoord [lng, lat] array
   * @returns Distance in kilometers
   */
  calculateStraightLineDistance(startCoord: [number, number], endCoord: [number, number]): number {
    if (!startCoord || !endCoord || startCoord.length !== 2 || endCoord.length !== 2) {
      return 0;
    }

    return Math.round(this.haversineDistance(
      startCoord[1],
      startCoord[0],
      endCoord[1],
      endCoord[0]
    ) * 100) / 100;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   * @param distanceKm Distance in kilometers (number or string)
   * @returns Formatted string (e.g., "12.5 km" or "850 m")
   */
  formatDistance(distanceKm: number | string): string {
    // Convert to number if it's a string
    const distance = typeof distanceKm === 'string' ? parseFloat(distanceKm) : distanceKm;
    
    // Check if it's a valid number
    if (isNaN(distance) || distance <= 0) {
      return '—';
    }
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  }
}
