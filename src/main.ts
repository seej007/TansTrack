import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { routes } from './app/app.routes';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

registerLocaleData(localeEn);

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideIonicAngular(),
    provideHttpClient(
      withFetch(),  // ✅ Fixes XHR credentials warning
      withInterceptorsFromDi()
    )
  ]
}).catch(err => console.error(err));
