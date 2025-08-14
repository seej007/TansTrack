import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, tap, catchError } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  // TEMPORARY: Set to true for development/testing purposes only
  private readonly BYPASS_AUTH_FOR_DEVELOPMENT = true; // Changed to true for academic testing
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // TEMPORARY: Bypass auth in development mode if flag is set
    if (!environment.production && this.BYPASS_AUTH_FOR_DEVELOPMENT) {
      console.log('⚠️ AuthGuard: BYPASSED for development - This should NOT be used in production!');
      return true;
    }
    
    console.log('AuthGuard: Checking authentication for:', state.url);
    
    return this.authService.isLoggedIn().pipe(
      take(1),
      tap(isLoggedIn => console.log('AuthGuard check result:', isLoggedIn ? 'authenticated' : 'not authenticated')),
      map(isLoggedIn => {
        if (isLoggedIn) {
          console.log('AuthGuard: User is logged in, allowing access to', state.url);
          return true;
        } else {
          console.log('AuthGuard: User is NOT logged in, redirecting to login');
          // Clean up any stale localStorage data
          localStorage.removeItem('userLoggedIn');
          localStorage.removeItem('accountType');
          return this.router.createUrlTree(['/login']);
        }
      }),
      catchError(error => {
        console.error('AuthGuard error:', error);
        // Clean up localStorage on error
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('accountType');
        return of(this.router.createUrlTree(['/login']));
      })
    );
  }
}
