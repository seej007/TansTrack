// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // Use local IP for faster development (phone must be on same WiFi)
  apiUrl: 'http://192.168.1.2:8000/api',
  // apiUrl: 'https://semitextural-hyun-overpolemically.ngrok-free.dev/api', // Use this for external testing
  mapbox: {
    accessToken: 'pk.eyJ1Ijoic2Vlam83IiwiYSI6ImNtY3ZqcWJ1czBic3QycHEycnM0d2xtaXEifQ.DdQ8QFpf5LlgTDtejDgJSA'
  },
  
  payment: {
    paymaya: {
      publicKey: 'pk-rpwb5YRGEfnKiMs1dZqY4hgpvJjuy8hhxW2bVAAiz2N',
      // Note: Secret key should be handled server-side only
      baseUrl: 'https://pg-sandbox.paymaya.com' // Sandbox for testing
    }
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
