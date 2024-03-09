const { connection } = require('../../models/connection');
const mysql = require('mysql');
const jwtToken = require('../../helpers/jwtToken');
const jwt = require('jsonwebtoken');
const https = require("https");
const axios = require("axios");
var formidable = require('formidable');
var fs = require('fs');
const defaultStore = 1;




const login = function (req, res) {
  const errors = {};
  if (!req.body.mobile) {
    errors.mobile = ['mobile is required'];
  }
  if (!req.body.hash_key) {
    errors.hash_key = ['\\"hash_key" payload Error\\ hash_key is required'];
  }
  const mobile = req.body.mobile;
  const hashKey = req.body.hash_key;

  if (Object.keys(errors).length > 0) {
    res.send({
      "status": 'failed',
      "validation_error": errors,
    });
  } else {
    connection.query('select * from customers where mobile =? ', [mobile], (error, result) => {
      if (error) throw error;
      if (result.length > 0) {
        // Registered customer
        let customerId = result[0].id;
        // let hashKey = result[0].hash_key;

        // if (req.body.hash_Key != hashKey) {
        //    errors.device_id = ['This hash key is not registered with us, kindly login from your registered Device.'];
        // }

        if (Object.keys(errors).length > 0) {
          res.send({
            "status": 'failed',
            "validation_error": errors,
          });
        }

        else {
          let checkSendOtp;
          connection.query('select * from otps where customer_id =? and otp_verified = ?', [customerId, 0], (error, otpresult) => {
            if (error) throw error;
            if (otpresult.length > 0) {
              let otp = otpresult[0].otp;
              checkSendOtp = sendOtp(mobile, otp, req.body.hash_key);
              if (checkSendOtp) {
                res.send({
                  "status": 200,
                  "message": 'otp sent successfully',
                  "hash_key": req.body.hash_key,
                });
              }
            } else {
              // If otp not found then create new otp
              if (creatOtp(customerId, mobile, req.body.hash_key)) {
                console.log("--create new otp--");
                res.send({
                  "status": 200,
                  "success": true,
                  "message": "otp sent successfully for existing customer",
                  "hash_key": req.body.hash_key,
                });
              }
            }
          });
        }
      } else {
        // for new customer
        var customerRecords = {
          "mobile": mobile,
          "hash_Key": req.body.hash_key
        }
        connection.query('INSERT INTO customers SET ?', customerRecords, function (error, results, fields) {
          if (error) {
            console.log("error ocurred", error);
            res.send({
              "status": 'failed',
              "success": false,
              "message": 'failed to register'
            });
          } else {
            if (creatOtp(results.insertId, mobile)) {
              res.send({
                "status": 200,
                "success": true,
                "message": "Customer registered sucessfully",
                "hash_key": req.body.hash_key,
              });
            }
          }
        });
      }
    });
  }
}

const logout = function (req, res) {
  try {
    var token = req.headers['x-auth'] || '';
    var mobile = req.body.mobile;

    const errors = {};

    if (!mobile) {
      errors.mobile = ['Mobile number is required'];
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        status: 'failed',
        validation_error: errors
      });
    }

    connection.query("UPDATE customers SET isLogedIn = false WHERE accessToken = ? AND mobile = ?", [token, mobile], (error, result, fields) => {
      if (error) {
        console.log("---logout---", error);
        return res.status(500).json({
          status: 500,
          message: "Logout error"
        });
      }

      if (result.affectedRows === 0) {
        return res.status(401).json({
          status: 401,
          message: "User not found or already logged out"
        });
      }

      res.status(200).json({
        status: 200,
        message: "User logged out successfully"
      });
    });
  } catch (error) {
    console.log("---logout---", error);
    res.status(500).json({
      status: 500,
      message: "Logout error"
    });
  }
};



