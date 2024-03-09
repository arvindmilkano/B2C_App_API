const config = require('../config/env/development');
const jwt = require('jsonwebtoken');

// const privateKey = process.env.JWT_PRIVATEKEY;
const privateKey = config.jwtKey;
function generateLogin(body) {
  try{
    return  jwt.sign(body, privateKey, { expiresIn: '1d' });
  }catch(error){
    console.log("error", error);
  }
}
async function verifyUser(body) {
  return new Promise(function (resolve, reject) {
    jwt.verify(body, privateKey, function (err, decoded) {
      if (err) {
        reject('invalid token');
      } else {
        resolve(decoded);
      }
    });
  });
}
module.exports = {
  generateLogin,
  verifyUser,
  };