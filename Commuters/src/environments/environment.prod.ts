export const environment = {
  production: true,
  apiUrl: 'https://your-production-api-url.com/api', // Update with your production API
  mapbox: {
    accessToken: 'pk.eyJ1Ijoic2Vlam83IiwiYSI6ImNtY3ZqcWJ1czBic3QycHEycnM0d2xtaXEifQ.DdQ8QFpf5LlgTDtejDgJSA'
  },
  payment: {
    paymaya: {
      publicKey: 'pk-rpwb5YRGEfnKiMs1dZqY4hgpvJjuy8hhxW2bVAAiz2N',
      // Note: Secret key should be handled server-side only
      baseUrl: 'https://pg.paymaya.com' // Production URL
    }
  }
};
