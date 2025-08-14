import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { StudentService, Student, Achievement } from '../services/student.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { catchError, finalize, take } from 'rxjs/operators';
import { of, firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FirestoreService } from '../services/firestore.service';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

@Component({
  selector: 'app-student',
  templateUrl: './student.page.html',
  styleUrls: ['./student.page.scss'],
  standalone: false
})
export class StudentPage implements OnInit {
  student: Student = {
    id: '',
    userId: '',
    name: '',
    age: 0,
    school: '',
    grade: '',
    email: '',
    bio: '',
    location: 'City',
    interests: [],
    achievements: []
  };
  
  profileForm!: FormGroup;
  currentSegment = 'achievements';
  editMode = false;
  loading = false;
  bioEditMode = false;

  // TESTING PROPERTIES FOR ACADEMIC PURPOSES
  isTestingMode = true; // Set to true for academic testing
  testName = 'Po'; // Default test name
  

  constructor(
    private studentService: StudentService,
    private fb: FormBuilder,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private authService: AuthService,
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private firestoreService: FirestoreService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit() {
    this.initProfileForm();
    this.loadStudentProfile();
  }

  ionViewWillEnter() {
    console.log('🔄 Profile page entering view, checking name consistency...');
    // This ensures the name is synced when navigating back to this page
    this.syncProfileName();
  }

  // Additional method to sync the user's display name across all sources
  async syncProfileName() {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        console.log('⚠️ Cannot sync profile name: No authenticated user');
        return;
      }
      
      console.log('🔄 Syncing profile name across all sources...');
      const syncedName = await this.firestoreService.syncUserDisplayName(user.uid);
      
      if (syncedName && this.student) {
        console.log('✅ Name synced successfully. Updating UI with:', syncedName);
        this.student.name = syncedName;
        this.profileForm.get('name')?.setValue(syncedName);
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('❌ Error syncing profile name:', error);
    }
  }

