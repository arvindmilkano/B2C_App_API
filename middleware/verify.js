const jwtToken = require('../helpers/jwtToken');

function verify(req, res, next) {
  const token = req.header('x-auth');
  if (!token) {
    return res.status(401).json({
      status: 'FAIL',
      message: 'Access denied. No token provided.',
      data: {},
    });
  }
  jwtToken.verifyUser(token)
    .then(function (data) {
      req.user = data;
      res.user = data;
      next();
    })
    .catch(function () {
      return res.status(401).json({
        status: 'FAIL',
        message: 'Invalid token...',
        data: {},
      });
    });
}

module.exports = verify;
