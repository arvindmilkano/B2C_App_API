const config = require('../config');
const pool = require('./pgconnection');
const AWS = require('aws-sdk');
const fs = require('fs');
const http = require('https');
const moment = require('moment');
const mail = require('../helpers/mail');

const s3 = new AWS.S3({
  accessKeyId: config.aws.AWS_ACCESS_KEY,
  secretAccessKey: config.aws.AWS_SECRET_ACCESS_KEY
});


async function getEmailTemplate(id) {
  return new Promise(async function (resolve, reject) {
    try {
      let result = await pool.executeQuery(`select * from email_template_tbl where temp_id=${id} and is_active=true and  is_delete=false`, []);
      if (result.rows.length > 0) {
        resolve(result.rows[0]);
      } else {
        // For default template when main template delete or isActive true
        let defaultInfo = await getDefaultEmailTemplate(33);
        resolve(defaultInfo.rows[0]);
      }
    } catch (error) {
      reject(error)
    }
  });
}



async function getDefaultEmailTemplate(id) {
  return new Promise(async function (resolve, reject) {
    try {
      let result = await pool.executeQuery(`select * from email_template_tbl where temp_id=${id}`, []);
      resolve(result);
    } catch (error) {
      reject(error)
    }
  })
}

//DOWNLOAD IMAGE FROM S3 SERVER
async function downloadImage(ImageUrl) {
  return new Promise(function (resolve, reject) {
    const filename = ImageUrl.substring(ImageUrl.lastIndexOf('/') + 1)
    const file = fs.createWriteStream("./upload/" + filename);
    try {
      const request = http.get(ImageUrl, function (response) {
        response.pipe(file);
        // after download completed close filestream
        file.on("finish", () => {
          file.close();
          resolve(filename);
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}


async function uploadImage(image, fileName) {
  return new Promise(function (resolve, reject) {
    try {
      const params = {
        Bucket: 'picopay-project/slider',
        Key: fileName,
        Body: image,
        ContentType: 'image/jpeg'
      };
      s3.upload(params, function (err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function userBlocked(email) {
  return new Promise(async function (resolve, reject) {
    try {
      let result = await pool.executeQuery(`select user_blocked from public.user_tbl where email='${email}'`);
      if (result.rows.length > 0) {
        resolve(result.rows[0].user_blocked);
      } else {
        resolve(false);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/*Check Email Exists*/
async function checkExistEmail(email) {
  return new Promise(async function (resolve, reject) {
    try {
      let querys = `SELECT email from public.user_tbl where email='${email}'`
      let result = await pool.executeQuery(querys, []);
      if (result.rowCount > 0) {
        resolve(true);
      } else {
        resolve(false);
      }

    } catch (error) {
      reject(error);
    }

  });
}

/**
* @name getCountryName
* @description getCountryName function is used to get country name with iso code.
* @body {object} req as request parameter.
 * @body {object} res as response parameter.
 *  
 * @returns {object}
*/
async function getCountryName(isd_code) {
  return new Promise(async function (resolve, reject) {
    try {
      let result = await pool.executeQuery(`select country_name,iso_code from public.jumio_country_tbl where isd_code='${isd_code}'`, []);
      resolve(result.rows[0]);
    } catch (error) {
      reject(error)
    }
  })
}

async function sendEmailAdminUser(emailBody, subjects) {
  return new Promise(async function (resolve, reject) {
    try {
      let getAdminUser = `select email,firstname,lastname from public.admin_tbl where is_active = true and is_delete=false and get_email_notification_of_order=true`
      let result = await pool.executeQueryWithMsg(getAdminUser, [], "No records available.");
      let emailData = await getEmailTemplate(33);

      if (subjects == undefined) {
        subjects = 'Picopay request'
      }
      for (let i = 0; i < result.length; i++) {
        let subject = emailData['temp_subject']
          .replace('{SUBJECT}', subjects);
        let body = emailData['temp_body']
          .replace('{MAIL_BODY}', emailBody)
        mail.send(result[i].email, subject, body);

      }
      resolve(true)
    } catch (error) {
      reject(error)
    }
  })
}

const getErrorInfo = async (errorId) => {
  return new Promise(async function (resolve, reject) {
    try {
      let getQuery = `select event_name,event_description,event_accessed_for,error_code,error_message,error_status,id 
      FROM public.error_code_tbl where id=${errorId}`;
      let result = await pool.executeQueryWithMsg(getQuery, [], "No records available.");
      resolve(result[0]);
    } catch (error) {
      reject(error);
    }

  });
}

const checkCount = async (data) => {
  return new Promise(async function (resolve, reject) {
    try {
      if (data.rowCount > 0) {
        resolve(true)
      } else {
        resolve(false)
      }
    } catch (error) {
      reject(error);
    }

  });
}

module.exports = {
  getEmailTemplate,
  uploadImage,
  getCountryName,
  checkExistEmail,
  getDefaultEmailTemplate,
  userBlocked,
  downloadImage,
  sendEmailAdminUser,
  getErrorInfo,
  checkCount
};