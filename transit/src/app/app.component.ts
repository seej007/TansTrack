import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { AppInitService } from './app-init.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router,
    private appInitService: AppInitService
  ) {}

  async ngOnInit() {
    // Auto-login in development mode
    if (!environment.production) {
      await this.appInitService.initializeApp();
    }
    
    // Subscribe to auth state changes for app-wide auth handling
    this.authService.user$.subscribe(user => {
      console.log('App component detected auth state change:', user ? 'logged in' : 'logged out');
      
      // // In development mode, auto-navigate to home if on login page
      // if (user && !environment.production && this.router.url === '/login') {
      //   this.router.navigate(['/tabs/home']); // REMOVED DUPLICATE
      // }
    });
  }
}