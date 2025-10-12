import { Component, OnInit, OnDestroy } from '@angular/core';
// e-ticket component is standalone and used via its selector in the template
import { ToastController } from '@ionic/angular';
import { CommuterService, LiveRoute } from '../services/commuter.service';
import { DistanceCalculatorService } from '../services/distance-calculator.service';
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

  constructor(
    private toastController: ToastController,
    private commuterService: CommuterService,
    private distanceCalculator: DistanceCalculatorService
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
      this.ticketFare = this.selectedRoute.basefare || 0;
      this.showTicket = true;
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

  // Quick pay flow for demo: pays the basefare of the selected route
  async payFare() {
    if (!this.selectedRoute) {
      this.showToast('Select a route first', 'warning');
      return;
    }
    const amount = this.selectedRoute.basefare || 0;
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
      this.ticketFare = this.selectedRoute.basefare;
      this.ticketId = this.generateTicketId(); // Generate and store the ticket ID once
      console.log('Generated Ticket ID:', this.ticketId);
      this.showTicket = true;
      this.showToast('e-Ticket generated! Select your payment method.', 'success');
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
}