const sendOtp = (mobile, otp, hashKey) => {
  return new Promise((resolve, reject) => {
    let api_key = '56022A7F21E8A6';
    let from = 'MLKANO';
    /*
    let sms_text = `Your Milkano Wholesale Verification OTP code is - ${otp} . Do not share this OTP with anyone! Thank you for Choosing Milkano Wholesale!`;
    */
    let sms_text = `Your Milkano Verification OTP code is - ${otp} . Do not share this OTP with anyone! Thank you for Choosing Milkano ! ${hashKey}`;
    let pe_id = '1001492040000032389';
    let template_id = '1007169600024967911';

    let api_url = "http://hindit.org/app/smsapi/index.php?key=" + api_key + "&campaign=7095&routeid=100449&type=text&contacts=" + mobile + "&senderid=" + from + "&msg=" + sms_text + "&template_id=" + template_id + "&pe_id=" + pe_id;
    console.log("api_url", api_url);

    axios.get(api_url)
      .then(response => {
        console.log("otp response", response.data);
        if (response.data) {
          resolve({ status: true, message: "OTP sent successfully" });
        } else {
          resolve({ status: false, message: "Failed to send OTP" });
        }
      })
      .catch(error => {
        console.error("Error sending OTP:", error);
        reject(error);
      });
  });
};



const generateOtpNumber = (data) => {
  let otp = Math.floor(Math.random() * 899999 + 100000)
  return otp;
};


const creatOtp = (customerId, mobile, hashKey) => {
   // let otp = Math.floor(Math.random() * 899999 + 100000)
   let otp = 123456;
  var otpRecords = {
    "customer_id": customerId,
    "mobile": mobile,
    "otp": otp
  }
  let otpQuery = connection.query('INSERT INTO otps SET ?', otpRecords, function (error, results, fields) {
    if (error) {
      return false;

    }
    else {

      connection.query('select * from otps where id =? and otp_verified = ?', [results.insertId, 0], (error, otpresult) => {
        if (error) throw error;
        if (otpresult.length > 0) {

          let otpFromDb = otpresult[0].otp;
          checkSendOtp = sendOtp(mobile, otpFromDb, hashKey);
          return true;
        }
      });
    }
  });
  return otpQuery;
}


const verifyOtp = (req, res) => {
  var mobile = req.body.mobile;
  var otp = req.body.otp;

  connection.query('SELECT * FROM otps WHERE mobile = ? AND otp_verified = ? AND otp = ?', [mobile, 0, otp], (error, result) => {
    if (error) throw error;

    console.log("result.length", result.length);

    if (result.length > 0) {
      connection.query("UPDATE otps SET otp_verified = '1' WHERE mobile = ? AND otp_verified = ?", [mobile, 0], (error, updateResult) => {
        if (error) throw error;

        connection.query("SELECT * FROM customers WHERE mobile = ?", [mobile], (error, selectResult) => {
          if (error) throw error;

          // Generate Token
          let data = { data: 'customer' };
          let token = jwtToken.generateLogin(data);



          connection.query("UPDATE customers SET isLogedIn = true, accessToken = '" + token + "'  WHERE mobile = ?", [mobile], (error, updateTokenResult) => {
            if (error) throw error;

            res.send({
              "status": 200,
              "message": "OTP verified successfully",
              "token": token,
              "mobile": mobile,
              "customer_id": selectResult[0].id,
              "defaultStore": 1,
            });
          });
        });
      });
    } else {
      res.send({
        "status": false,
        "message": "OTP does not match"
      });
    }
  });
};



