import { Component, OnInit, OnDestroy } from '@angular/core';
// e-ticket component is standalone and used via its selector in the template
import { ToastController, AlertController, LoadingController } from '@ionic/angular';
import { CommuterService, LiveRoute } from '../services/commuter.service';
import { DistanceCalculatorService } from '../services/distance-calculator.service';
import { BusSimulatorService } from '../services/bus-simulator.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  currentTime: string = '';

  // Real route data
  routes: LiveRoute[] = [];
  selectedRoute: LiveRoute | null = null;
  selectedRouteId: string = '';
  private subscriptions: Subscription[] = [];
  // e-ticket state
  showTicket: boolean = false;
  ticketDestination: string | null = null;
  ticketFare: number | null = null;
  ticketId: string = ''; // Store the ticket ID to prevent regeneration
  paymentMethod: string = 'cash'; // Default payment method

  // Bus simulation for route visualization and distance tracking
  boardingLocation: { lng: number; lat: number } | null = null;
  currentBusPosition: { lng: number; lat: number } | null = null;
  distanceTraveled: number = 0; // Distance in kilometers from boarding point
  isSimulationActive: boolean = false;
  private busSimulationSubscription: Subscription | null = null;

  constructor(
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private commuterService: CommuterService,
    private distanceCalculator: DistanceCalculatorService,
    private busSimulator: BusSimulatorService
  ) {}

  ngOnInit() {
    this.updateCurrentTime();
    setInterval(() => {
      this.updateCurrentTime();
    }, 60000);
    
    this.loadRouteData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopBusSimulation();
  }

  loadRouteData() {
    console.log('Home page: Loading route data...');
    // Subscribe to routes data
    const routesSub = this.commuterService.routes$.subscribe(routes => {
      console.log('Home page: Received routes:', routes);
      this.routes = routes;
    });
    
    this.subscriptions.push(routesSub);
  }
  onRouteSelected() {
    if (!this.selectedRouteId) {
      this.selectedRoute = null;
      return;
    }

    // pick from cache
    this.selectedRoute = this.routes.find(route => route.id === this.selectedRouteId) || null;
    console.log('Selected route (initial):', this.selectedRoute);

    if (!this.selectedRoute) return;

    // Show e-ticket immediately when a route is selected (demo flow)
    try {
      this.ticketDestination = this.selectedRoute.name || null;
      this.ticketFare = this.selectedRoute.basefare; // Use fixed basefare
      this.showTicket = true;
      
      // Start bus simulation if geometry is available
      if (this.selectedRoute.geometry?.coordinates) {
        this.startBusSimulation();
      }
    } catch (e) {
      console.error('Failed to set ticket data on selection:', e);
    }

    const existingGeo = this.selectedRoute.geometry || null;
    const isGeoArray = existingGeo && Array.isArray(existingGeo.coordinates);
    const isStartEndOnly = isGeoArray && existingGeo.coordinates.length === 2;
    const hasNulls = isGeoArray && existingGeo.coordinates.some((c: any) => !c || c[0] === null || c[1] === null);

    // If no geometry at all, fetch details from API (server might return geometry)
    if (!existingGeo) {
      this.commuterService.getRouteDetails(this.selectedRouteId).subscribe({
        next: (resp) => {
          const routeData = resp.route || resp;
          try {
            let geo = routeData.geometry ? (typeof routeData.geometry === 'string' ? JSON.parse(routeData.geometry) : routeData.geometry) : null;
            if (geo && Array.isArray(geo.coordinates) && geo.coordinates.length === 2) {
              // start/end only -> call Mapbox Directions
              const s = geo.coordinates[0];
              const e = geo.coordinates[geo.coordinates.length - 1];
              const start = [parseFloat(s[0]), parseFloat(s[1])];
              const end = [parseFloat(e[0]), parseFloat(e[1])];
              this.commuterService.getRoutedGeometryFromCoords(start as any, end as any).subscribe({
                next: (dirResp) => {
                  const routed = dirResp.routes && dirResp.routes[0] && dirResp.routes[0].geometry;
                  if (routed) {
                    this.selectedRoute!.geometry = routed;
                    this.selectedRoute = { ...this.selectedRoute } as LiveRoute;
                    const idx = this.routes.findIndex(r => r.id === this.selectedRouteId);
                    if (idx !== -1) this.routes[idx] = { ...this.routes[idx], geometry: routed } as any;
                  }
                },
                error: (err) => console.error('Mapbox Directions error:', err)
              });
            } else {
              // use whatever geometry the server returned
              this.selectedRoute!.geometry = geo;
                    this.selectedRoute = { ...this.selectedRoute } as LiveRoute;
              const idx = this.routes.findIndex(r => r.id === this.selectedRouteId);
              if (idx !== -1) this.routes[idx] = { ...this.routes[idx], geometry: geo } as any;
            }
          } catch (e) {
            console.error('Failed to parse route geometry:', e);
          }
        },
        error: (err) => console.error('Error fetching route details:', err)
      });
      return;
    }

    // If geometry exists but only as start/end or has null entries, request routed geometry
    if (isStartEndOnly || hasNulls) {
      try {
        const s = existingGeo.coordinates[0];
        const e = existingGeo.coordinates[existingGeo.coordinates.length - 1];
        const start = [parseFloat(s[0]), parseFloat(s[1])];
        const end = [parseFloat(e[0]), parseFloat(e[1])];
        this.commuterService.getRoutedGeometryFromCoords(start as any, end as any).subscribe({
          next: (dirResp) => {
            const routed = dirResp.routes && dirResp.routes[0] && dirResp.routes[0].geometry;
            if (routed) {
              this.selectedRoute!.geometry = routed;
              this.selectedRoute = { ...this.selectedRoute } as LiveRoute;
              const idx = this.routes.findIndex(r => r.id === this.selectedRouteId);
              if (idx !== -1) this.routes[idx] = { ...this.routes[idx], geometry: routed } as any;
            }
          },
          error: (err) => console.error('Mapbox Directions error:', err)
        });
      } catch (err) {
        console.error('Failed to request routed geometry:', err);
      }
      return;
    }

    // Otherwise geometry is valid and will be used directly; force change detection
    this.selectedRoute = { ...this.selectedRoute };
  }

  onTrackRoute() {
    if (!this.selectedRoute) {
      this.showToast('Please select a route to track', 'warning');
      return;
    }
    console.log('Tracking route requested for:', this.selectedRoute);
    // For now we just notify the user; future improvement: navigate to a live-tracking view
    this.showToast(`Tracking ${this.selectedRoute.name}`, 'success');
  }

  // Quick pay flow for demo: pays the fixed basefare of the selected route
  async payFare() {
    if (!this.selectedRoute) {
      this.showToast('Select a route first', 'warning');
      return;
    }
    const amount = this.selectedRoute.basefare; // Use fixed basefare from database
    // Demo mode: instead of opening an external payment flow, just show the e-ticket
    this.ticketDestination = this.selectedRoute?.name || null;
    this.ticketFare = amount;
    this.ticketId = this.generateTicketId(); // Generate and store the ticket ID once
    this.showTicket = true;
    this.showToast(`e-ticket for ${this.ticketDestination} (₱${amount.toFixed(2)})`, 'success');
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  generateTicket() {
    if (this.selectedRoute) {
      this.ticketDestination = this.selectedRoute.name;
      this.ticketFare = this.selectedRoute.basefare; // Use fixed basefare from database
      this.ticketId = this.generateTicketId(); // Generate and store the ticket ID once
      console.log('Generated Ticket ID:', this.ticketId);
      this.showTicket = true;
      
      // Start bus simulation for route tracking (distance display only)
      this.startBusSimulation();
      
      this.showToast('e-Ticket generated! Fixed fare: ₱' + this.ticketFare, 'success');
    }
  }

  private generateTicketId(): string {
    // Generate a unique ticket ID based on timestamp and random number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `${timestamp}-${random}`;
    console.log('generateTicketId called, ID:', id);
    return id;
  }

  getPaymentMethodLabel(): string {
    const labels: { [key: string]: string } = {
      'cash': 'Cash',
      'paymaya': 'PayMaya',
      'gcash': 'GCash'
    };
    return labels[this.paymentMethod] || 'Cash';
  }

  getPaymentIcon(): string {
    const icons: { [key: string]: string } = {
      'cash': 'cash-outline',
      'paymaya': 'card-outline',
      'gcash': 'phone-portrait-outline'
    };
    return icons[this.paymentMethod] || 'cash-outline';
  }

  closeTicket() {
    this.showTicket = false;
    this.stopBusSimulation(); // Stop simulation when ticket is closed
    this.showToast('Ticket closed. You can generate a new ticket anytime.', 'medium');
  }

  async shareTicket() {
    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Transit e-Ticket',
          text: `My e-Ticket for ${this.ticketDestination} - Ticket ID: #${this.ticketId}`,
          url: window.location.href
        });
        this.showToast('Ticket shared successfully!', 'success');
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      const ticketInfo = `Transit e-Ticket\nRoute: ${this.ticketDestination}\nTicket ID: #${this.ticketId}\nFare: ₱${this.ticketFare}\nPayment: ${this.getPaymentMethodLabel()}`;
      
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(ticketInfo);
          this.showToast('Ticket details copied to clipboard!', 'success');
        } catch (error) {
          this.showToast('Unable to share ticket', 'warning');
        }
      } else {
        this.showToast('Sharing not supported on this device', 'warning');
      }
    }
  }

  async handleMakeStop() {
    if (!this.selectedRoute) return;

    const currentFare = this.ticketFare || this.selectedRoute.basefare;

    const alert = await this.alertController.create({
      header: 'Make Stop & Pay',
      message: `
        <div style="text-align: center; padding: 10px;">
          <p style="font-size: 16px; margin: 10px 0;">Ready to get off?</p>
          <p style="font-size: 14px; color: #666;">Distance traveled: ${this.getDistanceTraveled()}</p>
          <p style="font-size: 14px; color: #666;">Please pay ₱${currentFare.toFixed(2)} to the conductor</p>
        </div>
      `,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm Payment',
          handler: async () => {
            // Show loading
            const loading = await this.loadingController.create({
              message: 'Processing...',
              duration: 1000
            });
            await loading.present();

            setTimeout(async () => {
              await loading.dismiss();
              
              // Stop bus simulation
              this.stopBusSimulation();
              
              // Close ticket and show receipt
              this.showTicket = false;
              this.selectedRoute = null;
              
              const receiptAlert = await this.alertController.create({
                header: '✅ Payment Confirmed',
                message: `
                  <div style="text-align: center; padding: 10px;">
                    <p style="font-size: 16px; margin: 10px 0;">Thank you for riding with us!</p>
                    <p style="font-size: 14px; color: #666;">Distance: ${this.getDistanceTraveled()}</p>
                    <p style="font-size: 14px; color: #666;">Fare: ₱${currentFare.toFixed(2)}</p>
                    <p style="font-size: 14px; color: #666;">Receipt sent to your account</p>
                  </div>
                `,
                buttons: ['Done']
              });
              await receiptAlert.present();
              
              this.showToast('Trip completed successfully', 'success');
            }, 1000);
          }
        }
      ]
    });

    await alert.present();
  }

  updateCurrentTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Get the calculated distance for a route
   * @param route The route object
   * @returns Formatted distance string (e.g., "12.5 km")
   */
  getRouteDistance(route: LiveRoute | null): string {
    if (!route) {
      return '—';
    }
    
    // If backend already calculated distance, use it
    if (route.distance_km && route.distance_km > 0) {
      return this.distanceCalculator.formatDistance(route.distance_km);
    }
    
    // Otherwise calculate from geometry
    if (route.geometry) {
      const distance = this.distanceCalculator.calculateRouteDistance(route.geometry);
      if (distance > 0) {
        return this.distanceCalculator.formatDistance(distance);
      }
    }
    
    return '—';
  }

  /**
   * Start bus simulation for route visualization and distance tracking
   * Note: Fare is fixed (basefare), simulation shows route progress and distance only
   */
  private startBusSimulation() {
    // Stop any existing simulation
    this.stopBusSimulation();

    if (!this.selectedRoute?.geometry?.coordinates) {
      console.warn('Cannot start simulation: No route geometry available');
      return;
    }

    const coords = this.selectedRoute.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      console.warn('Cannot start simulation: Invalid coordinates');
      return;
    }

    // Set boarding location as the first coordinate (route start)
    const firstCoord = coords[0];
    console.log('First coordinate from route:', firstCoord);
    
    this.boardingLocation = {
      lng: Number(firstCoord[0]),
      lat: Number(firstCoord[1])
    };
    
    console.log('Boarding location set to:', this.boardingLocation);
    
    // Validate boarding location
    if (isNaN(this.boardingLocation.lng) || isNaN(this.boardingLocation.lat)) {
      console.error('Invalid boarding location coordinates!');
      return;
    }
    
    this.currentBusPosition = { ...this.boardingLocation };
    this.distanceTraveled = 0;
    this.ticketFare = 0; 
    this.isSimulationActive = true;

    console.log('Starting bus simulation from:', this.boardingLocation);
    console.log('Route has', coords.length, 'coordinate points');
    console.log('First 3 coords:', coords.slice(0, 3));

    // Simulate bus movement at realistic speed (updates every 2 seconds)
    // Realistic bus speed: 50 km/h ≈ 28 meters per 2 seconds
    this.busSimulationSubscription = this.busSimulator
      .simulateAlongLine(coords, 2000) // Update every 2 seconds
      .subscribe({
        next: (position) => {
          console.log('Received position from simulator:', position);
          
          // Validate position has valid lng/lat
          if (!position || position.lng === undefined || position.lat === undefined || 
              isNaN(position.lng) || isNaN(position.lat)) {
            console.error('Invalid position from simulator:', position);
            return;
          }
          
          this.currentBusPosition = {
            lng: Number(position.lng),
            lat: Number(position.lat)
          };

          // Calculate distance traveled from boarding point
          if (this.boardingLocation && this.currentBusPosition) {
            // Validate coordinates are valid numbers
            const lng1 = Number(this.boardingLocation.lng);
            const lat1 = Number(this.boardingLocation.lat);
            const lng2 = Number(this.currentBusPosition.lng);
            const lat2 = Number(this.currentBusPosition.lat);

            console.log(`Calculating distance: (${lng1}, ${lat1}) -> (${lng2}, ${lat2})`);

            if (!isNaN(lng1) && !isNaN(lat1) && !isNaN(lng2) && !isNaN(lat2)) {
              this.distanceTraveled = this.calculateDistanceBetweenPoints(lng1, lat1, lng2, lat2);
              
              // Note: Fare is fixed (basefare), simulation tracks distance for display only
              // No need to update fare dynamically

              console.log(`Bus at position ${position.index}: Distance traveled = ${this.distanceTraveled.toFixed(2)} km, Fixed Fare = ₱${this.ticketFare?.toFixed(2)}`);
            } else {
              console.error('Invalid coordinates:', { lng1, lat1, lng2, lat2 });
            }
          }
        },
        error: (err) => {
          console.error('Bus simulation error:', err);
          this.stopBusSimulation();
        }
      });
  }

  /**
   * Stop the bus simulation
   */
  private stopBusSimulation() {
    if (this.busSimulationSubscription) {
      this.busSimulationSubscription.unsubscribe();
      this.busSimulationSubscription = null;
    }
    this.isSimulationActive = false;
    console.log('Bus simulation stopped');
  }

  /**
   * Calculate distance between two geographic points using Haversine formula
   */
  private calculateDistanceBetweenPoints(lng1: number, lat1: number, lng2: number, lat2: number): number {
    // Validate inputs
    if (isNaN(lng1) || isNaN(lat1) || isNaN(lng2) || isNaN(lat2)) {
      console.error('Invalid coordinates for distance calculation:', { lng1, lat1, lng2, lat2 });
      return 0;
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    // Ensure result is valid
    if (isNaN(distance)) {
      console.error('Calculated distance is NaN');
      return 0;
    }
    
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get formatted distance traveled string
   */
  getDistanceTraveled(): string {
    // Handle null, undefined, NaN, or 0
    if (!this.distanceTraveled || this.distanceTraveled === 0 || isNaN(this.distanceTraveled)) {
      return '0.0 km';
    }
    return `${this.distanceTraveled.toFixed(1)} km`;
  }

  /**
   * Get origin point from ticket destination
   */
  getOrigin(): string {
    return this.ticketDestination ? this.ticketDestination.split(' to ')[0] || 'Start Point' : 'Start Point';
  }

  /**
   * Get destination point from ticket destination
   */
  getDestinationPoint(): string {
    return this.ticketDestination ? this.ticketDestination.split(' to ')[1] || 'End Point' : 'End Point';
  }
}