const { connection } = require('../../models/connection');
const b2bDB = process.env.B2BDATABASE;
const b2cDB = process.env.B2CDATABASE;
 const https = require('https');
const PaytmChecksum = require('paytmchecksum');
//const template = require("./templateControllers");


const addToCart = async (req, res) => {
  try {
    const orders = req.body.order_details;
    const customerId = req.body.customer_id;
    const storeId = req.body.store_id;
    
    const errors = {};
    let cartMessage = '';

    if (!customerId) {
      errors.customer_id = ['customer_id is required'];
    }
    if (!storeId) {
      errors.store_id = ['store_id is required'];
    }
    if (!orders) {
      errors.order_details = ['order_details is required'];
    } else {
      for (let i = 0; i < orders.length; i++) {
        const productId = orders[i].product_id;
        const quantity = orders[i].product_quantity;
        
        
        if (quantity <= 0) {
          if (!errors.order_details) {
            errors.order_details = [];
          }
          errors.order_details.push(`Invalid quantity for product with ID ${productId}`);
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(401).json({
        status: 401,
        validation_error: errors,
      });
    } else {
      for (let i = 0; i < orders.length; i++) {
        const productId = orders[i].product_id;
        const quantity = orders[i].product_quantity;
        const categoryId = orders[i].category_id;
        const subcategoryId = orders[i].subcategory_id;
        const mrp = orders[i].price;
        const offerPrice = orders[i].offer_price;

        const selectQuery = `SELECT * FROM cart WHERE customer_id = ${customerId} AND product_id = ${productId} AND active=1`;
        const result = await new Promise((resolve, reject) => {
          connection.query(selectQuery, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        });

        if (result.length === 0) {
          const insertQuery = `INSERT INTO cart(customer_id, store_id, product_id, category_id, qty, active, subcategory_id, mrp, offer_price) 
          VALUES (${customerId}, ${storeId}, ${productId},${categoryId}, ${quantity}, 1, ${subcategoryId}, ${mrp}, ${offerPrice})`;
          await new Promise((resolve, reject) => {
            connection.query(insertQuery, (error, result) => {
              if (error) {
                reject(error);
              } else {
                cartMessage = 'Item added successfully';
                console.log("--Added--");
                resolve();
              }
            });
          });
        } else {
          const existingQuantity = result[0].qty;
          // const existingPackId = result[0].pack_id;

          if (existingQuantity !== quantity) {
            const updateQuery = `UPDATE cart SET qty = ${quantity} WHERE customer_id = ${customerId} AND product_id = ${productId}`;
            await new Promise((resolve, reject) => {
              connection.query(updateQuery, (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  cartMessage = 'Item updated successfully';
                  console.log("update");
                  resolve();
                }
              });
            });
          } else {
            cartMessage = "Item already in cart";
          }
        }
      }

      res.status(200).json({ status: 200, message: cartMessage });
    }
  } catch (err) {
    res.status(401).json({ status: 401, message: err });
  }
};



const getCartByCustomerId = async (req, res, next) => {
  try {
    const errors = {};
    const customer_id = req.params.id;

    if (!customer_id) {
      errors.customer_id = ['customer_id is required'];
    }

    if (Object.keys(errors).length > 0) {
      res.status(401).json({
        status: 401,
        validation_error: errors,
      })
    } else {
      const query = `SELECT t1.id as cartId, t1.customer_id,t2.id as product_id,mp.name as product_name, cat.id as category_id, cat.name as category_name,subcat.id as subcategory_id,subcat.name as sub_category, t2.unit,t2.unit_qty, REPLACE(t2.product_image, '\"',"'") AS product_image, t2.gst, t2.igst, t1.qty, t1.mrp,
      t1.mrp as price, t1.offer_price, t1.net_amount FROM ${b2cDB}.cart t1 
        left JOIN ${b2bDB}.products t2 ON t2.id=t1.product_id
        LEFT JOIN ${b2bDB}.categories cat ON cat.id = t1.category_id
        LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = t1.subcategory_id
        left JOIN ${b2bDB}.master_product mp ON mp.id = t2.master_product_id 
        left JOIN ${b2cDB}.store_product_price t4 ON t4.product_id = t1.product_id AND t4.store_id=t1.store_id  WHERE t1.customer_id = ${customer_id} AND t1.active=1`;



      const countQuery = `SELECT COUNT(*) as total_count FROM cart WHERE customer_id = ${customer_id} AND active=1`;
      const [results, countResult] = await Promise.all([
        new Promise((resolve, reject) => {
          connection.query(query, (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        }),

        new Promise((resolve, reject) => {
          connection.query(countQuery, (error, countResult) => {
            if (error) {
              reject(error);
            } else {
              resolve(countResult);
            }
          });
        })
      ]);

      const total_count = countResult[0].total_count;
      const data = [];

      for (const row of results) {
        const { cartId, customer_id, product_id, product_name, category_id, category_name, subcategory_id, sub_category, unit, unit_qty, product_image, qty, price,
          offer_price, net_amount, gst, igst } = row;

        var data2 = {
          cartId, customer_id, product_id, product_name, category_id, category_name, subcategory_id, sub_category, unit, unit_qty, product_image, qty, price,
          offer_price,net_amount, gst, igst
        };
        data2.product_image = product_image.replace(/[\[\]']/g, '').split(',');
        data.push(data2);
      }

      res.json({
        status: 200,
        total_count: total_count,
        data: data,
      });
    }
  } catch (err) {
    res.status(401).json({
      status: 401,
      message: err.message,
    });
  }
};


const deleteCartItem = async (req, res) => {
  try {
    const cartId = req.params.id;
    const checkQuery = `SELECT id FROM cart WHERE id = ${cartId}`;
    connection.query(checkQuery, (checkError, checkResults) => {
      if (checkError) {
        res.status(500).json({
          status: 500,
          message: 'Internal server error',
        });
      } else if (checkResults.length === 0) {
        res.status(404).json({
          status: 404,
          message: 'Item not found',
        });
      } else {
        const deleteQuery = `DELETE FROM cart WHERE id = ${cartId}`;
        connection.query(deleteQuery, (deleteError, deleteResults) => {
          if (deleteError) {
            res.status(500).json({
              status: 500,
              message: 'Internal server error',
            });
          } else {
            res.json({
              status: 200,
              message: "Item deleted successfully",
            });
          }
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: 'Internal server error',
    });
  }
};


const getCheckoutItem = async (req, res) => {
  try {
    const customerId = req.body.customer_id;
    const cartDetails = req.body.cart_details;
    const totalPrice = req.body.total_price;
    const deliverySlot = req.body.delivery_slot_id;
    const paymentMode = req.body.payment_mode;
    const storeId = req.body.store_id;
    const deliveryCharge = req.body.delivery_charge;
    
    const couponId = req.body.coupon_id ? req.body.coupon_id : null;
    const couponCode = req.body.coupon_code ? req.body.coupon_code: '';
    const discountAmount = req.body.discount_amount ? req.body.discount_amount : null;
    
    
    const errors = {};

    if (!customerId) {
      errors.customer_id = ['customer_id is required'];
    }
    if (!cartDetails || cartDetails.length === 0) {
      errors.cart_details = ['cart_details is required'];
    }
    if (!totalPrice) {
      errors.total_price = ['total_price is required'];
    }
    if (totalPrice <= 0) {
      errors.total_price = ['total_price should be greater than 0'];
    }

    if (!deliveryCharge) {
      errors.delivery_charge = ['delivery_charge is required'];
    }

    if (!paymentMode) {
      errors.payment_mode = ['payment_mode is required'];
    }

    if (!storeId) {
      errors.store_id = ['store_id is required'];
    }

    if (Object.keys(errors).length > 0) {
      return res.status(201).json({
        status: 201,
        validation_error: errors,
      });
    }
    
    // Validate Coupon code
    if (couponId) {
      const isValidCoupon = await validateCoupon(couponCode, couponId, discountAmount);
      console.log("isValidCoupon", isValidCoupon);
      if (isValidCoupon) {
        return res.status(201).json({
          status: 201,
          validation_error: 'Invalid coupon',
        });

      }
    } 
    
    const cartIds = cartDetails.map((item) => item.cart_id);
    const query = `SELECT * FROM cart WHERE customer_id = ${customerId} AND id IN (${cartIds}) AND active = 1`;

    console.log("-query-", query);
    connection.query(query, (error, results) => {
      if (error) {
        console.log("error",error);
        return res.status(500).json({
          status: 500,
          message: 'Internal server error-1',
        });
      }
      if (results.length > 0) {
        const updateQuery = `UPDATE cart SET active = '0' WHERE customer_id = ${customerId} AND id IN (${cartIds})`;
        connection.query(updateQuery, (error, updateResults) => {
          if (error) {
            return res.status(500).json({
              status: 500,
              message: 'Internal server error22',
            });
          }
          const orderDetails = cartIds.join(', ');

          connection.query('SELECT COUNT(*) as orderCount FROM orders', (error, countResult) => {
            if (error) {
              return res.status(500).json({
                status: 500,
                message: 'Internal server error33',
              });
            }
            const orderCount = countResult[0].orderCount;
            const orderNumber = `MLKB2C000${orderCount + 1}`;

            const insertQuery = `INSERT INTO orders (customer_id, store_id, order_details, total_price,delivery_charge, order_number, coupon_id, coupon_code, discount_amount) 
              VALUES (${customerId}, ${storeId}, '${orderDetails}', ${totalPrice}, ${deliveryCharge}, '${orderNumber}', ${couponId}, '${couponCode}', ${discountAmount})`;
            connection.query(insertQuery, async (error, result) => {
              if (error) {
                console.log("error", error);
                return res.status(500).json({
                  status: 500,
                  message: 'Internal server error123',
                });
              }
              const getOrderQuery = `SELECT *, CASE order_status WHEN 1 THEN "Pending" WHEN 2 THEN "Processing" WHEN 3 THEN "Shipped" WHEN 4 THEN "Delivered" ELSE "Cancelled" END AS order_status FROM orders WHERE customer_id = ${customerId} AND order_number = '${orderNumber}'`;
              connection.query(getOrderQuery, async (error, orderResult) => {
                if (error) {
                  return res.status(500).json({
                    status: 500,
                    message: 'Internal server error999',
                  });
                }
                const order = orderResult[0];
                const orderNumber = orderResult[0].order_number;
                const orderId = orderResult[0].order_id;

                
                let body;
                if (paymentMode == 'PAYTM') {
                const paytmObj = await paymentByPaytm(orderNumber, customerId, totalPrice);
                await makeTransection(req, res, orderId, orderNumber, JSON.stringify(paytmObj), paymentMode);
                
                // await template.orderConfirmation(orderNumber, customerId, totalPrice, orderDetails);

                  body = {
                    status: 200,
                    data: order,
                    payment_mode: paymentMode,
                    response_from_paytm: JSON.parse(paytmObj),
                    message: 'Order placed successfully',
                  };
                } else {

                  await makeTransection(req, res, orderId, orderNumber, '', paymentMode);
                  // await template.orderConfirmation(orderNumber, customerId, totalPrice, orderDetails);
                  body = {
                    status: 200,
                    data: order,
                    payment_mode: paymentMode,
                    message: 'Order placed successfully',
                  };
                }
                
                return res.json(body);
              });
            });
          });
        });
      } else {
        return res.json({
          status: 201,
          message: 'Record not found',
        });
      }
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      status: 500,
      message: 'Internal server error-2',
    });
  }
};


const getCheckoutItemNew = async (req, res) => {
  try {
    const customerId = req.body.customer_id;
    const cartDetails = req.body.cart_details;
    const totalPrice = req.body.total_price;
    const deliverySlot = req.body.delivery_slot_id;
    const paymentMode = req.body.payment_mode;
    const storeId = req.body.store_id;
    const deliveryCharge = req.body.delivery_charge;
    const  couponId = req.body.coupon_id;
    const  couponCode = req.body.coupon_code;
    const  discountAmount = req.body.discount_amount;
    
    // Validate Coupon code

    
    if (couponCode) {
      const isValidCoupon = await validateCoupon(couponCode, couponId, discountAmount);
          if (isValidCoupon) {
          return res.status(201).json({
            status: 201,
            error: 'Invalid coupon',
          });
      
      }
      // const couponQuery = 'SELECT * FROM coupons WHERE coupon_code = ? AND id = ? AND discount_amount = ?';
      // connection.query(couponQuery, [couponCode, couponId, discountAmount], (error, couponResults) => {

      //   if (couponResults.length === 0) {
      //     return res.status(201).json({
      //       status: 201,
      //       error: 'Invalid coupon',
      //     });
      //   }

      // });

    } 
    const cartIds = cartDetails.map((item) => item.cart_id);
    const query = `SELECT * FROM cart WHERE customer_id = ${customerId} AND id IN (${cartIds}) AND active = 1`;

    console.log("-query-", query);
    connection.query(query, (error, results) => {
      if (error) {
        return res.status(500).json({
          status: 500,
          message: 'Internal server error',
        });
      }
      if (results.length > 0) {
        const updateQuery = `UPDATE cart SET active = '0' WHERE customer_id = ${customerId} AND id IN (${cartIds})`;
        connection.query(updateQuery, (error, updateResults) => {
          if (error) {
            return res.status(500).json({
              status: 500,
              message: 'Internal server error',
            });
          }
          const orderDetails = cartIds.join(', ');

          connection.query('SELECT COUNT(*) as orderCount FROM orders', (error, countResult) => {
            if (error) {
              return res.status(500).json({
                status: 500,
                message: 'Internal server error',
              });
            }
            const orderCount = countResult[0].orderCount;
            const orderNumber = `MLKB2C000${orderCount + 1}`;

            const insertQuery = `INSERT INTO orders (customer_id, store_id, order_details, total_price,delivery_charge, order_number, coupon_id, coupon_code, discount_amount) 
              VALUES (${customerId}, ${storeId}, '${orderDetails}', ${totalPrice}, ${deliveryCharge}, '${orderNumber}', '${couponId}', '${couponCode}', '${discountAmount}')`;
            connection.query(insertQuery, async (error, result) => {
              if (error) {
                return res.status(500).json({
                  status: 500,
                  message: 'Internal server error',
                });
              }
              const getOrderQuery = `SELECT *, CASE order_status WHEN 1 THEN "Pending" WHEN 2 THEN "Processing" WHEN 3 THEN "Shipped" WHEN 4 THEN "Delivered" ELSE "Cancelled" END AS order_status FROM orders WHERE customer_id = ${customerId} AND order_number = '${orderNumber}'`;
              connection.query(getOrderQuery, async (error, orderResult) => {
                if (error) {
                  return res.status(500).json({
                    status: 500,
                    message: 'Internal server error',
                  });
                }
                const order = orderResult[0];
                const orderNumber = orderResult[0].order_number;
                const orderId = orderResult[0].order_id;

                
                let body;
                if (paymentMode == 'PAYTM') {
                const paytmObj = await paymentByPaytm(orderNumber, customerId, totalPrice);
                await makeTransection(req, res, orderId, orderNumber, JSON.stringify(paytmObj), paymentMode);
                
                // await template.orderConfirmation(orderNumber, customerId, totalPrice, orderDetails);

                  body = {
                    status: 200,
                    data: order,
                    payment_mode: paymentMode,
                    response_from_paytm: JSON.parse(paytmObj),
                    message: 'Order placed successfully',
                  };
                } else {

                  await makeTransection(req, res, orderId, orderNumber, '', paymentMode);
                  // await template.orderConfirmation(orderNumber, customerId, totalPrice, orderDetails);
                  body = {
                    status: 200,
                    data: order,
                    payment_mode: paymentMode,
                    message: 'Order placed successfully',
                  };
                }
                
                return res.json(body);
              });
            });
          });
        });
      } else {
        return res.json({
          status: 201,
          message: 'Record not found',
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Internal server error',
    });
  }
};

const validateCoupon = async (couponCode, couponId, discountAmount) => {
  return new Promise((resolve, reject) => {
    const couponQuery = 'SELECT * FROM coupons WHERE coupon_code = ? AND id = ? AND discount_amount = ?';
    
    connection.query(couponQuery, [couponCode, couponId, discountAmount], (error, couponResults) => {
      if (error) {
        reject(error);
      } else {
        resolve(couponResults.length === 0);
      }
    });
  });
};



const getRepayment = async (req, res) => {
  try {
    const storeId = req.body.store_id;
    const customerId = req.body.customer_id;
    const orderNumber = req.body.orderNumber || '';
    const paymentMode = 'PAYTM';
    const errors = {};

    if (!customerId) {
      errors.customer_id = ['customer_id is required'];
    }

    if (!orderNumber) {
      errors.orderNumber = ['order number is required'];
    }
    
    if (Object.keys(errors).length > 0) {
      return res.status(201).json({
        status: 201,
        validation_error: errors,
      });
    }

    const getOrderQuery = `SELECT *, CASE order_status WHEN 1 THEN 'Pending' WHEN 2 THEN 'Processing' WHEN 3 THEN 'Shipped' WHEN 4 THEN 'Delivered' ELSE 'Cancelled' END AS order_status FROM orders WHERE customer_id = ? AND order_number = ?`;
    connection.query(getOrderQuery, [customerId, orderNumber], async (error, orderResult) => {
      if (error) {
        return res.status(500).json({
          status: 500,
          message: 'Internal server error1',
        });
      }

      if (orderResult.length > 0) {
        const orderDetails = orderResult[0].order_details;
        const totalPrice = orderResult[0].total_price;
        const deliveryCharge = orderResult[0].delivery_charge;

        connection.query('SELECT COUNT(*) as orderCount FROM orders', (error, countResult) => {
          if (error) {
            return res.status(500).json({
              status: 500,
              message: 'Internal server error2',
            });
          }

          const orderCount = countResult[0].orderCount;
          const newOrderNumber = `MLKB2C000${orderCount + 1}`;

          const updateFailedOrder = `UPDATE orders SET transection_status = 2 WHERE order_number = ?`;
          connection.query(updateFailedOrder, [req.body.orderNumber], (error, result) => {
            if (error) {
              return res.status(500).json({
                status: 500,
                message: 'Internal server error3',
              });
            }
            console.log("newOrderNumber", newOrderNumber);
            const insertQuery = `INSERT INTO orders (customer_id, store_id, order_details, total_price,delivery_charge, order_number) VALUES (?, ?, ?, ?, ?)`;
            connection.query(insertQuery, [customerId,storeId, orderDetails, totalPrice, deliveryCharge, newOrderNumber], async (error, result) => {
              if (error) {
                return res.status(500).json({
                  status: 500,
                  message: 'Internal server error4',
                  error : error,
                });
              }

              const newGetOrderQuery = `SELECT *, CASE order_status WHEN 1 THEN 'Pending' WHEN 2 THEN 'Processing' WHEN 3 THEN 'Shipped' WHEN 4 THEN 'Delivered' ELSE 'Cancelled' END AS order_status FROM orders WHERE customer_id = ? AND order_number = ?`;
              connection.query(newGetOrderQuery, [customerId, newOrderNumber], async (error, newOrderResult) => {
                if (error) {
                  return res.status(500).json({
                    status: 500,
                    message: 'Internal server error5',
                  });
                }

                const order = newOrderResult[0];
                const orderId = newOrderResult[0].order_id;
                let body;
                const paytmObj = await paymentByPaytm(newOrderNumber, customerId, totalPrice);
                await makeTransection(req, res, orderId, newOrderNumber, JSON.stringify(paytmObj), paymentMode);

                body = {
                  status: 200,
                  data: order,
                  payment_mode: paymentMode,
                  response_from_paytm: JSON.parse(paytmObj),
                };

                return res.json(body);
              });
            });
          });
        });

      } else {
        return res.status(404).json({
          status: 404,
          message: 'Record not found',
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Internal server error6',
    });
  }
};


const paymentByPaytm = async (orderNumber, customerId, totalPrice) => {
  var paytmParams = {};
  paytmParams.body = {
    "requestType": "Payment",
    // "mid": "jwrLNK34318204870049",
    "mid": "KVMEMR41945216767207",
    "websiteName": "DEFAULT",
    "orderId": orderNumber,
    "callbackUrl": "https://securegw.paytm.in/theia/paytmCallback?ORDER_ID="+orderNumber,
    "txnAmount": {
      "value": totalPrice,
      "currency": "INR",
    },
    "userInfo": {
      "custId": customerId,
    },
  };


  return new Promise((resolve, reject) => {

    PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), "gNe&c@ACQXC99EBu").then(function (checksum) {
      paytmParams.head = {
        "signature": checksum
      };
      var post_data = JSON.stringify(paytmParams);
      var options = {
       
        hostname: 'securegw.paytm.in',
        port: 443,
        path: `/theia/api/v1/initiateTransaction?mid=KVMEMR41945216767207&orderId=${orderNumber}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': post_data.length
        }
      };

      var post_req = https.request(options, function (post_res) {
        var response = "";
        post_res.on('data', function (chunk) {
          response += chunk;
        });
        post_res.on('end', function () {
          // console.log("response", response);
          resolve(response);
        });
      });

      post_req.on('error', function (error) {
        reject(error);
      });

      post_req.write(post_data);
      post_req.end();
    });


  });



};

const makeTransection = async (req, res, orderId, orderNumber, paytmObj, paymentMode) => {
  try {

    // console.log("--paytmObj--", paytmObj);
   // const paymentMode = req.body.payment_mode;
    const customerId = req.body.customer_id;
    const storeId = req.body.store_id;
    //
    const transectionStatu = 0;
    const insertQuery = `INSERT INTO transactions (transaction_status,store_id, transaction_type, order_number, order_id, customer_id, transection_initiate_details) 
                      VALUES (${transectionStatu}, ${storeId}, '${paymentMode}', '${orderNumber}', '${orderId}', '${customerId}','${paytmObj}' )`;

    return new Promise((resolve, reject) => {
      connection.query(insertQuery, (error, result) => {
        if (error) {
          reject({
            status: 500,
            message: 'Internal server error',
          });
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    return Promise.reject({
      status: 500,
      message: 'Internal server error',
    });
  }
};


const confirmPayment = async (req, res) => {
  try {
    const orderNumber = req.body.order_number;
    const errors = {};
    if (!orderNumber) {
      errors.orderNumber = ['order number is required'];
    }

    if (Object.keys(errors).length > 0) {
      return res.status(201).json({
        status: 201,
        validation_error: errors,
      });
    } else {
      const transaction_Status_Response = await transStatus(orderNumber);

      if (transaction_Status_Response) {
        const transectionResponse = JSON.parse(transaction_Status_Response);
        const transactionStatus = transectionResponse.body.resultInfo.resultStatus || '';
        const transactionMessage = transectionResponse.body.resultInfo.resultMsg || '';

        let transactionId = null;
        let transactionDate = null;

        if (transectionResponse.body.txnId) {
          transactionId = transectionResponse.body.txnId;
        }

        if (transectionResponse.body.txnDate) {
          transactionDate = transectionResponse.body.txnDate;
        }

        let updateFields = `transaction_status = '${transactionStatus}', message='${transactionMessage}'`;

        if (transactionId) {
          updateFields += `, transaction_id='${transactionId}'`;
        }

        if (transactionDate) {
          updateFields += `, transaction_date='${transactionDate}'`;
        }

        const selectQuery = `SELECT id from transactions WHERE order_number = '${orderNumber}' AND transaction_type='PAYTM'`;
        await new Promise((resolve, reject) => {
          connection.query(selectQuery, (error, result) => {
            if (error) {
              console.log("error", error);
              reject(error);
            } else {
              console.log("--result--", result.length);
              if (result.length > 0) {
                let id = result[0].id;
                const updateQuery = `UPDATE transactions SET ${updateFields} WHERE id = ${id}`;
                connection.query(updateQuery, (error, result) => {
                  if (error) {
                    console.log("error", error);
                    reject(error);
                  } else {
                    resolve();
                  }
                });
              } else {
                // Handle case when transactions table returns zero records
                return res.status(404).json({
                  status: 404,
                  message: 'No transaction found for the specified order number',
                });
              }
            }
          });
        });

        if (transactionStatus === 'TXN_SUCCESS') {
          const updateOrderQuery = `UPDATE orders SET transection_status = 1, order_status = 2 WHERE order_number = '${orderNumber}'`;
          await new Promise((resolve, reject) => {
            connection.query(updateOrderQuery, (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          });
        }

        res.status(200).json({
          status: 200,
          response: transectionResponse,
          //message: 'Transaction updated successfully',
        });
      }
    }
  } catch (error) {
    console.log("confirmPayment error", error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server error',
    });
  }
};


const transStatus = async(orderID)=>{
  var paytmParams = {};
  paytmParams.body = {
      // "mid" : "jwrLNK34318204870049",
      "mid" : "KVMEMR41945216767207",
      "orderId" : orderID,
  };
  return new Promise((resolve, reject) => {
      PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), "gNe&c@ACQXC99EBu").then(function(checksum){
          paytmParams.head = {
                "signature"	: checksum
          };
          var post_data = JSON.stringify(paytmParams);
          var options = {
             // hostname: 'securegw-stage.paytm.in',
              hostname: 'securegw.paytm.in',
              port: 443,
              path: '/v3/order/status',
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': post_data.length
              }
          };
      
          var response = "";
          var post_req = https.request(options, function(post_res) {
              post_res.on('data', function (chunk) {
                  response += chunk;
              });
      
              post_res.on('end', function(){
                  console.log('Response: ', response);
                  resolve(response);
              });
          });

          post_req.on('error', function (error) {
            reject(error);
          });
      
          post_req.write(post_data);
          post_req.end();
      });
  });

}















module.exports = {
  addToCart,
  getCartByCustomerId,
  deleteCartItem,
  getCheckoutItem,
  getRepayment,
  confirmPayment


  
  /*  
    paymentByPaytm,
    getRepayment,
    makeTransection,
    transStatus,
    confirmPayment
  */
};
