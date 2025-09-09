import { Injectable } from '@angular/core';
import { AuthService } from './services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {
  constructor(private authService: AuthService) {}

  async initializeApp() {
    // Auto-login in development mode
    try {
      console.log('Auto-login with development account');
      await this.authService.signIn('dev@example.com', 'password');
      console.log('Auto-login successful');
    } catch (error) {
      console.error('Auto-login error:', error);
    }
  }
}