const resendotp = function (req, res) {
  console.log("-resendotp-");
  var mobile = req.body.mobile;
  var hashKey = req.body.hash_key;
  const errors = {};
  if (!req.body.mobile) {
    errors.mobile = ['mobile is required'];
  }
  if (Object.keys(errors).length > 0) {
    res.send({
      "status": 'failed',
      "validation_error": errors,
    })
  } else {
    connection.query('select * from customers where mobile =?', mobile, (error, result) => {
      if (error) throw error;
      if (result.length > 0) {

        // Registered customer
        let customerId = result[0].id;
        let checkSendOtp;
        connection.query('select * from otps where customer_id =? and otp_verified = ?', [customerId, 0], (error, otpresult) => {
          if (error) throw error;
          if (otpresult.length > 0) {
            let otp = otpresult[0].otp;
            checkSendOtp = sendOtp(mobile, otp, hashKey);
            if (checkSendOtp) {
              res.send({
                "status": 200,
                "message": 'otp sent successfully'
              });
            }
          }
          else {

            if (creatOtp(customerId, mobile)) {
              console.log("--create new otp--");
              res.send({
                "status": 200,
                "success": true,
                "message": "otp sent successfully for existing customer",
              });
            }

          }
        });

      } else {

        res.send({
          "status": 'failed',
          "message": 'customer not found',
        })
      }
    });
  }
}





const updateProfile = function (req, res) {

  const errors = {};
  if (!req.body.id) {
    errors.id = ['id is required'];
  }
  if (!req.body.name) {
    errors.name = ['name is required'];
  }
  if (Object.keys(errors).length > 0) {
    res.send({
      "status": 'failed',
      "validation_error": errors,
    })
  } else {

    let id = req.body.id;
    let email = req.body.email;
    const fieldsToUpdate = {
      fullname: req.body.name,
      email: req.body.email,
    };

    // Check Email Id
    connection.query('select * from customers where email =? AND id!=?', [email, id], (error, result) => {
      if (error) throw error;
      if (result.length > 0) {
        res.send({
          "status": 'failed',
          "success": false,
          "message": 'Email already exist'
        })
      } else {

        connection.query('select id from customers where id =?', id, (error, result) => {
          if (error) throw error;
          if (result.length > 0) {

            const updateQuery = generateUpdateQuery('customers', id, fieldsToUpdate);
            connection.query(updateQuery, (error, result, fields) => {
              if (error) {
                console.log("error ocurred", error);
                res.send({
                  "status": 'failed',
                  "success": false,
                  "message": 'failed to register'
                })
              }
              else {
                if (result) {
                  res.send({
                    "status": 200,
                    "success": true,
                    "message": "Customer record update sucessfully",
                  });
                }

              }
            });

          } else {

            res.send({
              "status": 'failed',
              "success": false,
              "message": 'record not found'
            })
          }
        });
      }
    });
  }
}


function generateUpdateQuery(table, id, fieldsToUpdate) {
  let query = `UPDATE ${table} SET`;
  Object.entries(fieldsToUpdate).forEach(([field, value]) => {
    if (value !== undefined) {
      query += ` ${field} = ${mysql.escape(value)},`;
    }
  });
  query = query.slice(0, -1);
  query += ` WHERE id = ${mysql.escape(id)}`;
  return query;
}


const validateAddress = (req) => {
  const { customer_id, society, area, district, state, pincode, lat, long } = req.body;
  const errors = {};
  if (!customer_id) {
    errors.customer_id = 'Customer ID is required';
  }

  if (!society) {
    errors.society = 'Society is required';
  }

  if (!area) {
    errors.area = 'Area is required';
  }

  if (!pincode) {
    errors.pincode = 'Pincode is required';
  }

  if (!district) {
    errors.district = 'District is required';
  }

  if (!state) {
    errors.state = 'State is required';
  }

  if (!lat) {
    errors.lat = 'Latitude is required';
  }

  if (!long) {
    errors.long = 'Longitude is required';
  }

  return errors;
};


// Search and save location
const findLocationOLD = (req, res) => {
  const { district, pincode, society } = req.body;
  const errors = validateAddress(req);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      status: 400,
      validation_errors: errors,
    });
  }

  const searchQuery = 'SELECT * FROM socity WHERE district = ? AND pincode = ? AND name LIKE ?';
  const searchParams = [district, pincode, `%${society}`];

  connection.query(searchQuery, searchParams, (error, result) => {
    if (error) {
      console.error('Error occurred:', error);
      return res.status(500).json({
        status: 500,
        message: 'Failed to fetch location',
      });
    }

    if (result.length > 0) {
      saveAddress(req, result[0].store_id);
      return res.status(200).json({
        status: 200,
        "message": "store found",
        data: result,
      });
    } else {
      saveAddress(req, 0);
      return res.status(404).json({
        status: 404,
        message: "Sorry, we can't find any stores for the location",
      });
    }
  });
};

