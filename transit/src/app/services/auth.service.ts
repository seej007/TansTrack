import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private router: Router) {
    // Check if user was previously logged in
    const driverId = localStorage.getItem('driverId');
    if (driverId) {
      this.isLoggedInSubject.next(true);
      this.userSubject.next({
        uid: driverId,
        email: localStorage.getItem('driverEmail'),
        displayName: localStorage.getItem('driverName')
      });
    }

    // REMOVE OR COMMENT OUT the Firebase auth listener - it's overriding your login!
    // this.initializeFirebaseAuth();
  }

  private initializeFirebaseAuth() {
    try {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          console.log('Firebase user authenticated:', user.uid);
          this.login(user.uid, user.displayName || 'Driver', user.email || ''); // ← This calls login with Firebase UID, not your driver ID!
          this.userSubject.next(user);
        }
      });
    } catch (error) {
      console.warn('Firebase not initialized, using localStorage auth only');
    }
  }

  // Firebase-compatible sign in method
  async signIn(email: string, password: string): Promise<any> {
    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      return userCredential;
    } catch (firebaseError) {
      console.warn('Firebase failed, using simple auth');
      
      // Simple validation - no complicated lookup
      if (this.isValidMockCredentials(email, password)) {
        const mockUser = {
          user: {
            uid: 'mock-user',
            email: email,
            displayName: 'Mock Driver'
          }
        };
        // Don't call login here - let the login.page.ts handle it
        return mockUser;
      }
      
      throw new Error('Invalid email or password');
    }
  }

  // More flexible validation for mock authentication
  private isValidMockCredentials(email: string, password: string): boolean {
    // Accept any valid email format with password length >= 6
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = emailRegex.test(email);
    const isValidPassword = password !== null && password !== undefined && password.length >= 6;
    
    console.log('Mock auth validation:', {
      email,
      isValidEmail,
      isValidPassword,
      passwordLength: password?.length
    });
    
    return isValidEmail && isValidPassword;
  }

  // Firebase-compatible password reset
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      console.log('Password reset email sent via Firebase');
    } catch (error) {
      console.warn('Firebase password reset failed:', error);
      // Mock success for development
      console.log('Mock password reset email sent for:', email);
    }
  }

  // Firebase-compatible sign out
  async performLogout(): Promise<void> {
    try {
      await firebase.auth().signOut();
      console.log('Firebase sign out successful');
    } catch (error) {
      console.warn('Firebase sign out failed:', error);
    }
    
    // Always clear local storage
    this.logout();
  }

  // Basic authentication methods
  login(driverId: string, driverName: string, email?: string) {
    console.log(`AuthService: Storing driver ID ${driverId} for ${driverName}`);
    
    // Store the ACTUAL driver ID
    localStorage.setItem('driverId', driverId);
    localStorage.setItem('driverName', driverName);
    if (email) localStorage.setItem('driverEmail', email);
    
    localStorage.setItem('currentUser', JSON.stringify({
      id: driverId,
      name: driverName,
      email: email
    }));
    
    this.isLoggedInSubject.next(true);
    this.userSubject.next({
      uid: driverId,
      email: email,
      displayName: driverName
    });
    
    console.log('Driver logged in successfully with ID:', driverId);
  }

  logout() {
    localStorage.removeItem('driverId');
    localStorage.removeItem('driverName');
    localStorage.removeItem('driverEmail');
    
    this.isLoggedInSubject.next(false);
    this.userSubject.next(null);
    
    this.router.navigate(['/login']);
    console.log('User logged out');
  }

  // Check if user is authenticated (for backward compatibility)
  isAuthenticated(): boolean {
    return !!localStorage.getItem('driverId');
  }

  // Alternative method name for backward compatibility
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getDriverId(): string | null {
    // Get the ACTUAL stored driver ID - not hardcoded 1!
    const storedDriverId = localStorage.getItem('driverId');
    
    if (storedDriverId) {
      console.log('Found REAL driver ID from localStorage:', storedDriverId);
      return storedDriverId;
    }
    
    console.error('NO DRIVER ID FOUND - something is wrong with login');
    return null;
  }
    getDriverName(): string | null {
    return localStorage.getItem('driverName');
  }

  getDriverEmail(): string | null {
    return localStorage.getItem('driverEmail');
  }

  getCurrentUser(): any {
    const userData = localStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
  }
}