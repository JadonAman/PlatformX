const PLATFORM_HOST = 'platformx.localhost';

function extractSubdomain(hostname) {
  if (!hostname) {
    return {
      isPlatform: false,
      appName: null,
    };
  }

  const normalizedHost = hostname.toLowerCase();

  if (normalizedHost === PLATFORM_HOST) {
    return {
      isPlatform: true,
      appName: null,
    };
  }

  const parts = normalizedHost.split('.');
  if(parts.length < 3) {
    return {
      isPlatform: false,
      appName: null,
    };
  }

   const subdomain = parts[0];
   const isValidAppName = /^(?!.*--)[a-z0-9-]+$/.test(subdomain);

   if(!isValidAppName){
     return{
         isPlatform: false,
         appName: null,
     };
   }
   return {
        isPlatform: false,
        appName: subdomain,
   };
}

module.exports = {
  extractSubdomain,
};
