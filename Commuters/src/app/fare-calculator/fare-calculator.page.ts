import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { CommuterService, LiveRoute } from '../services/commuter.service';
import { Subscription } from 'rxjs';

interface Stop {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  routeIds: string[];
}

interface Route {
  id: string;
  name: string;
  basefare: number;
  pricePerKm: number;
  stops: Stop[];
}

@Component({
  selector: 'app-fare-calculator',
  templateUrl: './fare-calculator.page.html',
  styleUrls: ['./fare-calculator.page.scss'],
  standalone: false
})
export class FareCalculatorPage implements OnInit, OnDestroy {
  fareForm: FormGroup;
  routes: LiveRoute[] = [];
  stops: Stop[] = [];
  filteredOriginStops: Stop[] = [];
  filteredDestinationStops: Stop[] = [];
  
  calculatedFare: number = 0;
  distance: number = 0;
  estimatedDuration: string = '';
  selectedRoute: LiveRoute | null = null;
  showFareDetails: boolean = false;
  
  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Fare calculation constants
  baseFare: number = 15; // PHP 15 base fare
  pricePerKm: number = 2.5; // PHP 2.50 per kilometer
  discounts = {
    student: 0.20, // 20% discount for students
    senior: 0.20,  // 20% discount for seniors/PWD
    regular: 0     // No discount for regular passengers
  };

  passengerTypes = [
    { value: 'regular', label: 'Regular', discount: 0 },
    { value: 'student', label: 'Student', discount: 0.20 },
    { value: 'senior', label: 'Senior Citizen/PWD', discount: 0.20 }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private commuterService: CommuterService
  ) {
    this.fareForm = this.fb.group({
      routeId: ['', Validators.required],
      originStopId: ['', Validators.required],
      destinationStopId: ['', Validators.required],
      passengerType: ['regular', Validators.required],
      passengerCount: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      showLiveTracking: [false] // New field for live tracking preference
    });
  }

  ngOnInit() {
    this.subscribeToRealTimeData();
    this.setupFormSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  subscribeToRealTimeData() {
    // Subscribe to routes updates
    const routesSub = this.commuterService.routes$.subscribe(routes => {
      this.routes = routes;
      // Simplified: removed updateStopsFromRoutes() since stops are not available in simplified LiveRoute
    });

    this.subscriptions.push(routesSub);
  }

  setupFormSubscriptions() {
    // Update available stops when route changes
    this.fareForm.get('routeId')?.valueChanges.subscribe(routeId => {
      if (routeId) {
        this.selectedRoute = this.routes.find(r => r.id === routeId) || null;
        this.filteredOriginStops = this.stops.filter(stop => stop.routeIds.includes(routeId));
        this.filteredDestinationStops = [];
        
        // Reset origin and destination
        this.fareForm.patchValue({
          originStopId: '',
          destinationStopId: ''
        });
        this.showFareDetails = false;
      }
    });

    // Update available destination stops when origin changes
    this.fareForm.get('originStopId')?.valueChanges.subscribe(originStopId => {
      if (originStopId && this.selectedRoute) {
        this.filteredDestinationStops = this.filteredOriginStops.filter(
          stop => stop.id !== originStopId
        );
        
        // Reset destination
        this.fareForm.patchValue({ destinationStopId: '' });
        this.showFareDetails = false;
      }
    });

    // Recalculate fare when any relevant field changes
    this.fareForm.valueChanges.subscribe(() => {
      if (this.fareForm.get('originStopId')?.value && 
          this.fareForm.get('destinationStopId')?.value) {
        this.calculateFare();
      }
    });
  }

  calculateFare() {
    const formValue = this.fareForm.value;
    
    if (!formValue.routeId || !formValue.originStopId || !formValue.destinationStopId) {
      return;
    }

    const originStop = this.stops.find(s => s.id === formValue.originStopId);
    const destinationStop = this.stops.find(s => s.id === formValue.destinationStopId);
    
    if (!originStop || !destinationStop || !this.selectedRoute) {
      return;
    }

    // Calculate distance using Haversine formula
    this.distance = this.calculateDistance(
      originStop.coordinates,
      destinationStop.coordinates
    );

    // Calculate base fare
    let totalFare = this.selectedRoute.basefare + (this.distance * this.selectedRoute.pricePerKm);

    // Apply passenger type discount
    const discount = this.discounts[formValue.passengerType as keyof typeof this.discounts] || 0;
    const discountedFare = totalFare * (1 - discount);

    // Multiply by passenger count
    this.calculatedFare = discountedFare * formValue.passengerCount;

    // Calculate estimated duration (assuming 30 km/h average speed)
    const estimatedMinutes = Math.round((this.distance / 30) * 60);
    this.estimatedDuration = `${estimatedMinutes} minutes`;

    this.showFareDetails = true;
  }

  calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(coord2.lat - coord1.lat);
    const dLon = this.deg2rad(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.deg2rad(coord1.lat)) * Math.cos(this.deg2rad(coord2.lat)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  async proceedToPayment() {
    if (!this.fareForm.valid) {
      const toast = await this.toastController.create({
        message: 'Please fill in all required fields',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    const tripData = {
      ...this.fareForm.value,
      fare: this.calculatedFare,
      distance: this.distance,
      estimatedDuration: this.estimatedDuration,
      originStop: this.stops.find(s => s.id === this.fareForm.value.originStopId),
      destinationStop: this.stops.find(s => s.id === this.fareForm.value.destinationStopId),
      route: this.selectedRoute
    };

    // Navigate to payment page with trip data
    this.router.navigate(['/payment'], {
      state: { tripData }
    });
  }

  async showFareBreakdown() {
    const formValue = this.fareForm.value;
    const discount = this.discounts[formValue.passengerType as keyof typeof this.discounts] || 0;
    const baseFareTotal = this.selectedRoute?.basefare || 0;
    const distanceFare = this.distance * (this.selectedRoute?.pricePerKm || 0);
    const subtotal = baseFareTotal + distanceFare;
    const discountAmount = subtotal * discount;
    const afterDiscount = subtotal - discountAmount;
    const total = afterDiscount * formValue.passengerCount;

    const alert = await this.alertController.create({
      header: 'Fare Breakdown',
      message: `
        <div style="text-align: left;">
          <p><strong>Base Fare:</strong> ₱${baseFareTotal.toFixed(2)}</p>
          <p><strong>Distance:</strong> ${this.distance} km × ₱${this.selectedRoute?.pricePerKm}/km = ₱${distanceFare.toFixed(2)}</p>
          <p><strong>Subtotal:</strong> ₱${subtotal.toFixed(2)}</p>
          ${discount > 0 ? `<p><strong>Discount (${(discount*100)}%):</strong> -₱${discountAmount.toFixed(2)}</p>` : ''}
          <p><strong>Per Passenger:</strong> ₱${afterDiscount.toFixed(2)}</p>
          <p><strong>Passengers:</strong> ${formValue.passengerCount}</p>
          <hr>
          <p><strong>Total Fare:</strong> ₱${total.toFixed(2)}</p>
        </div>
      `,
      buttons: ['OK']
    });

    await alert.present();
  }

  resetForm() {
    this.fareForm.reset({
      routeId: '',
      originStopId: '',
      destinationStopId: '',
      passengerType: 'regular',
      passengerCount: 1
    });
    this.showFareDetails = false;
    this.filteredOriginStops = [];
    this.filteredDestinationStops = [];
    this.selectedRoute = null;
  }
}