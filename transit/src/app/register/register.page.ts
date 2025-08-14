import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { FirestoreService } from '../services/firestore.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
  registerForm!: FormGroup;
  errorMessage: string = '';
  accountType: string = ''; // default to student
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private firestoreService: FirestoreService
  ) { }

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    // Basic form fields for all users
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      displayName: ['', [Validators.required]] // Add a display name field
    }, { 
      validator: this.passwordMatchValidator
    });
  }

  // Custom validator for password match
  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  segmentChanged(event: any) {
    this.accountType = event.detail.value;
    this.initializeForm(); // Reinitialize form when account type changes
  }

  async register() {
    if (this.registerForm.invalid) return;
    
    const { email, password, displayName } = this.registerForm.value;
    
    const loading = await this.loadingController.create({
      message: 'Creating your account...'
    });
    await loading.present();
    
    try {
      console.log('Starting registration process...');
      
      // Create Firebase Auth account
      console.log('Creating Firebase Auth account...');
      const result = await this.authService.signUp(email, password);
      console.log('Firebase Auth account created successfully:', result.user?.uid);
      
      // Update the Firebase Auth profile with display name
      if (result.user) {
        try {
          await result.user.updateProfile({
            displayName: displayName
          });
          console.log('Firebase Auth profile updated with display name:', displayName);
        } catch (profileError) {
          console.error('Error updating Firebase Auth profile:', profileError);
          // Non-blocking error - continue with registration
        }
      }
      
      // Store user data in Firestore using FirestoreService
      if (result.user) {
        console.log('Storing user data in Firestore...');
        try {
          const userData = {
            uid: result.user.uid,
            email: email,
            displayName: displayName,
            accountType: this.accountType,
            createdAt: new Date().toISOString()
          };
          
          // Use the FirestoreService to add or update the user document
          await this.firestoreService.addOrUpdateUser(userData);
          console.log('User document written/updated in Firestore successfully');
        } catch (error) {
          const firestoreError = error as Error;
          console.error('Firestore error:', firestoreError);
          
          // Show error alert to help diagnose the issue
          const errorAlert = await this.alertController.create({
            header: 'Account Setup Error',
            message: `Could not complete account setup: ${firestoreError.message || 'Unknown error'}`,
            buttons: ['OK']
          });
          await errorAlert.present();
        }
      }
      
      // Send email verification after Firestore attempt
      try {
        await this.authService.sendEmailVerification();
        console.log('Verification email sent');
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
      }
      
      await loading.dismiss();
      
      // User is now already logged in from signUp
      // No need to sign in again, just navigate to the appropriate page
      
      // Show success message
      const alert = await this.alertController.create({
        header: 'Account Created',
        message: 'Your account has been created successfully. You are now signed in.',
        buttons: ['OK']
      });
      await alert.present();
      
      // Always navigate to home page first regardless of account type
      console.log('Navigating to home page');
      this.router.navigate(['/home']);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      await loading.dismiss();
      this.errorMessage = error.message || 'Registration failed';
      
      // Show error alert
      const alert = await this.alertController.create({
        header: 'Registration Failed',
        message: this.errorMessage,
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}
