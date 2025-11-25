const { extractSubdomain } = require('../utils/subdomainExtractor');
const { resolveApp } = require('../utils/appResolver');

function platformRouter(req , res , next){
    const hostname =req.hostname;
    const sub = extractSubdomain(hostname);
    if(sub.isPlatform){
        return next();
    }
    if(!sub.appName){
        return res.status(404).send({error: ' Invalid app domain'});
    }
    const result = resolveApp(sub.appName);
    if(!result.exists){
        return res.status(404).send({ error: 'App not found'});
    }
    req.appName = sub.appName;
    req.appPath = result.appPath;
    
    next();
}

module.exports = {
    platformRouter,
}