const findLocation2 = (req, res) => {
  const supplyRadius = 4;
  const { pincode, lat, long } = req.body;
  console.log("---get response---", pincode);
  const errors = validateAddress(req);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      status: 400,
      validation_errors: errors,
    });
  }

  const searchQuery = 'SELECT id as store_id, storecode,address,pincode,district,latitude,longitude,contact_number,email FROM store WHERE pincode = ? AND status = ?';
  const searchParams = [pincode, 1];
  connection.query(searchQuery, searchParams, (error, result) => {
    if (error) {
      console.error('Error occurred:', error);
      return res.status(500).json({
        status: 500,
        message: 'Failed to fetch location',
      });
    }

    if (result.length > 0) {
      const storeLat = result[0].latitude;
      const storeLong = result[0].longitude;
      const distance = calculateDistance(storeLat, storeLong, lat, long);
      console.log("---search location Distance---", distance);
      saveAddress(req, result[0].store_id);

      if (distance.toFixed(2) <= supplyRadius) {
        return res.status(200).json({
          status: 200,
          message: "Store found within the radius",
          data: result,
          delivery_distance: distance.toFixed(2)
        });
      } else {
        return res.status(404).json({
          status: 404,
          message: "Our service is not available for this location",
          delivery_distance: distance.toFixed(2)
        });
      }
    } else {
      saveAddress(req, 0);
      return res.status(404).json({
        status: 404,
        message: "Sorry, we can't find any stores for the location",
      });
    }
  });
};

const findLocation = (req, res) => {
  // Radius in kilometer
  const supplyRadius = 4;
  const { pincode, lat, long } = req.body;
  const errors = validateAddress(req);
  if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        status: 400,
        validation_errors: errors,
      });
  }

  const searchQuery = `SELECT id as store_id, storecode,address,pincode,district,latitude,longitude,contact_number,email,(
    6371 * acos(
        cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${long})) +
        sin(radians(${lat})) * sin(radians(latitude))
    )
) AS distance FROM store HAVING distance <= ${supplyRadius} ORDER BY distance`;
  // const searchParams = [pincode, 1];
  const searchParams = [];
  connection.query(searchQuery, searchParams, (error, result) => {
    if (error) {
      console.error('Error occurred:', error);
      return res.status(500).json({
        status: 500,
        message: 'Failed to fetch location',
      });
    }

    if (result.length > 0) {
        const storeLat = result[0].latitude;
        const storeLong = result[0].longitude;
        const distance = calculateDistance(storeLat, storeLong, lat, long);
        saveAddress(req, result[0].store_id);
        return res.status(200).json({
          status: 200,
          message: "Store found within the radius",
          data: result,
          delivery_distance: distance.toFixed(2)
        });
        
    } else {
      saveAddress(req, 0);
      return res.status(404).json({
        status: 404,
        message: "Sorry, we can't find any stores for the location",
      });
    }
  });
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Radius of the Earth in kilometers
  const R = 6371;

  // Convert latitude and longitude from degrees to radians
  const lat1Rad = toRadians(lat1);
  const lon1Rad = toRadians(lon1);
  const lat2Rad = toRadians(lat2);
  const lon2Rad = toRadians(lon2);

  // Differences in coordinates
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;

  // Haversine formula
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Calculate the distance
  const distance = R * c;

  return distance;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}




