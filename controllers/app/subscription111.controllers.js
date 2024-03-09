// const AWS = require('aws-sdk');
const { connection } = require('../../models/connection');
const { promisify } = require('util');
const config = require('../../config/env/development');
const b2bDB = process.env.B2BDATABASE;
const b2cDB = process.env.B2CDATABASE;
const https = require('https');
const PaytmChecksum = require('paytmchecksum');


const getSubscription = async (req, res) => {
  const filter = req.params.categoryId;
  const queryAsync = promisify(connection.query).bind(connection);
  const storeId = 2;
  try {
    let query = `
      SELECT s.*,mp.name,sp.price
      FROM ${b2cDB}.subscription s
      INNER JOIN ${b2cDB}.products p ON s.product_id = p.id
      INNER JOIN ${b2bDB}.master_product mp ON p.master_product_id = mp.id
      INNER JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
      WHERE s.is_deleted = 0
    `;
    const queryParams = [];

    console.log("Filter:", filter);

    if (filter !== 'all') {
      query += " AND s.category_id = ?";
      queryParams.push(filter);
    }

    const subscriptionLists = await queryAsync(query, queryParams);

    res.json({ subscriptionList: subscriptionLists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};


const getSubscriptionDetails = async (req, res) => {
  const subscriptionId = req.params.subscriptionId;
  const storeId = req.params.store_id;
  const queryAsync = promisify(connection.query).bind(connection);

  try {
    let query = `
      SELECT s.*,mp.name,p.product_image,sp.price as product_price,sp.offer_price as product_offer_price FROM ${b2cDB}.subscription s
      INNER JOIN ${b2cDB}.products p ON s.product_id = p.id
      INNER JOIN ${b2bDB}.master_product mp ON p.master_product_id = mp.id
      INNER JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
      WHERE s.is_deleted = 0 AND s.id=${subscriptionId}
    `;
    const subscriptionLists = await queryAsync(query, [subscriptionId]);
    res.json({ data: subscriptionLists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};

const subscribe = async (req, res) => {
  const user_id = 2;
  const { subscription_id, product_id, customer_id, frequencyJson } = req.body;
  const frequency_json = JSON.stringify(frequencyJson);
  const queryAsync = promisify(connection.query).bind(connection);
  try {
    const query = `
    SELECT * FROM subscription
    WHERE id = ? AND product_id = ? AND is_deleted = 0;
  `;
    const subscriptionPlans = await queryAsync(query, [subscription_id, product_id]);
    if (subscriptionPlans && subscriptionPlans.length > 0) {
      // Check if the user has an existing subscription
      const existingSubscription = await queryAsync(
        'SELECT * FROM subscription_plans WHERE customer_id = ? AND product_id = ? AND subscription_id =? AND is_active = 0',
        [customer_id, product_id, subscription_id]
      );

      if (existingSubscription.length > 0) {
        return res.status(400).json({ error: 'User already subscribed to this subscription plan.' });
      }

      const insertQuery = `
      INSERT INTO subscription_plans (subscription_id,product_id,frequency_json,customer_id )
      VALUES (?, ?, ?, ?)
    `;
      await queryAsync(insertQuery, [subscription_id, product_id, frequency_json, customer_id]);

      res.json({ success: true, message: 'Subscription created successfully' });
    } else {
      console.error('No subscription plans found.');
      res.status(404).json({ error: 'No subscription plans found.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getExistingSubscription = async (req, res) => {
  const queryAsync = promisify(connection.query).bind(connection);
  const customer_id = req.params.customerId;

  try {
    const query1 = `
      SELECT subscription_id, frequency_json FROM subscription_plans
      WHERE is_deleted = 0 AND customer_id = ? ;
    `;
    const [row] = await queryAsync(query1, [customer_id]);

    if (!row || !row.subscription_id) {
      return res.status(404).json({ error: "Subscription not found for this customer." });
    }

    const subscription_id = row.subscription_id;
    const frequencyJson = JSON.parse(row.frequency_json);
    const expireDate = new Date(frequencyJson.end_date);
    const currentDate = new Date();

    if (expireDate < currentDate) {
      const updateQuery = `
        UPDATE subscription_plans SET subscription_status = 1
        WHERE is_deleted = 0 AND customer_id = ?  AND subscription_id = ?;
      `;
      await queryAsync(updateQuery, [customer_id, subscription_id]);
    }


    const query2 = `
      SELECT * FROM subscription
      WHERE id = ? ;
    `;

    const subscriptionList = await queryAsync(query2, [subscription_id]);

    if (subscriptionList.length > 0) {
      subscriptionList[0].frequency_json = frequencyJson;
    }

    res.json({ subscriptionList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getCheckoutItem = async (req, res) => {
  try {
    const customerId = req.body.customer_id;
    const cartDetails = req.body.subscription_id;
    const totalPrice = req.body.total_price;
    const paymentMode = req.body.payment_mode;
    const storeId = req.body.store_id;
    const errors = {};

    if (!customerId) {
      errors.customer_id = ['customer_id is required'];
    }
    if (!cartDetails) {
      errors.cart_details = ['subscription_id is required'];
    }
    if (!totalPrice) {
      errors.total_price = ['total_price is required'];
    }
    if (totalPrice <= 0) {
      errors.total_price = ['total_price should be greater than 0'];
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

    const cartIds = cartDetails;
    const query = `SELECT * FROM subscription WHERE id = ${cartIds}`;
    console.log("-query-", query);
    connection.query(query, (error, results) => {

      console.log("results", results);
      if (results.length > 0) {
        const orderDetails = cartIds;
        connection.query('SELECT COUNT(*) as orderCount FROM subscription_orders', (error, countResult) => {
          if (error) {
            return res.status(500).json({
              status: 500,
              message: 'Internal server error',
            });
          }
          const orderCount = countResult[0].orderCount;
          const orderNumber = `MLKB2CSUBS000${orderCount + 1}`;

          const insertQuery = `INSERT INTO subscription_orders (customer_id, store_id, order_details, total_price, order_number) 
              VALUES (${customerId}, ${storeId}, '${orderDetails}', ${totalPrice}, '${orderNumber}')`;
          connection.query(insertQuery, async (error, result) => {
            if (error) {
              return res.status(500).json({
                status: 500,
                message: 'Internal server error',
              });
            }
            const getOrderQuery = `SELECT *, CASE order_status WHEN 1 THEN "Pending"  ELSE "Confirm" END AS order_status FROM subscription_orders WHERE customer_id = ${customerId} AND order_number = '${orderNumber}'`;
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

      } else {
        return res.json({
          status: 201,
          message: 'Subscription id not found',
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


const makeTransection = async (req, res, orderId, orderNumber, paytmObj, paymentMode) => {
  try {

    const customerId = req.body.customer_id;
    const storeId = req.body.store_id;
    const transectionStatu = 0;
    const insertQuery = `INSERT INTO subscription_transactions (transaction_status,store_id, transaction_type, order_number, order_id, customer_id, transection_initiate_details) 
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

const paymentByPaytm = async (orderNumber, customerId, totalPrice) => {
  var paytmParams = {};
  paytmParams.body = {
    "requestType": "Payment",
    // "mid": "jwrLNK34318204870049",
    "mid": "KVMEMR41945216767207",
    "websiteName": "DEFAULT",
    "orderId": orderNumber,
    "callbackUrl": "https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=" + orderNumber,
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


const orderList = async (req, res) => {
  const errors = {};
  const customerId = req.params.id;
  const storeId = req.params.storeId;

  if (!customerId) {
    errors.id = ['id is required'];
    res.status(401).json({
      status: 401,
      validation_error: errors,
    });
    return;
  }

  try {
    const resultOrder = await queryAsync(`SELECT p.product_image,mp.name,t1.order_details as subscription_id,t1.order_id,t1.total_price,t1.order_number,t1.created_at, t2.transaction_status, t2.transaction_id, transaction_type, CASE t1.order_status WHEN 1 THEN "Pending" ELSE "Canfirm" END AS order_status,t1.transection_status as order_flag,s.subscription_name,s.price,s.offer_price,s.total_offer_price FROM subscription_orders t1 INNER JOIN subscription_transactions t2 on t1.order_id = t2.order_id INNER JOIN subscription s on s.id = t1.order_details  INNER JOIN products p on p.id = s.product_id INNER JOIN ${b2bDB}.master_product mp ON p.master_product_id = mp.id WHERE t1.customer_id=? order by t1.order_id desc`, [customerId]);

    if (resultOrder.length === 0) {
      res.status(401).json({
        status: 401,
        message: 'record not found',
      });
      return;
    }

    const totalCount = resultOrder.length;
        res.status(200).json({
          status: 200,
          total_count: totalCount,
          result: resultOrder,
        });
      
  } catch (error) {

    console.log("error", error);
    res.status(500).json({
      status: 500,
      message: 'An error occurred while processing your request.',
    });
  }
};


const queryAsync = (sql, values) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};


const getOrderDetail = async (req, res) => {
  const errors = {};
  const customerId = req.body.customer_id;
  const orderId = req.body.order_id;
  const storeId = req.body.store_id;

  if (!customerId) {
    errors.id = ['id is required'];
    res.status(401).json({
      status: 401,
      validation_error: errors,
    });
    return;
  }

  try {
    const resultOrder = await queryAsync(`SELECT p.product_image,mp.name,t1.order_details as subscription_id,t1.order_id,t1.total_price,t1.order_number,t1.created_at, t2.transaction_status, t2.transaction_id, transaction_type, CASE t1.order_status WHEN 1 THEN "Pending" ELSE "Canfirm" END AS order_status,t1.transection_status as order_flag,s.subscription_name,s.price,s.offer_price,s.total_offer_price FROM subscription_orders t1 INNER JOIN subscription_transactions t2 on t1.order_id = t2.order_id INNER JOIN subscription s on s.id = t1.order_details  INNER JOIN products p on p.id = s.product_id INNER JOIN ${b2bDB}.master_product mp ON p.master_product_id = mp.id WHERE t1.customer_id=? AND t1.order_id=? AND t1.store_id =?`, [customerId, orderId, storeId]);

    if (resultOrder.length === 0) {
      res.status(401).json({
        status: 401,
        message: 'record not found',
      });
      return;
    }

    const totalCount = resultOrder.length;
        res.status(200).json({
          status: 200,
          total_count: totalCount,
          result: resultOrder,
        });
      
  } catch (error) {

    console.log("error", error);
    res.status(500).json({
      status: 500,
      message: 'An error occurred while processing your request.',
    });
  }
};



module.exports = {
  getSubscription,
  getSubscriptionDetails,
  subscribe,
  getExistingSubscription,
  getCheckoutItem,
  orderList,
  getOrderDetail
};