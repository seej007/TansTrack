import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  apiUrl: "https://cdb8a58cd137.ngrok-free.app/api", 
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