  initProfileForm() {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      age: [null, [Validators.required, Validators.min(13), Validators.max(22)]],
      school: ['', Validators.required],
      grade: ['', Validators.required],
      location: [''],
      bio: ['']
    });
  }

  loadStudentProfile() {
    this.loading = true;
    console.log('🔄 Loading student profile with pure Firebase SDK...');
    
    // Use pure Firebase SDK to avoid injection context errors
    const loadProfileWithFirebase = async () => {
      try {
        // Get current user from Firebase Auth
        const user = await firebase.auth().currentUser;
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        console.log('👤 Current user:', user.uid, user.displayName, user.email);
        
        // 1. First check Users collection for display name
        const db = firebase.firestore();
        const userDoc = await db.collection('Users').doc(user.uid).get();
        const userData = userDoc.exists ? userDoc.data() || {} : {};
        
        console.log('📝 User document data:', userData);
        
        // 2. Determine name from multiple sources with fallbacks
        let displayName = null;
        
        // Try to get name from Auth
        if (user.displayName) {
          displayName = user.displayName;
          console.log('📝 Using name from Firebase Auth:', displayName);
        } 
        // Try to get name from Users collection
        else if (userData && userData['displayName']) {
          displayName = userData['displayName'];
          console.log('📝 Using name from Users collection:', displayName);
        }
        // Fallback to email or default
        else {
          displayName = user.email?.split('@')[0] || 'New Student';
          console.log('📝 Using fallback name:', displayName);
        }
        
        // 3. Query Firestore for student profile
        const studentQuery = await db.collection('students')
          .where('userId', '==', user.uid)
          .limit(1)
          .get();
        
        if (studentQuery.empty) {
          console.log('📝 No student profile found, creating one...');
          
          // Create new student profile using the name we determined above
          const newStudent: Student = {
            userId: user.uid,
            name: displayName,
            age: 0,
            school: '',
            grade: '',
            email: user.email || userData['email'] || '',
            bio: '',
            location: 'City',
            interests: [],
            achievements: []
          };
          
          // Add new student to Firestore
          const docRef = await db.collection('students').add(newStudent);
          
          // Get ID from created document
          newStudent.id = docRef.id;
          
          console.log('✅ Created new student profile with name:', displayName);
          
          // Also ensure Users collection has latest display name
          if (!userDoc.exists || userData['displayName'] !== displayName) {
            await db.collection('Users').doc(user.uid).set({
              displayName: displayName,
              email: user.email || '',
              uid: user.uid,
              accountType: 'student',
              updatedAt: new Date().toISOString()
            }, { merge: true });
            console.log('✅ Updated Users collection with display name:', displayName);
          }
          
          
          // Update local state
          this.student = newStudent;
          this.updateFormWithStudentData();
          
          console.log('✅ New student profile created:', newStudent);
          this.presentToast('Please complete your profile.');
        } else {
          // Use existing student profile
          const doc = studentQuery.docs[0];
          const studentData = doc.data() as Student;
          studentData.id = doc.id;
          
          console.log('✅ Found existing student profile:', studentData);
          
          // Check if name in student document is different from Auth or Users collection
          // This ensures we show the most up-to-date name
          if (displayName && studentData.name !== displayName) {
            console.log('📝 Name mismatch detected. Updating student profile name from:', 
              studentData.name, 'to:', displayName);
            
            // Update the student document with the name from Auth/Users
            await db.collection('students').doc(doc.id).update({
              name: displayName,
              updatedAt: new Date().toISOString()
            });
            
            // Update local data
            studentData.name = displayName;
            console.log('✅ Updated student profile with current name:', displayName);
          }
          
          // Update local state
          this.student = studentData;
          this.updateFormWithStudentData();
        }
        
        // Force change detection to update UI
        this.cdr.detectChanges();
        
      } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Error loading profile:', err);
        
        // Fallback to display name from auth if profile load fails
        const user = await firebase.auth().currentUser;
        if (user) {
          // Try all possible sources for a name in fallback mode
          let fallbackName = 'Profile';
          
          if (user.displayName) {
            fallbackName = user.displayName;
            console.log('🔄 Fallback: Using name from Auth:', fallbackName);
          } else {
            try {
              // Try getting from Users collection as last resort
              const db = firebase.firestore();
              const userDoc = await db.collection('Users').doc(user.uid).get();
              const userData = userDoc.exists ? userDoc.data() : null;
              
              if (userData && userData['displayName']) {
                fallbackName = userData['displayName'];
                console.log('🔄 Fallback: Using name from Users collection:', fallbackName);
              } else if (user.email) {
                fallbackName = user.email.split('@')[0];
                console.log('🔄 Fallback: Using email username:', fallbackName);
              }
            } catch (e) {
              console.error('❌ Error in fallback name retrieval:', e);
            }
          }
          
          // Apply fallback name to UI
          this.student.name = fallbackName;
          this.profileForm.get('name')?.setValue(fallbackName);
          
          // Force UI update
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        }
        
        this.presentToast('Error loading complete profile. Basic details recovered.');
      } finally {
        this.loading = false;
        
        // Make sure UI updates
        setTimeout(() => {
          this.cdr.detectChanges();
          console.log('🔄 Final state - Student name:', this.student?.name);
        }, 0);
      }
    };
    
    // Execute the async function
    loadProfileWithFirebase();
    
    // Sync profile name across all sources after a short delay
    // This ensures name consistency even if the main profile load has issues
    setTimeout(() => {
      this.syncProfileName();
    }, 1000);
  }

  updateFormWithStudentData() {
    this.profileForm.patchValue({
      name: this.student.name,
      age: this.student.age,
      school: this.student.school,
      grade: this.student.grade,
      location: this.student.location || '',
      bio: this.student.bio || ''
    });
  }

  segmentChanged(event: any) {
    this.currentSegment = event.detail.value;
  }

  startEditMode() {
    this.editMode = true;
  }

  async addAchievement() {
    const alert = await this.alertController.create({
      header: 'Add Achievement',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Title'
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description'
        },
        {
          name: 'date',
          type: 'date',
          placeholder: 'Date'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add',
          handler: (data) => {
            if (data.title && data.description && data.date) {
              const achievement: Achievement = {
                title: data.title,
                description: data.description,
                date: data.date
              };
              
              this.studentService.addAchievement(achievement).subscribe({
                next: () => {
                  if (!this.student.achievements) {
                    this.student.achievements = [];
                  }
                  this.student.achievements.push(achievement);
                  this.presentToast('Achievement added successfully');
                },
                error: (err: Error) => {
                  console.error('Error adding achievement:', err);
                  this.presentToast('Failed to add achievement');
                }
              });
            } else {
              this.presentToast('Please fill all fields');
              return false;
            }
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  removeAchievement(achievementId: string) {
    this.studentService.removeAchievement(achievementId).subscribe({
      next: () => {
        this.student.achievements = this.student.achievements.filter(a => a.id !== achievementId);
        this.presentToast('Achievement removed successfully');
      },
      error: (err: Error) => {
        console.error('Error removing achievement:', err);
        this.presentToast('Failed to remove achievement');
      }
    });
  }

  async editProfile() {
    console.log('�️ EDIT ICON CLICKED - Starting editProfile()');
    console.log('📝 Current student name:', this.student.name);
    console.log('📝 Current student object:', this.student);
    
    try {
      const alert = await this.alertController.create({
        header: 'Edit Your Name',
        message: 'Change your display name to test database updates',
        inputs: [
          {
            name: 'name',
            type: 'text',
            placeholder: 'Enter new name',
            value: this.student.name || 'Po'
          }
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              console.log('❌ User cancelled name edit');
            }
          },
          {
            text: 'Update Name',
            handler: async (data) => {
              console.log('📝 Form data received:', data);
              if (data.name && data.name.trim()) {
                console.log('✅ Valid name entered, calling simpleNameUpdate...');
                await this.simpleNameUpdate(data.name.trim());
                return true;
              } else {
                console.log('❌ Invalid name entered');
                this.presentToast('Please enter a valid name');
                return false;
              }
            }
          }
        ]
      });
      
      console.log('📱 Alert created, about to present...');
      await alert.present();
      console.log('📱 Alert presented successfully');
      
    } catch (error) {
      console.error('❌ Error in editProfile():', error);
      this.presentToast('Error opening edit dialog');
    }
  }

  // Simple, direct name update using AngularFire services
  async simpleNameUpdate(newName: string) {
    console.log('🔄 Simple name update to:', newName);
    
    const loading = await this.loadingController.create({
      message: `Updating to "${newName}"...`
    });
    await loading.present();

    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      console.log('📝 User UID:', user.uid);

      // 1. Update Firebase Auth
      await user.updateProfile({ displayName: newName });
      console.log('✅ Auth updated');

      // 2. Update Users collection with detailed logging
      console.log('🔄 Attempting to update Users collection...');
      console.log('📝 Document path: Users/' + user.uid);
      
      // Use pure Firebase instead of AngularFire to avoid injection context errors
      const db = firebase.firestore();
      const userDoc = await db.collection('Users').doc(user.uid).get();
      
      console.log('📄 User document exists:', userDoc.exists);
      
      if (userDoc.exists) {
        console.log('📄 Current document data:', userDoc.data());
        
        // Update existing document
        await db.collection('Users').doc(user.uid).update({
          displayName: newName,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Users collection updated (existing document)');
      } else {
        console.log('📄 Document does not exist, creating new one...');
        
        // Create new document if it doesn't exist
        await db.collection('Users').doc(user.uid).set({
          displayName: newName,
          email: user.email || '',
          uid: user.uid,
          accountType: 'student',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Users collection created (new document)');
      }

      // 3. Update or create students document with detailed logging
      console.log('🔄 Attempting to update students collection...');
      
      // Reuse the same db instance
      const studentQuery = await db.collection('students')
        .where('userId', '==', user.uid).get();

      console.log('📄 Student query results:', studentQuery.size, 'documents found');

      if (studentQuery.empty) {
        console.log('📄 No student document found, creating new one...');
        // Create new student
        const newStudentDoc = await db.collection('students').add({
          userId: user.uid,
          name: newName,
          age: 0,
          school: '',
          grade: '',
          email: user.email || '',
          bio: '',
          location: 'City',
          interests: [],
          achievements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ New student created with ID:', newStudentDoc.id);
      } else {
        // Update existing student
        const doc = studentQuery.docs[0];
        console.log('📄 Updating existing student document ID:', doc.id);
        console.log('📄 Current student data:', doc.data());
        
        await db.collection('students').doc(doc.id).update({
          name: newName,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Student document updated');
      }

      // Update local state and trigger change detection
      this.student.name = newName;
      
      // Update the form as well
      if (this.profileForm) {
        this.profileForm.patchValue({ name: newName });
      }
      
      // Force Angular change detection in the next cycle
      setTimeout(() => {
        this.cdr.detectChanges();
        console.log('🔄 Change detection triggered - UI should update now');
      }, 0);
      
      this.presentToast(`✅ Name updated to "${newName}"`);
      console.log('✅ All updates complete');
      
      // Reload profile to ensure UI is updated with new data
      console.log('🔄 Syncing profile name across all sources...');
      await this.syncProfileName();
      
      console.log('🔄 Reloading profile to ensure UI is updated...');
      setTimeout(() => {
        this.loadStudentProfile();
      }, 500);

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Update failed:', err);
      this.presentToast(`❌ Failed: ${err.message}`);
    } finally {
      await loading.dismiss();
    }
  }

  editBio() {
    this.bioEditMode = true;
  }

  saveBio() {
    const bio = this.profileForm.get('bio')?.value;
    
    if (bio === undefined || bio === null) {
      this.presentToast('Bio cannot be empty');
      return;
    }
    
    console.log('Attempting to save bio:', bio);
    
    // Show loading spinner
    this.loadingController.create({
      message: 'Updating bio...'
    }).then(loading => {
      loading.present();
      
      this.studentService.updateBio(bio).subscribe({
        next: () => {
          console.log('Bio updated successfully');
          this.student.bio = bio;
          this.bioEditMode = false;
          this.presentToast('Bio updated successfully');
          loading.dismiss();
        },
        error: (err: Error) => {
          console.error('Error updating bio:', err);
          this.presentToast('Failed to update bio: ' + (err.message || 'Unknown error'));
          loading.dismiss();
        }
      });
    });
  }

  cancelBioEdit() {
    this.profileForm.get('bio')?.setValue(this.student.bio || '');
    this.bioEditMode = false;
  }

  async editDisplayName() {
    const alert = await this.alertController.create({
      header: 'Edit Display Name',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Display Name',
          value: this.student.name
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            if (!data.name || !data.name.trim()) {
              this.presentToast('Name cannot be empty');
              return false;
            }
            
            const newName = data.name.trim();
            if (newName !== this.student.name) {
              // Use the same working method that the header edit icon used
              console.log('✅ Valid name entered, calling simpleNameUpdate...');
              await this.simpleNameUpdate(newName);
              
              // No need to reload profile here as simpleNameUpdate already does it
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // Uses StudentService's safe method that avoids injection context issues
  async updateDisplayName() {
    try {
      const name = this.profileForm?.get('name')?.value;
      
      if (name && name.trim() && this.student?.name !== name.trim()) {
        // Show loading spinner
        const loading = await this.loadingController.create({
          message: 'Updating name...'
        });
        await loading.present();
        
        try {
          // Use our fixed StudentService that uses native Firebase APIs directly
          await firstValueFrom(this.studentService.updateDisplayName(name.trim()));
          
          // Update local state
          this.student.name = name.trim();
          
          // Confirm success to user
          this.presentToast('Name updated successfully');
        } catch (error: unknown) {
          const err = error as Error;
          console.error('Error updating name:', err);
          this.presentToast('Failed to update name: ' + (err.message || 'Unknown error'));
        } finally {
          loading.dismiss();
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error in updateDisplayName:', err);
      this.presentToast('An error occurred: ' + (err.message || 'Unknown error'));
    }
  }

  // Simple test method for debugging
  async testNameUpdate() {
    console.log('🧪 TESTING NAME UPDATE DIRECTLY');
    
    const loading = await this.loadingController.create({
      message: 'Testing name update...'
    });
    await loading.present();
    
    try {
      const user = await this.afAuth.currentUser;
      console.log('🔍 Current user:', user);
      
      if (!user) {
        throw new Error('No authenticated user found');
      }
      
      console.log('📝 User details:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
      
      const newName = 'TestEdit' + Date.now();
      console.log('🔄 Updating to:', newName);
      
      // Update auth
      await user.updateProfile({ displayName: newName });
      console.log('✅ Auth updated');
      
      // Update Users collection
      await this.firestore.collection('Users').doc(user.uid).set({
        displayName: newName,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Users collection updated');
      
      // Update students collection
      const studentQuery = await this.firestore.collection('students')
        .ref.where('userId', '==', user.uid).get();
      
      if (!studentQuery.empty) {
        const doc = studentQuery.docs[0];
        await doc.ref.update({
          name: newName,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Existing student updated');
      } else {
        await this.firestore.collection('students').add({
          userId: user.uid,
          name: newName,
          email: user.email || '',
          age: 0,
          school: '',
          grade: '',
          bio: '',
          location: 'City',
          interests: [],
          achievements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ New student created');
      }
      
      // Update local state
      this.student.name = newName;
      
      this.presentToast(`✅ Test successful! Name: ${newName}`);
      
      // Reload profile to verify changes
      console.log('🔄 Reloading profile to verify changes...');
      setTimeout(() => {
        this.loadStudentProfile();
      }, 500);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      this.presentToast(`❌ Test failed: ${error}`);
    } finally {
      await loading.dismiss();
    }
  }

  // Navigation method to return to home page
  goHome() {
    console.log('🏠 Navigating to home page...');
    this.router.navigate(['/tabs/home']);
  }

  // Method to confirm and delete user account
  async confirmDeleteAccount() {
    const alert = await this.alertController.create({
      header: 'Delete Account',
      message: 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Delete',
          cssClass: 'danger',
          handler: () => {
            this.deleteAccount();
          }
        }
      ]
    });

    await alert.present();
  }

  // Method to delete user account
  async deleteAccount() {
    const loading = await this.loadingController.create({
      message: 'Deleting account...'
    });
    
    await loading.present();
    
    try {
      const user = await this.afAuth.currentUser;
      
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      const uid = user.uid;
      
      // 1. Delete Firestore data
      await this.firestoreService.deleteUserAccount(uid);
      
      // 2. Delete the Firebase Auth user
      await user.delete();
      
      await loading.dismiss();
      
      this.presentToast('Your account has been successfully deleted');
      
      // 3. Sign out and redirect to login
      this.authService.signOut();
      this.router.navigate(['/login']);
      
    } catch (error: unknown) {
      await loading.dismiss();
      
      const err = error as Error;
      console.error('❌ Account deletion failed:', err);
      
      // If the error is about requiring recent login
      if (err.message && err.message.includes('requires-recent-login')) {
        this.presentReauthenticateAlert();
      } else {
        this.presentToast(`❌ Failed to delete account: ${err.message}`);
      }
    }
  }
  
  // Show alert requiring re-authentication
  async presentReauthenticateAlert() {
    const alert = await this.alertController.create({
      header: 'Re-authentication Required',
      message: 'For security reasons, you need to log in again before deleting your account.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Log in again',
          handler: () => {
            // Log out and redirect to login page
            this.authService.signOut();
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    
    await alert.present();
  }

  // Helper method to show toast messages
  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}