const saveAddressOLD = (req, storeId) => {

  const completeAddress = req.body.society + ',' + req.body.area + ',' + req.body.pincode + '-' + req.body.district;
  const customerId = req.body.customer_id;
  const society = req.body.society;
  const area = req.body.area;
  const pincode = req.body.pincode;

  
    connection.query('SELECT * FROM address WHERE customer_id = ? AND socity=? AND area=?  AND pincode=?', [customerId, society, area, pincode], (error, result) => {
      if (error) {
        console.error('Error occurred:', error);
        return;
      }
      if (result.length > 0) {
        console.log("Customer location already exists");
        return;
      }else{

        connection.query('SELECT * FROM address WHERE customer_id = ?', [customerId], (error, result) => {
          if (error) {
            console.error('Error occurred:', error);
            return;
          }
          if (result.length == 0) {

            const customerAddress = {
              customer_id: req.body.customer_id,
              socity: req.body.society,
              area: req.body.area,
              district: req.body.district,
              state: req.body.state,
              pincode: req.body.pincode,
              latitude: req.body.lat,
              longitude: req.body.long,
              label: req.body.label || 'Home',
              store_id: storeId || 0,
              status: 1,
              address: completeAddress,
              defaultAddress:1,
            };
          
            connection.query('INSERT INTO address SET ?', customerAddress, (error, results) => {
              if (error) {
                console.error('Error occurred:', error);
                return;
              } else {
                console.log("Customer location saved successfully");
                return; 
              }
            });

          }else{

            const customerAddress = {
              customer_id: req.body.customer_id,
              socity: req.body.society,
              area: req.body.area,
              district: req.body.district,
              state: req.body.state,
              pincode: req.body.pincode,
              latitude: req.body.lat,
              longitude: req.body.long,
              label: req.body.label || 'Home',
              store_id: storeId || 0,
              status: 1,
              address: completeAddress,
              defaultAddress:0,
            };
          

            connection.query('INSERT INTO address SET ?', customerAddress, (error, results) => {
              if (error) {
                console.error('Error occurred:', error);
                return;
              } else {
                console.log("Customer location saved successfully");
                return; 
              }
            });
          }

      

      });

      }
    });
  
};

const saveAddress = (req, storeId) => {
  // const completeAddress = `${req.body.society},${req.body.area},${req.body.pincode}-${req.body.district}`;
  const completeAddress = `${req.body.society},${req.body.district}`;
  const customerId = req.body.customer_id;
  const society = req.body.society;
  const area = req.body.area;
  const pincode = req.body.pincode;

  // Check if the customer location already exists
  connection.query(
    'SELECT * FROM address WHERE customer_id = ? AND socity=? AND area=? AND pincode=?',
    [customerId, society, area, pincode],
    (error, result) => {
      if (error) {
        console.error('Error checking existing location:', error);
        return;
      }

      if (result.length > 0) {
        console.log("Customer location already exists");
        return;
      }

      // Check if the customer has any addresses
      connection.query(
        'SELECT * FROM address WHERE customer_id = ?',
        [customerId],
        (error, result) => {
          if (error) {
            console.error('Error checking customer addresses:', error);
            return;
          }

          // Determine if the customer has an existing address
          const hasExistingAddress = result.length > 0;

          const customerAddress = {
            customer_id: customerId,
            socity: society,
            area: area,
            district: req.body.district,
            state: req.body.state,
            pincode: pincode,
            latitude: req.body.lat,
            longitude: req.body.long,
            label: req.body.label || 'Home',
            store_id: storeId || 0,
            status: 1,
            address: completeAddress,
            defaultAddress: hasExistingAddress ? 0 : 1,
          };

          // Insert the new customer address
          connection.query('INSERT INTO address SET ?', customerAddress, (error, results) => {
            if (error) {
              console.error('Error inserting customer address:', error);
              // Return an error response or handle it appropriately
              return;
            }

            console.log("Customer location saved successfully");
            // Return a success response or handle it appropriately
          });
        }
      );
    }
  );
};






module.exports = {
  login,
  generateOtpNumber,
  sendOtp,
  creatOtp,
  verifyOtp,
  resendotp,
  logout,
  updateProfile,
  findLocation,
  saveAddress,
};
