// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { Environment } from './environment.interface';

// SECURITY NOTE: Firebase API keys in client-side code are expected and safe
// as they identify your Firebase project to Google's servers.
// However, ensure proper Firestore security rules are configured.
export const environment: Environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyBo-VDnMydyV6Ew9SHr0_XdOEBiptdYm-s",
    authDomain: "jobop-5af67.firebaseapp.com",
    projectId: "jobop-5af67",
    storageBucket: "jobop-5af67.appspot.com",
    messagingSenderId: "1065322065428",
    appId: "1:1065322065428:web:408dd83f84c8fead40c101",
    measurementId: "G-HVCT069RYY"
  },
  mapbox: {
    accessToken: "pk.eyJ1Ijoic2Vlam83IiwiYSI6ImNtY3ZqcWJ1czBic3QycHEycnM0d2xtaXEifQ.DdQ8QFpf5LlgTDtejDgJSA"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
