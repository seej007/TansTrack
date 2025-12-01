export const environment = {
  production: true,
  apiUrl: 'https://semitextural-hyun-overpolemically.ngrok-free.dev/api', // Update with your production API
  mapbox: {
    accessToken: 'pk.eyJ1Ijoic2Vlam83IiwiYSI6ImNtY3ZqcWJ1czBic3QycHEycnM0d2xtaXEifQ.DdQ8QFpf5LlgTDtejDgJSA'
  },
  payment: {
    paymango: {
      publicKey: 'pk-pk_test_m1kdK8iC26wkPEBdGTgHjGJZ',
      // Note: Secret key should be handled server-side only
      baseUrl: 'https://pg.paymango.com' // Production URL
    }
  }
};
