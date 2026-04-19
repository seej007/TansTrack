import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then(m => m.RegisterPage)
  },
 
  {
    path: 'home',
    loadChildren: () => import('./home/home.page').then(m => m.HomePage)
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
];
