const useragent = require('useragent');
const jwt_decode = require('jwt-decode');
const { getRedisRoute } = require('../helpers/redis');

async function writelog(req, res, next) {
  let curd_log = null;
  // let path = Object.keys(route[req.method]);
  let getValue=await getRedisRoute();
  // console.log('getValue==========',getValue); 
  for (let index = 0; index < getValue.length; index++) {
    const element = getValue[index];
    if (req.originalUrl.match(element.endpoint) != null && req.method.toLowerCase().match(element.method)) {
      // curd_log = route[req.method][element];
      // console.log(req.originalUrl);
      curd_log=element;
      break;
    }
  }
  let userAgent = req.headers['user-agent'];
  let app_version = req.headers['app_version'] || 0;
  let device_details = req.headers['device_details'] || '';
  let agent = useragent.parse(userAgent);
  let ip =
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);
  // decoded x-auth for login-user accressing public-routes in website
  let authAvl = req.headers['x-auth'];
  let xauthUser = '';
  if (authAvl != null && authAvl!=undefined && authAvl!='' && authAvl!='null') {
    xauthUser = jwt_decode(authAvl);
  }

  let logdata = null;
  if (curd_log != null && curd_log != '') {
    logdata = {
      userAgent: userAgent,
      agent: agent,
      ua: useragent.is(userAgent),
      app_version: app_version,
      device_details: device_details,
      os: agent.os.toString(),
      os_version: agent.os.toVersion(),
      remote_addr: ip,
      url: req.url,
      method: req.method,
      curd_log: curd_log,
      json_log: {
        params: req.params,
        query: req.query,
        body: req.body,
      },
      xauthUser: xauthUser
    };
  }
  res.logdata = logdata;
  next();
}

exports.writelog = writelog;
