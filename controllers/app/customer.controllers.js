const { connection } = require('../../models/connection');


const getCustomer = (req, res) => {
  const id = req.params.id;
  const errors = {};

  if (!req.params.id) {
    errors.id = ['id is required'];
  }

  if (Object.keys(errors).length > 0) {
    res.send({
      "status": 'failed',
      "validation_error": errors,
    });
  } else {
    connection.query("SELECT *  FROM customers WHERE id=?", id, (error, result) => {
      if (error) throw error;

      if (result.length > 0) {
          res.status(200).send({
            status: 200,
            result: result,
          });
      } else {
        res.status(401).send({
          status: 401,
          message: "record not found",
        });
      }
    });
  }
};


const validateAddress = (req) => {
  const errors = {};

  if (!req.body.customer_id) {
    errors.customer_id = ['customer id is required'];
  }

  if (!req.body.full_address) {
    errors.full_address = ['full address is required'];
  }

  if (!req.body.landmark) {
    errors.landmark = ['landmark is required'];
  }

  if (!req.body.pincode) {
    errors.pincode = ['pincode is required'];
  }

  if (!req.body.label) {
    errors.label = ['address Type is required'];
  }
  if (!req.body.latitude) {
    errors.latitude = ['latitude is required'];
  }
  if (!req.body.longitude) {
    errors.longitude = ['longitude is required'];
  }


  return errors;
};

const saveAddress = (req, res) => {
  const errors = validateAddress(req);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      status: 'failed',
      validation_error: errors,
    });
  }

  const customerAddress = {
    customer_id: req.body.customer_id,
    label: req.body.label || 'Home',
    socity: req.body.society,
    area: req.body.area,
    district: req.body.district,
    state: req.body.state,
    pincode: req.body.pincode,
    latitude: req.body.lat,
    longitude: req.body.long,
    address: req.body.full_address,
    house_floor_no: req.body.house_floor_no,
    store_id: req.body.store_id || 0,
    status: 1,
    alternate_mobile_number: req.body.alternate_mobile_number,
    label:req.body.label,
    landmark:req.body.landmark,
    receiver_name:req.body.receiver_name
  };

  const id = req.body.customer_id;
  const pincode = req.body.pincode;
  const socity = req.body.society;
  const houseFloor = req.body.house_floor_no;

  connection.query('SELECT * FROM address WHERE customer_id = ? AND pincode = ? AND socity =? AND house_floor_no=?', [id, pincode, socity, houseFloor], (error, result) => {
    if (error) {
      console.log('Error occurred', error);
      return res.status(500).json({
        status: 'failed',
        success: false,
        message: 'Failed to save address',
      });
    }

    if (result.length > 0) {
      return res.status(409).json({
        status: 'failed',
        success: false,
        message: 'Address already exists',
      });
    }

    connection.query('INSERT INTO address SET ?', customerAddress, (error, results) => {
      if (error) {
        console.log('Error occurred', error);
        return res.status(500).json({
          status: 'failed',
          success: false,
          message: 'Failed to save address',
        });
      } else {
        return res.status(200).json({
          status: 'success',
          success: true,
          message: 'Customer address added successfully',
        });
      }
    });
  });
};



const getAddress = (req, res) => {
  const id = req.params.id;
  const errors = {};

  if (!req.params.id) {
    errors.id = ['id is required'];
  }

  console.log("address", req.query.address);
  

  if (Object.keys(errors).length > 0) {
    res.send({
      "status": 'failed',
      "validation_error": errors,
    });
  } else {

    let search = '';
    if (req.query.address==='default') {
        search = 'AND defaultAddress=1 order by id desc limit 1 ';
    }

    connection.query(`SELECT *  FROM address WHERE customer_id=? ${search}`, id, (error, result) => {
      if (error) throw error;

      if (result.length > 0) {
          res.status(200).send({
            status: 200,
            total:result.length,
            result: result,
          });
      } else {
        res.status(401).send({
          status: 401,
          total:0,
          message: "record not found",
        });
      }
    });
  }
};

const updateAddress = (req, res) => {
  const errors = {};

  if (!req.body.id) {
    errors.id = 'id is required';
  }

  if (!req.body.customer_id) {
    errors.customer_id = 'customer_id is required';
  }

  if (!req.body.house_floor_no) {
    errors.house_floor_no = 'house_floor_no is required';
  }

  if (!req.body.landmark) {
    errors.landmark = 'landmark is required';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      status: 'failed',
      validation_error: errors,
    });
  }

  const addressId = req.body.id;
  const customerId = req.body.customer_id;
  const house_floor_no = req.body.house_floor_no;
  const alternate_mobile_number = req.body.alternate_mobile_number;
  const landmark = req.body.landmark;
  const receiver_name = req.body.receiver_name;

  connection.query(
    'UPDATE address SET house_floor_no = ?, alternate_mobile_number = ?, landmark = ?, receiver_name = ? WHERE id = ? AND customer_id = ?',
    [house_floor_no, alternate_mobile_number, landmark, receiver_name, addressId, customerId],
    (error, result) => {
      if (error) {
        console.log('Error occurred', error);
        return res.status(500).json({
          status: 'failed',
          success: false,
          message: 'Failed to update address',
        });
      }

      return res.status(200).json({
        status: 'success',
        success: true,
        message: 'Address updated successfully',
      });
    }
  );
};





const updateDefaultAddress = (req, res) => {
  const addressId = req.body.id;
  const customerId = req.body.customer_id;

  console.log("addressId", addressId);
  console.log("customerId", customerId);

  // Use a single SQL statement to update both previous and new default addresses
  connection.query(
    'UPDATE address SET defaultAddress = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE customer_id = ?',
    [addressId, customerId],
    (error, result) => {
      if (error) {
        console.log('Error occurred', error);
        return res.status(500).json({
          status: 'failed',
          success: false,
          message: 'Failed to update default address',
        });
      }

      return res.status(200).json({
        status: 'success',
        success: true,
        message: 'Address updated successfully',
      });
    }
  );
};






module.exports = {
  getCustomer,
  saveAddress,
  updateAddress,
  getAddress,
  updateDefaultAddress,

};
