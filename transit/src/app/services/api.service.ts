import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://semitextural-hyun-overpolemically.ngrok-free.dev/api';


  constructor(private http: HttpClient) {
    console.log('ApiService initialized with apiUrl:', this.apiUrl);
  }

  // Simple headers - no CORS headers (browser handles this)
  private getHeaders(): HttpHeaders {
    let headersConfig: { [name: string]: string | string[] } = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    // --- ALWAYS ADD NGROK BYPASS HEADER IF THE URL IS NGROK ---
    // This ensures it works whether you use ngrok or local IP from environment.ts
    // Check the apiUrl property of this service, not environment.apiUrl directly,
    // because this.apiUrl is what gets initialized from environment.apiUrl.
    if (this.apiUrl.includes('ngrok-free.dev')) {
        console.log('ApiService: Detected ngrok URL, adding skip warning header');
        headersConfig['ngrok-skip-browser-warning'] = 'true'; // Value can be anything
        // Optional: Add User-Agent if preferred:
        headersConfig['User-Agent'] = 'TransitTrackApp-Ionic/1.0';
    }
    // --- END NGROK BYPASS ---

    console.log('ApiService: Headers config:', headersConfig);
    return new HttpHeaders(headersConfig);
  }

  // Error handling
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    console.error('API Error:', error);
    console.error('Error status:', error.status);
    console.error('Error message:', error.message);
    console.error('Error body:', error.error);
    
    let errorMessage = 'Unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
      if (error.error && error.error.message) {
        errorMessage += ` - ${error.error.message}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  };

  // Debug method for API calls
  debugApiCall(driverId: number | null): void {
    console.log('=== API DEBUG INFO ===');
    console.log('Base URL:', this.apiUrl);
    console.log('Driver ID:', driverId);
    console.log('Full URL would be:', `${this.apiUrl}/drivers/${driverId}/schedules`);
    console.log('Headers:', this.getHeaders());
  }

  // Test connection to your Laravel API
  testConnection(): Observable<any> {
    console.log('API: Testing connection to Laravel backend');
    // Test with a simple route that should exist
    return this.http.get(`${this.apiUrl}/drivers/1`, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Connection test successful:', response)),
      catchError(this.handleError)
    );
  }

  // MAIN METHOD: Get driver schedules (this calls your existing ScheduleController::getDriverSchedules)
  // getDriverSchedules(driverId: number): Observable<any> {
  //   console.log(`API: Getting schedules for driver ${driverId}`);
  //   console.log(`API: Making request to: ${this.apiUrl}/drivers/${driverId}/schedules`);
    
  //   return this.http.get(`${this.apiUrl}/drivers/${driverId}/schedules`, {
  //     headers: this.getHeaders()
  //   }).pipe(
  //     tap(response => {
  //       console.log('Schedules API response:', response);
  //       if (response && (response as any).schedules) {
  //         const schedules = (response as any).schedules;
  //         console.log(`Found ${schedules.all?.length || 0} total schedules`);
  //         console.log(`Today: ${schedules.today?.length || 0}, Upcoming: ${schedules.upcoming?.length || 0}`);
  //       }
  //     }),
  //     catchError(error => {
  //       console.error('Error fetching driver schedules:', error);
  //       console.error('Request URL was:', `${this.apiUrl}/drivers/${driverId}/schedules`);
  //       return this.handleError(error);
  //     })
  //   );
  // }

  getDriverSchedules(driverId: number): Observable<any> {
    // Define the relative endpoint path correctly.
    // Based on your Laravel routes/api.php, it should be 'drivers/{id}/schedules'.
    const endpoint = `drivers/${driverId}/schedules`;
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`API: Fetching schedules for driver ${driverId} from ${url}`);
    return this.http.get(url, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`Schedules API Response for driver ${driverId}:`, response)),
        catchError(error => {
          console.error(`Error fetching schedules for driver ${driverId}:`, error);
          console.error(`Request URL was: ${url}`);
          return this.handleError(error);
        })
      );
  }

  // Schedule actions (these call your existing ScheduleController methods)
  // acceptSchedule(scheduleId: number): Observable<any> {
  //   console.log(`API: Accepting schedule ${scheduleId}`);
  //   return this.http.put(`${this.apiUrl}/schedules/${scheduleId}/accept`, {}, {
  //     headers: this.getHeaders()
  //   }).pipe(
  //     tap(response => console.log('Accept schedule response:', response)),
  //     catchError(this.handleError)
  //   );
  // }

  declineSchedule(scheduleId: number): Observable<any> {
    console.log(`API: Declining schedule ${scheduleId}`);
    return this.http.put(`${this.apiUrl}/schedules/${scheduleId}/decline`, {}, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Decline schedule response:', response)),
      catchError(this.handleError)
    );
  }

  startSchedule(scheduleId: number): Observable<any> {
    console.log(`API: Starting schedule ${scheduleId}`);
    return this.http.put(`${this.apiUrl}/schedules/${scheduleId}/start`, {}, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Start schedule response:', response)),
      catchError(this.handleError)
    );
  }

  completeSchedule(scheduleId: number): Observable<any> {
    console.log(`API: Completing schedule ${scheduleId}`);
    return this.http.put(`${this.apiUrl}/schedules/${scheduleId}/complete`, {}, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Complete schedule response:', response)),
      catchError(this.handleError)
    );
  }

  // Driver profile methods (these call your existing DriverController methods)
  getDriverProfile(driverId: number): Observable<any> {
    console.log(`API: Getting driver profile ${driverId}`);
    return this.http.get(`${this.apiUrl}/drivers/${driverId}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Driver profile response:', response)),
      catchError(this.handleError)
    );
  }

  updateDriverProfile(driverId: number, profileData: any): Observable<any> {
    console.log(`API: Updating driver profile ${driverId}`);
    return this.http.put(`${this.apiUrl}/drivers/${driverId}`, profileData, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Update profile response:', response)),
      catchError(this.handleError)
    );
  }

  // Route information methods
  getRoute(routeId: number): Observable<any> {
    console.log(`API: Getting route ${routeId}`);
    return this.http.get(`${this.apiUrl}/v1/routes/${routeId}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Route response:', response)),
      catchError(this.handleError)
    );
  }

  acceptSchedule(scheduleId: number) {
    return this.http.post('/api/schedules/accept', { schedule_id: scheduleId });
  }

  post(endpoint: string, body: any): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`API: POST to ${url}`);
    return this.http.post(url, body, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`POST ${endpoint} Response:`, response)),
        catchError(this.handleError)
      );
  }

  put(endpoint: string, body: any): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`API: PUT to ${url}`);
    return this.http.put(url, body, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log(`PUT ${endpoint} response:`, response)),
      catchError(this.handleError)
    );
  }

  get(endpoint: string): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`API: GET from ${url}`);
    return this.http.get(url, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log(`GET ${endpoint} response:`, response)),
      catchError(this.handleError)
    );
  }

  // Get all schedules (admin view)
  getAllSchedules(): Observable<any> {
    console.log('API: Getting all schedules');
    return this.http.get(`${this.apiUrl}/schedules`, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('All schedules response:', response)),
      catchError(this.handleError)
    );
  }

  // Create new schedule (for admin use)
  createSchedule(scheduleData: any): Observable<any> {
    console.log('API: Creating new schedule', scheduleData);
    return this.http.post(`${this.apiUrl}/schedules`, scheduleData, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Create schedule response:', response)),
      catchError(this.handleError)
    );
  }

  // Driver registration (if needed)
  registerDriver(formData: any): Observable<any> {
    console.log('API: Registering new driver');
    return this.http.post(`${this.apiUrl}/v1/drivers/register`, formData, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Register driver response:', response)),
      catchError(this.handleError)
    );
  }

  // loginDriver(credentials: any): Observable<any> {
  //   return this.http.post(`${this.apiUrl}/v1/drivers/login`, credentials, {
  //     headers: this.getHeaders()
  //   });
  // }

  loginDriver(credentials: { email: string, password: string }): Observable<any> {
    // Define the relative endpoint path correctly.
    // Based on your Laravel routes/api.php, it should be 'v1/drivers/login'
    // if your environment.apiUrl is '...ngrok-free.app/api' or 'http://ip:port/api'.
    const endpoint = 'v1/drivers/login';
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`API: Attempting driver login at ${url}`);
    return this.http.post(url, credentials, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('Login API Response:', response)),
        catchError(this.handleError)
      );
  }
}