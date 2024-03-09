const pool = require('../models/pgconnection');
const Validator = require('validatorjs');
const jwtToken = require('./jwtToken');
const md5 = require('md5');

async function validate(data, rules, msg = {}) {
  return new Promise(function (resolve, reject) {
    let validation = new Validator(data, rules, msg);
    validation.checkAsync(
      function () {
        resolve(true);
      },
      function () {
        let message = 'validation_error';
        let erorrLog = [];
        let status = 400;
        for (const [key, value] of Object.entries(validation.errors.errors)) {
          erorrLog.push({
            field: key,
            message: value[0],
          });
        }
        reject({ status: status, message: message, erorrLog: erorrLog });
      }
    );
  });
}


//added custome validation to check email is exist or not
Validator.registerAsync(
  'checkEmail',
  async function (value, attribute, req, passes) {
    let query = `select * from public.client_tbl where 
    lower(client_email_primary)=lower('${value}') and is_delete = false`;
    let result = await pool.executeQuery(query, []);
    if (result.rows.length == 0) {
      passes();
    } else {
      passes(false, 'Email has already been taken.'); // if email is not available
    }
  }
);

//prevent duplicate records  
Validator.registerAsync(
  'checkFaqCategory',
  async function (value, attribute, req, passes) {
    let clientId = attribute;
    let query = `select * from public.faq_category_tbl where 
    lower(category_name)=lower('${value}') AND  client_id='${clientId}'
    AND is_delete = false`;
    let result = await pool.executeQuery(query, []);
    if (result.rows.length == 0) {
      passes();
    } else {
      passes(false, 'This field already exist.'); // if fields is available
    }
  }
);

//added custome validation to check username is exist or not
Validator.registerAsync('conf_password',async function(value, attribute, req, passes) {
  if(attribute==value){
      passes()
  }else{
      passes(false, 'Password and confirm password does not match.');
  }
});

module.exports = {
  validate
};