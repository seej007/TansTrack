import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  loginForm!: FormGroup;
  errorMessage: string = '';
  isDevelopmentMode: boolean = !environment.production;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async login() {
    if (this.loginForm.invalid) return;
    
    const { email, password } = this.loginForm.value;
    
    try {
      console.log('Starting login process...');
      const result = await this.authService.signIn(email, password);
      console.log('Login successful:', result.user?.uid);

      // Navigate to tabs home page
      console.log('Navigating to tabs home page');
      this.router.navigate(['/tabs/home']);
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage = error.message || 'Login failed';
    }
  }

  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Forgot Password',
      message: 'Please enter your email address to reset your password.',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset Password',
          handler: async (data) => {
            if (!data.email) {
              this.errorMessage = 'Please enter your email address';
              return false;
            }
            
            try {
              await this.authService.sendPasswordResetEmail(data.email);
              const successAlert = await this.alertController.create({
                header: 'Success',
                message: 'Password reset email sent. Please check your inbox.',
                buttons: ['OK']
              });
              await successAlert.present();
              return true;
            } catch (error: any) {
              this.errorMessage = error.message || 'Failed to send reset email';
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Quick login for development mode
  async loginWithDevelopmentAccount() {
    try {
      console.log('Using development account to login');
      await this.authService.signIn('dev@example.com', 'password');
      this.router.navigate(['/tabs/home']);
    } catch (error) {
      console.error('Development login error:', error);
    }
  }
}
