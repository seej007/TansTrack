import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, from, of, BehaviorSubject } from 'rxjs';
import { map, tap, switchMap, catchError } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<firebase.User | null>(null);
  user$: Observable<firebase.User | null> = this.userSubject.asObservable();
  isAuthenticated = false;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router
  ) {
    // For development purposes, create a mock user and authentication state
    if (!environment.production) {
      console.log('DEV MODE: Setting up mock authentication');
      
      // Set authenticated state for development
      this.isAuthenticated = true;
      
      // Create a mock user for development
      const mockUser = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
        displayName: 'Development User',
        emailVerified: true
      };
      
      // Update the BehaviorSubject with the mock user
      this.userSubject.next(mockUser as any);
    } else {
      // Normal Firebase authentication for production
      this.afAuth.authState.pipe(
        tap(user => {
          console.log('Auth state changed. User:', user ? user.uid : 'null');
          this.isAuthenticated = !!user;
          this.userSubject.next(user);
        })
      ).subscribe();

      // Initialize auth state from Firebase
      this.afAuth.onAuthStateChanged(user => {
        console.log('Auth state changed. User:', user ? user.uid : 'null');
        this.isAuthenticated = !!user;
        this.userSubject.next(user);
      });
    }
  }

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<firebase.auth.UserCredential | any> {
    try {
      // For development purposes, create a mock user and skip Firebase auth
      if (!environment.production) {
        console.log('DEV MODE: Creating mock user for', email);
        
        // Set mock authentication state
        this.isAuthenticated = true;
        
        // Create a mock user for development
        const mockUser = {
          uid: 'dev-user-123',
          email: email,
          displayName: 'Development User',
          emailVerified: true
        };
        
        // Update the BehaviorSubject with the mock user
        this.userSubject.next(mockUser as any);
        
        // Return a mock credential
        return { 
          user: mockUser,
          credential: null 
        };
      }
      
      // Normal Firebase authentication for production
      const result = await this.afAuth.signInWithEmailAndPassword(email, password);
      console.log('Sign in successful for user:', result.user?.uid);
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign up with email/password
  async signUp(email: string, password: string): Promise<firebase.auth.UserCredential> {
    try {
      const result = await this.afAuth.createUserWithEmailAndPassword(email, password);
      console.log('Sign up successful for user:', result.user?.uid);
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Send email verification
  async sendEmailVerification(): Promise<void> {
    const user = await this.afAuth.currentUser;
    return user?.sendEmailVerification();
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string): Promise<void> {
    return this.afAuth.sendPasswordResetEmail(email);
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await this.afAuth.signOut();
      console.log('User signed out');
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Returns true when user is logged in
  isLoggedIn(): Observable<boolean> {
    // For development purposes, always return true to prevent navigation issues
    if (!environment.production) {
      console.log('DEV MODE: Mock authentication enabled');
      return of(true);
    }
    
    // Normal Firebase authentication check for production
    return this.afAuth.authState.pipe(
      tap(user => console.log('isLoggedIn check, user:', user ? user.uid : 'null')),
      map(user => !!user)
    );
  }

  // Get current user
  getCurrentUser(): Observable<firebase.User | null> {
    // For development, always return the mock user
    if (!environment.production) {
      return this.user$; // This already contains our mock user
    }
    return this.user$;
  }

  // Get user account type from Firestore
  getUserAccountType(): Observable<string | null> {
    return this.getCurrentUser().pipe(
      switchMap(user => {
        if (user) {
          // Get user doc from Firestore directly
          return from(firebase.firestore().collection('Users').doc(user.uid).get()).pipe(
            map(doc => {
              if (doc.exists) {
                const userData = doc.data();
                return userData && userData['accountType'] ? userData['accountType'] : null;
              }
              return null;
            })
          );
        }
        return of(null);
      }),
      catchError(error => {
        console.error('Error getting user account type:', error);
        return of(null);
      })
    );
  }

  // Get user display name from Firebase Auth and Firestore
  getUserDisplayName(): Observable<string | null> {
    return this.getCurrentUser().pipe(
      switchMap(user => {
        if (user) {
          // Try to get display name from Firebase Auth first
          if (user.displayName) {
            return of(user.displayName);
          }
          
          // If not available, try to get from Firestore
          return from(firebase.firestore().collection('Users').doc(user.uid).get()).pipe(
            map(doc => {
              const userData = doc.data();
              return userData && userData['displayName'] ? userData['displayName'] : null;
            })
          );
        }
        return of(null);
      }),
      catchError(error => {
        console.error('Error getting user display name:', error);
        return of(null);
      })
    );
  }

  // Update user's display name in both Auth and Users collection
  async updateUserDisplayName(displayName: string): Promise<void> {
    console.log('AuthService: Updating display name to:', displayName);
    
    try {
      // Get current user
      const user = await this.afAuth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // 1. Update Firebase Auth displayName
      await user.updateProfile({ displayName });
      console.log('✅ Firebase Auth displayName updated to:', displayName);
      
      // 2. Update Users collection directly
      await firebase.firestore().collection('Users').doc(user.uid).set({
        displayName: displayName,
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Users collection displayName updated to:', displayName);
      
      console.log('AuthService: Display name successfully updated in all locations');
    } catch (error) {
      console.error('AuthService: Error updating display name:', error);
      throw error;
    }
  }
}
