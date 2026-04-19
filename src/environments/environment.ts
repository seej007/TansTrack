export const environment = {
  production: false,
  // Use ngrok for development (works from anywhere)
  apiUrl: 'https://semitextural-hyun-overpolemically.ngrok-free.dev/api',
  // apiUrl: 'http://192.168.1.2:8000/api/v1', // Use local IP only if on same WiFi
  ocrApiKey: 'K87693276688957',

  messaging: {  
     streamApiKey: 'em2gqhhmgvng',
  streamApiSecret: '9qnnvs84t9anmvet63envwj46qc6yrp7kkg99adawv3sdrkhsshhnjc43ve6k9hu',

  },
 
  mapbox: {
    accessToken: 'pk.eyJ1Ijoic2Vlam83IiwiYSI6ImNtY3ZqcWJ1czBic3QycHEycnM0d2xtaXEifQ.DdQ8QFpf5LlgTDtejDgJSA'
  },
  
  payment: {
    paymango: {
      publicKey: 'pk_test_m1kdK8iC26wkPEBdGTgHjGJZ',
      // Note: Secret key should be handled server-side only
      baseUrl: 'https://pg-sandbox.paymango.com' // Sandbox for testing
    }
  }

};
