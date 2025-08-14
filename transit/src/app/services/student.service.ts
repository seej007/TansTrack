import { Injectable } from '@angular/core';
import { Observable, from, of, throwError, firstValueFrom } from 'rxjs';
import { map, switchMap, take, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { FirebaseServiceService } from '../firebase-service.service';
import firebase from 'firebase/compat/app';

export interface Student {
  id?: string;
  userId: string;
  name: string;
  age: number;
  school: string;
  grade: string;
  email: string;
  phone?: string;
  address?: string;
  bio?: string;
  location?: string;
  interests: string[];
  achievements: Achievement[];
}

export interface Achievement {
  id?: string;
  title: string;
  description: string;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private studentsCollection = 'students';

  constructor(
    private authService: AuthService,
    private firebaseService: FirebaseServiceService
  ) {}

  /**
   * Updates the student's display name in all required places using only native Firebase APIs.
   * This method avoids Angular injection context issues by not using any injected services.
   * @param displayName The new display name to set
   * @returns Promise that resolves when the update is complete
   */
  updateDisplayNameEverywhere(displayName: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
          reject(new Error('User not authenticated'));
          return;
        }

        console.log(`🔄 Updating display name to: ${displayName}`);

        // 1. Update Firebase Auth displayName
        await currentUser.updateProfile({ displayName });
        console.log('✅ Firebase Auth displayName updated');

        // 2. Update Users collection in Firestore
        await firebase.firestore().collection('Users').doc(currentUser.uid).set({
          displayName,
          uid: currentUser.uid,
          email: currentUser.email,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Users collection updated');

        // 3. Find and update the student document, create if it doesn't exist
        const studentQuerySnapshot = await firebase.firestore()
          .collection('students')
          .where('userId', '==', currentUser.uid)
          .get();

        if (studentQuerySnapshot.empty) {
          // Create a new student profile if it doesn't exist
          console.log('📝 Student profile not found, creating new one...');
          
          // Get user data from Users collection to get account type
          const userDoc = await firebase.firestore().collection('Users').doc(currentUser.uid).get();
          const userData = userDoc.data();
          
          // Only create student profile if the user is actually a student
          if (userData && userData['accountType'] === 'student') {
            const newStudent = {
              userId: currentUser.uid,
              name: displayName,
              age: 0,
              school: '',
              grade: '',
              email: currentUser.email || '',
              bio: '',
              location: '',
              interests: [],
              achievements: [],
            };

            await firebase.firestore().collection('students').add(newStudent);
            console.log('✅ New student profile created with name:', displayName);
          } else {
            console.log('⚠️ User is not a student, skipping student profile creation');
          }
        } else {
          // Update existing student document
          const studentDoc = studentQuerySnapshot.docs[0];
          await firebase.firestore()
            .collection('students')
            .doc(studentDoc.id)
            .update({ 
              name: displayName,
              updatedAt: new Date().toISOString()
            });
          console.log('✅ Student profile updated with name:', displayName);
        }

        console.log('✅ Display name update completed successfully');
        resolve();
      } catch (error) {
        console.error('❌ Error updating display name:', error);
        reject(new Error(`Failed to update display name: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  /**
   * Get the current student profile for the authenticated user.
   * Creates a new profile if it doesn't exist.
   */
  getCurrentStudentProfile(): Observable<Student> {
    return this.authService.getCurrentUser().pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }
        // Use direct Firebase SDK instead of firebaseService to avoid injection context issues
        return from(
          firebase.firestore()
            .collection(this.studentsCollection)
            .where('userId', '==', user.uid)
            .get()
            .then(querySnapshot => {
              const students = querySnapshot.docs.map(doc => ({ 
                id: doc.id,
                ...doc.data() 
              } as Student));
              return students;
            })
        ).pipe(
          switchMap(students => {
            if (students && students.length > 0) {
              console.log('✅ Found existing student profile');
              return of(students[0]);
            } else {
              console.log('📝 No student profile found, creating one...');
              return this.createNewStudentProfile(user);
            }
          }),
          catchError(error => {
            console.error('❌ Error getting student profile:', error);
            return throwError(() => new Error(`Failed to get student profile: ${error.message}`));
          })
        );
      })
    );
  }

  /**
   * Create a new student profile for the authenticated user.
   */
  private createNewStudentProfile(user: firebase.User): Observable<Student> {
    console.log(`📝 Creating new student profile for user: ${user.uid}`);
    
    // Use direct Firebase SDK instead of firebaseService to avoid injection context issues
    return from(
      firebase.firestore()
        .collection('Users')
        .where('uid', '==', user.uid)
        .get()
        .then(querySnapshot => {
          const userDocs = querySnapshot.docs.map(doc => ({ 
            id: doc.id,
            ...doc.data() 
          }));
          return userDocs;
        })
    ).pipe(
      take(1),
      switchMap(userDocs => {
        const userData = userDocs.length > 0 ? (userDocs[0] as any) : {};
        console.log('📄 User data from Users collection:', userData);
        
        const displayName = user.displayName || userData.displayName || userData.email || 'New Student';
        
        const newStudent: Student = {
          userId: user.uid,
          name: displayName,
          age: 0,
          school: '',
          grade: '',
          email: user.email || userData.email || '',
          bio: '',
          location: '',
          interests: [],
          achievements: []
        };
        
        console.log('🆕 Creating student profile:', newStudent);
        
        return from(this.firebaseService.Create<Student>(this.studentsCollection, newStudent)).pipe(
          map(docRef => {
            const studentWithId = { ...newStudent, id: docRef.id };
            console.log('✅ Student profile created successfully:', studentWithId);
            return studentWithId;
          }),
          catchError(error => {
            console.error('❌ Failed to create student profile:', error);
            return throwError(() => new Error(`Failed to create student profile: ${error.message}`));
          })
        );
      }),
      catchError(error => {
        console.error('❌ Error in createNewStudentProfile:', error);
        return throwError(() => new Error(`Failed to create student profile: ${error.message}`));
      })
    );
  }

  /**
   * Add a new achievement to the student's profile
   */
  addAchievement(achievement: Achievement): Observable<void> {
    return this.ensureStudentProfileExists().pipe(
      take(1),
      switchMap(student => {
        if (!student.id) {
          return throwError(() => new Error('Student profile not found'));
        }
        
        const achievementWithId = { ...achievement, id: Date.now().toString() };
        const updatedAchievements = [...student.achievements, achievementWithId];
        return from(this.firebaseService.Update(this.studentsCollection, student.id, { achievements: updatedAchievements }));
      }),
      catchError(error => throwError(() => new Error(`Failed to add achievement: ${error.message}`)))
    );
  }

  /**
   * Remove an achievement from the student's profile
   */
  removeAchievement(achievementId: string): Observable<void> {
    return this.ensureStudentProfileExists().pipe(
      take(1),
      switchMap(student => {
        if (!student.id) {
          return throwError(() => new Error('Student profile not found'));
        }
        
        const updatedAchievements = student.achievements.filter(a => a.id !== achievementId);
        return from(this.firebaseService.Update(this.studentsCollection, student.id, { achievements: updatedAchievements }));
      }),
      catchError(error => throwError(() => new Error(`Failed to remove achievement: ${error.message}`)))
    );
  }

  /**
   * Save the complete student profile
   */
  saveStudentProfile(profileData: Partial<Student>): Observable<void> {
    return this.ensureStudentProfileExists().pipe(
      take(1),
      switchMap(student => {
        if (!student.id) {
          return throwError(() => new Error('Student profile not found'));
        }
        
        // Use direct Firebase SDK instead of firebaseService to avoid injection context issues
        return from(new Promise<void>((resolve, reject) => {
          try {
            firebase.firestore()
              .collection(this.studentsCollection)
              .doc(student.id)
              .update(profileData)
              .then(() => {
                console.log('✅ Student profile saved successfully');
                resolve();
              })
              .catch(err => {
                console.error('❌ Error saving student profile:', err);
                reject(err);
              });
          } catch (err) {
            console.error('❌ Exception saving student profile:', err);
            reject(err);
          }
        }));
      }),
      catchError(error => throwError(() => new Error(`Failed to save student profile: ${error.message}`)))
    );
  }

  /**
   * Update the student's bio
   */
  updateBio(bio: string): Observable<void> {
    return this.ensureStudentProfileExists().pipe(
      take(1),
      switchMap(student => {
        if (!student.id) {
          return throwError(() => new Error('Student profile not found'));
        }
        
        // Use direct Firebase SDK instead of firebaseService to avoid injection context issues
        return from(new Promise<void>((resolve, reject) => {
          try {
            firebase.firestore()
              .collection(this.studentsCollection)
              .doc(student.id)
              .update({ bio })
              .then(() => {
                console.log('✅ Bio updated successfully');
                resolve();
              })
              .catch(err => {
                console.error('❌ Error updating bio:', err);
                reject(err);
              });
          } catch (err) {
            console.error('❌ Exception updating bio:', err);
            reject(err);
          }
        }));
      }),
      catchError(error => throwError(() => new Error(`Failed to update bio: ${error.message}`)))
    );
  }

  /**
   * Ensures that a student profile exists for the current user.
   * Creates one if it doesn't exist using existing user data from Firebase Auth and Users collection.
   */
  private ensureStudentProfileExists(): Observable<Student> {
    return this.getCurrentStudentProfile().pipe(
      tap((student: Student) => {
        console.log('✅ Student profile found:', student);
      }),
      catchError((error) => {
        console.log('❌ Student profile not found, creating new one for existing user...');
        
        return this.authService.getCurrentUser().pipe(
          take(1),
          switchMap(user => {
            if (!user) {
              return throwError(() => new Error('User not authenticated'));
            }
            
            console.log('👤 Current user:', user.uid, user.displayName, user.email);
            
            // Get existing user data from Users collection
            return from(firebase.firestore().collection('Users').doc(user.uid).get()).pipe(
              switchMap(userDoc => {
                const userData = userDoc.data();
                console.log('📄 User data from Firestore:', userData);
                
                // Create student profile using existing user data
                const displayName = user.displayName || userData?.['displayName'] || 'Student';
                const newStudent: Student = {
                  userId: user.uid,
                  name: displayName,
                  age: 0,
                  school: '',
                  grade: '',
                  email: user.email || userData?.['email'] || '',
                  bio: '',
                  location: '',
                  interests: [],
                  achievements: []
                };
                
                console.log('📝 Creating new student profile:', newStudent);
                
                // Use direct Firebase SDK instead of firebaseService to avoid injection context issues
                return from(new Promise<Student>((resolve, reject) => {
                  try {
                    firebase.firestore()
                      .collection(this.studentsCollection)
                      .add(newStudent)
                      .then(docRef => {
                        const studentWithId = { ...newStudent, id: docRef.id };
                        console.log('✅ Student profile created successfully:', studentWithId);
                        resolve(studentWithId);
                      })
                      .catch(err => {
                        console.error('❌ Error creating student profile:', err);
                        reject(err);
                      });
                  } catch (err) {
                    console.error('❌ Exception creating student profile:', err);
                    reject(err);
                  }
                }));
              })
            );
          })
        );
      })
    );
  }

  /**
   * Safe method to update display name with proper error handling
   * This ensures the student profile exists before updating
   */
  async updateDisplayNameSafe(displayName: string): Promise<void> {
    try {
      console.log(`🔄 Starting safe display name update to: ${displayName}`);
      
      // First, ensure the student profile exists
      const student = await firstValueFrom(this.ensureStudentProfileExists());
      console.log('✅ Student profile confirmed, proceeding with update');
      
      // Now update the display name everywhere
      await this.updateDisplayNameEverywhere(displayName);
      
      console.log('✅ Display name update completed successfully');
    } catch (error) {
      console.error('❌ Error in updateDisplayNameSafe:', error);
      throw new Error(`Failed to update display name: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update display name and return as Observable for compatibility
   */
  updateDisplayName(displayName: string): Observable<void> {
    return from(this.updateDisplayNameEverywhere(displayName)).pipe(
      catchError(error => throwError(() => new Error(`Failed to update display name: ${error instanceof Error ? error.message : String(error)}`)))
    );
  }

  /**
   * TESTING METHOD: Creates a test student profile for academic purposes
   * This bypasses authentication and creates a student profile with test data
   */
  async createTestStudentProfile(name: string = 'Po'): Promise<void> {
    console.log('🧪 Creating test student profile for academic testing...');
    
    try {
      // Create a test user ID (you can use a fixed ID for testing)
      const testUserId = 'test-user-12345';
      
      // Check if test student already exists
      const existingStudents = await firebase.firestore()
        .collection('students')
        .where('userId', '==', testUserId)
        .get();
      
      if (!existingStudents.empty) {
        console.log('🧪 Test student profile already exists, updating name...');
        const studentDoc = existingStudents.docs[0];
        await firebase.firestore()
          .collection('students')
          .doc(studentDoc.id)
          .update({ 
            name: name,
            updatedAt: new Date().toISOString()
          });
        console.log('✅ Test student name updated successfully');
        return;
      }

      // Create new test student profile
      const testStudent = {
        userId: testUserId,
        name: name,
        age: 20,
        school: 'Test University',
        grade: 'Junior',
        email: 'test@example.com',
        bio: 'This is a test student profile for academic purposes',
        location: 'Test City',
        interests: ['Web Development', 'Mobile Apps'],
        achievements: [
          {
            id: '1',
            title: 'Test Achievement',
            description: 'Completed testing milestone',
            date: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await firebase.firestore().collection('students').add(testStudent);
      console.log('✅ Test student profile created successfully');
      
    } catch (error) {
      console.error('❌ Error creating test student profile:', error);
      throw error;
    }
  }

  /**
   * TESTING METHOD: Updates test student name and logs the changes
   */
  async updateTestStudentName(newName: string): Promise<void> {
    console.log(`🧪 Updating test student name to: ${newName}`);
    
    try {
      const testUserId = 'test-user-12345';
      
      // Find the test student
      const studentQuery = await firebase.firestore()
        .collection('students')
        .where('userId', '==', testUserId)
        .get();
      
      if (studentQuery.empty) {
        console.log('🧪 No test student found, creating one first...');
        await this.createTestStudentProfile(newName);
        return;
      }

      // Update the student name
      const studentDoc = studentQuery.docs[0];
      const oldData = studentDoc.data();
      
      console.log('📝 Before update:', { name: oldData['name'] });
      
      await firebase.firestore()
        .collection('students')
        .doc(studentDoc.id)
        .update({ 
          name: newName,
          updatedAt: new Date().toISOString()
        });
      
      // Verify the update
      const updatedDoc = await firebase.firestore()
        .collection('students')
        .doc(studentDoc.id)
        .get();
      
      const newData = updatedDoc.data();
      console.log('📝 After update:', { name: newData?.['name'] });
      console.log('✅ Test student name updated successfully');
      
    } catch (error) {
      console.error('❌ Error updating test student name:', error);
      throw error;
    }
  }

}
