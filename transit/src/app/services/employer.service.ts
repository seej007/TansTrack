import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, switchMap, take, tap, catchError } from 'rxjs/operators';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { FirebaseServiceService } from '../firebase-service.service';

export interface Employer {
  id?: string;
  userId: string;
  companyName: string;
  industry: string;
  location: string;
  website?: string;
  description: string;
  contactEmail: string;
  contactPhone?: string;
  verified: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EmployerService {
  private employersCollection = 'employers';

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private firebaseService: FirebaseServiceService
  ) { }

  // Get current employer profile
  getCurrentEmployerProfile(): Observable<Employer> {
    console.log('EmployerService: Getting current employer profile');
    
    return this.authService.getCurrentUser().pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          console.error('EmployerService: User not authenticated');
          return throwError(() => new Error('User not authenticated'));
        }
        
        console.log('EmployerService: Looking for profile for user ID:', user.uid);
        return this.firebaseService.Query<Employer>(
          this.employersCollection,
          'userId',
          '==',
          user.uid
        ).pipe(
          map(employers => {
            if (employers.length > 0) {
              console.log('EmployerService: Found existing employer profile:', employers[0]);
              return employers[0];
            }
            console.error('EmployerService: Employer profile not found');
            throw new Error('Employer profile not found');
          }),
          catchError(error => {
            console.error('EmployerService: Error getting employer profile:', error);
            return throwError(() => new Error(`Failed to get employer profile: ${error.message}`));
          })
        );
      })
    );
  }

  // Create or update employer profile
  saveEmployerProfile(profileData: Partial<Employer>): Observable<any> {
    console.log('EmployerService: Saving profile data:', profileData);
    
    return this.authService.getCurrentUser().pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          console.error('EmployerService: Cannot save profile: User not authenticated');
          return throwError(() => new Error('User not authenticated'));
        }
        
        return this.firebaseService.Query<Employer>(
          this.employersCollection,
          'userId',
          '==',
          user.uid
        ).pipe(
          take(1),
          switchMap(employers => {
            if (employers.length > 0) {
              // Update existing profile
              const employer = employers[0];
              console.log('EmployerService: Updating existing profile with ID:', employer.id);
              return from(this.firebaseService.Update(
                this.employersCollection,
                employer.id,
                profileData
              )).pipe(
                tap(() => console.log('EmployerService: Profile updated successfully')),
                catchError(error => {
                  console.error('EmployerService: Error updating profile:', error);
                  return throwError(() => new Error(`Failed to update profile: ${error.message}`));
                })
              );
            } else {
              // Get user document from Firestore to fetch displayName
              return from(this.firebaseService.Query('Users', 'uid', '==', user.uid)).pipe(
                take(1),
                switchMap(userDocs => {
                  // Get displayName from Users collection if available
                  const userData = userDocs.length > 0 ? (userDocs[0] as any) : {};
                  
                  // Try multiple sources for the display name in this priority:
                  // 1. Profile data passed to this method (companyName)
                  // 2. Users collection in Firestore (displayName)
                  // 3. Firebase Auth displayName
                  const displayName = profileData.companyName || userData.displayName || user.displayName || '';
                  
                  console.log('EmployerService: Creating new employer profile with company name:', displayName);
                  
                  // Create new profile with displayName as companyName
                  const newEmployer: Employer = {
                    userId: user.uid,
                    companyName: profileData.companyName || displayName || '',
                    industry: profileData.industry || '',
                    location: profileData.location || '',
                    website: profileData.website,
                    description: profileData.description || '',
                    contactEmail: user.email || '',
                    contactPhone: profileData.contactPhone,
                    verified: false // New employers start unverified
                  };
                  
                  return from(this.firebaseService.Create<Employer>(this.employersCollection, newEmployer)).pipe(
                    map(docRef => {
                      console.log('EmployerService: Created new profile with ID:', docRef.id);
                      return docRef;
                    }),
                    catchError(error => {
                      console.error('EmployerService: Error creating new profile:', error);
                      return throwError(() => new Error(`Failed to create profile: ${error.message}`));
                    })
                  );
                })
              );
            }
          })
        );
      })
    );
  }

  // Get employer by ID
  getEmployerById(employerId: string): Observable<Employer> {
    console.log('EmployerService: Getting employer by ID:', employerId);
    
    return from(this.firebaseService.Read<Employer>(this.employersCollection, employerId)).pipe(
      tap(employer => console.log('EmployerService: Retrieved employer by ID:', employer)),
      catchError(error => {
        console.error('EmployerService: Error getting employer by ID:', error);
        return throwError(() => new Error(`Failed to get employer by ID: ${error.message}`));
      })
    );
  }

  // Get verified employers (for admin)
  getVerifiedEmployers(): Observable<Employer[]> {
    console.log('EmployerService: Getting verified employers');
    
    return this.firebaseService.Query<Employer>(
      this.employersCollection,
      'verified',
      '==',
      true
    ).pipe(
      tap(employers => console.log('EmployerService: Retrieved verified employers:', employers.length)),
      catchError(error => {
        console.error('EmployerService: Error getting verified employers:', error);
        return throwError(() => new Error(`Failed to get verified employers: ${error.message}`));
      })
    );
  }

  // Get unverified employers (for admin)
  getUnverifiedEmployers(): Observable<Employer[]> {
    console.log('EmployerService: Getting unverified employers');
    
    return this.firebaseService.Query<Employer>(
      this.employersCollection,
      'verified',
      '==',
      false
    ).pipe(
      tap(employers => console.log('EmployerService: Retrieved unverified employers:', employers.length)),
      catchError(error => {
        console.error('EmployerService: Error getting unverified employers:', error);
        return throwError(() => new Error(`Failed to get unverified employers: ${error.message}`));
      })
    );
  }

  // Verify an employer (for admin)
  verifyEmployer(employerId: string): Observable<void> {
    console.log('EmployerService: Verifying employer with ID:', employerId);
    
    return from(this.firebaseService.Update(
      this.employersCollection,
      employerId,
      { verified: true }
    )).pipe(
      tap(() => console.log('EmployerService: Employer verified successfully')),
      catchError(error => {
        console.error('EmployerService: Error verifying employer:', error);
        return throwError(() => new Error(`Failed to verify employer: ${error.message}`));
      })
    );
  }

  // Update the employer's company name
  updateCompanyName(companyName: string): Observable<void> {
    console.log('EmployerService: Updating company name to:', companyName);
    
    return this.authService.getCurrentUser().pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          console.error('EmployerService: Cannot update company name: User not authenticated');
          return throwError(() => new Error('User not authenticated'));
        }
        
        // First update the employer profile
        return this.getCurrentEmployerProfile().pipe(
          take(1),
          switchMap(employer => {
            if (!employer || !employer.id) {
              console.error('EmployerService: Cannot update company name: Employer profile not found');
              return throwError(() => new Error('Employer profile not found'));
            }
            
            console.log('EmployerService: Updating company name for employer with ID:', employer.id);
            return from(this.firebaseService.Update(
              this.employersCollection,
              employer.id,
              { companyName }
            )).pipe(
              tap(() => console.log('EmployerService: Company name updated successfully in employer profile')),
              catchError(error => {
                console.error('EmployerService: Error updating company name in employer profile:', error);
                return throwError(() => new Error(`Failed to update company name: ${error.message}`));
              })
            );
          }),
          // Then update the Firebase Auth profile
          switchMap(() => {
            return from(user.updateProfile({ displayName: companyName })).pipe(
              tap(() => console.log('Firebase Auth profile updated with new company name')),
              catchError(error => {
                console.error('Error updating Firebase Auth profile:', error);
                return throwError(() => new Error(`Failed to update Auth profile: ${error.message}`));
              })
            );
          }),
          // Finally update the Users collection in Firestore
          switchMap(() => {
            return from(this.firebaseService.Update(
              'Users',
              user.uid,
              { displayName: companyName }
            )).pipe(
              tap(() => console.log('Users collection updated with new company name')),
              catchError(error => {
                console.error('Error updating company name in Users collection:', error);
                return throwError(() => new Error(`Failed to update Users collection: ${error.message}`));
              })
            );
          })
        );
      })
    );
  }
}
