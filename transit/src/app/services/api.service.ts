import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // Use the correct API URL that matches your Laravel routes
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  // Simple headers - no CORS headers (browser handles this)
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
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
  getDriverSchedules(driverId: number): Observable<any> {
    console.log(`API: Getting schedules for driver ${driverId}`);
    console.log(`API: Making request to: ${this.apiUrl}/drivers/${driverId}/schedules`);
    
    return this.http.get(`${this.apiUrl}/drivers/${driverId}/schedules`, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Schedules API response:', response);
        if (response && (response as any).schedules) {
          const schedules = (response as any).schedules;
          console.log(`Found ${schedules.all?.length || 0} total schedules`);
          console.log(`Today: ${schedules.today?.length || 0}, Upcoming: ${schedules.upcoming?.length || 0}`);
        }
      }),
      catchError(error => {
        console.error('Error fetching driver schedules:', error);
        console.error('Request URL was:', `${this.apiUrl}/drivers/${driverId}/schedules`);
        return this.handleError(error);
      })
    );
  }

  // Alternative endpoint (uses v1 prefix) - backup method
  getDriverSchedulesV1(driverId: number): Observable<any> {
    console.log(`API: Getting schedules for driver ${driverId} (v1 endpoint)`);
    return this.http.get(`${this.apiUrl}/v1/drivers/${driverId}/schedules`, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('V1 Schedules response:', response)),
      catchError(this.handleError)
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

  acceptSchedule(scheduleId: number) {
    return this.http.post('/api/schedules/accept', { schedule_id: scheduleId });
  }

  post(endpoint: string, body: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('POST response:', response)),
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

  // Authentication methods (if needed)
  loginDriver(credentials: any): Observable<any> {
    console.log('API: Driver login');
    return this.http.post(`${this.apiUrl}/v1/auth/login`, credentials, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Login response:', response)),
      catchError(this.handleError)
    );
  }
}