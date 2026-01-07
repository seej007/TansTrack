import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root' 
})
export class AuthService {  
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUser: any = null;

  constructor(private http: HttpClient) {
    this.loadCurrentUser();
  }

  private async loadCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        this.currentUser = JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  async getCurrentUser(): Promise<any> {
    if (!this.currentUser) {
      await this.loadCurrentUser();
    }
    return this.currentUser;
  }

  async updateUserProfile(profileData: any): Promise<boolean> {
    try {
      if (!this.currentUser) {
        await this.loadCurrentUser();
      }

      if (!this.currentUser?.id && !this.currentUser?._id) {
        throw new Error('No user logged in');
      }

      const userId = this.currentUser.id || this.currentUser._id;

      // Try API update
      try {
        const response: any = await firstValueFrom(
          this.http.put(`${this.apiUrl}/users/${userId}`, profileData)
        );

        if (response.success) {
          this.currentUser = {
            ...this.currentUser,
            ...profileData
          };
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          return true;
        }
      } catch (apiError) {
        console.warn('API update failed, updating locally:', apiError);
      }

      // Fallback: Update locally
      this.currentUser = {
        ...this.currentUser,
        ...profileData
      };
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      return true;

    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      const userId = this.currentUser?.id || this.currentUser?._id;
      if (userId) {
        await firstValueFrom(
          this.http.post(`${this.apiUrl}/logout`, {})
        ).catch(err => console.warn('API logout failed:', err));
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.currentUser = null;
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    }
  }

  isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  getUserId(): string | null {
    return this.currentUser?.id || this.currentUser?._id || null;
  }
}