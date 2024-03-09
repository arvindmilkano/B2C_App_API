const { connection } = require('../../models/connection');
const b2bDB = process.env.B2BDATABASE;
const b2cDB = process.env.B2CDATABASE;
const util = require('util');
const promisifiedQuery = util.promisify(connection.query);




const orderListOLDD = (req, res) => {
  const errors = {};
  const customerId = req.params.id; 
  const storeId = 2;
  if (!customerId) {
    errors.id = ['id is required'];
  }
  if (Object.keys(errors).length > 0) {
    res.send({
      "status": 401,
      "validation_error": errors,
    })
  } else {
    connection.query('SELECT t1.order_details,t1.order_id,t1.total_price,t1.order_number,t1.created_at, t2.transaction_status, t2.transaction_id, transaction_type, transaction_date, CASE t1.order_status WHEN 1 THEN "Pending" WHEN 2 THEN "Processing" WHEN 3 THEN "Shipped" WHEN 4 THEN "Deliverd" ELSE "Cancelled" END AS order_status,t1.transection_status as order_flag FROM orders t1 INNER JOIN transactions t2 on t1.order_id = t2.order_id INNER JOIN cart c on c.id IN (t1.order_details)  INNER JOIN products p on p.id = c.product_id  WHERE t1.customer_id=? order by t1.order_id desc ', [customerId], (error, resultOrder) => {
      if (error) throw error;
      if (resultOrder.length > 0) {
        const totalCount = resultOrder.length;
        

        for(let i=0;i<totalCount;i++){
         
          const cartIds = resultOrder[i].order_details;
          console.log("-cartIds-", cartIds);

          const cartQuery = `SELECT
            t2.product_image FROM cart t1
            INNER JOIN products t2 ON t1.product_id = t2.id
            WHERE t1.id IN (${cartIds}) and t1.customer_id= ${customerId} AND t1.store_id = ${storeId}`;
            connection.query(cartQuery, (error, cartResult) => {
             
            
            resultOrder['product_image'] = cartResult;
              
            

        
        res.status(200).send({
          status: 200,
          total_count: totalCount,
          result : resultOrder,
          //products : cartResult,
        });

      });
    }
      } else {
        res.status(401).send({
          status: 401,
          "message": "record not found",
        });
      }
    });
  }



};


const orderListOld = async (req, res) => {
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
    const resultOrder = await queryAsync(`SELECT t1.order_details,t1.order_id,t1.total_price,t1.order_number,t1.created_at, t2.transaction_status, t2.transaction_id, transaction_type, transaction_date, CASE t1.order_status WHEN 1 THEN "Pending" WHEN 2 THEN "Processing" WHEN 3 THEN "Shipped" WHEN 4 THEN "Delivered" ELSE "Cancelled" END AS order_status,t1.transection_status as order_flag,r.rating as order_rating,r.review as order_review FROM orders t1 INNER JOIN transactions t2 on t1.order_id = t2.order_id INNER JOIN cart c on c.id IN (t1.order_details)  INNER JOIN ${b2bDB}.products p on p.id = c.product_id LEFT JOIN  rating r on t1.order_id = r.order_id WHERE t1.customer_id=? order by t1.order_id desc`, [customerId]);

    if (resultOrder.length === 0) {
      res.status(401).json({
        status: 401,
        message: 'record not found',
      });
      return;
    }

    const totalCount = resultOrder.length;
    let count = 0; // To keep track of processed orders

    for (let i = 0; i < totalCount; i++) {
      const cartIds = resultOrder[i].order_details;
      console.log("-cartIds-", cartIds);

      const cartResult = await queryAsync(`SELECT REPLACE(t2.product_image, '\"',"'") AS product_image FROM cart t1 INNER JOIN ${b2bDB}.products t2 ON t1.product_id = t2.id WHERE t1.id IN (${cartIds}) and t1.customer_id = ${customerId} AND t1.store_id = ${storeId}`);
      
      const productsImage = cartResult.map(product => ({
          product_image: product.product_image.replace(/[\[\]']/g, '').split(','),
      }));

      resultOrder[i]['product_image'] = productsImage;
      count++;

      // Check if all orders have been processed
      if (count === totalCount) {
        res.status(200).json({
          status: 200,
          total_count: totalCount,
          result: resultOrder,
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: 'An error occurred while processing your request.',
    });
  }
};


const orderList = async (req, res) => {
  const customerId = req.params.id;
  const storeId = req.params.storeId;

  if (!customerId) {
    return res.status(401).json({
      status: 401,
      validation_error: { id: ['id is required'] },
    });
  }

  try {
    const resultOrder = await queryAsync(`
      SELECT t1.order_details, t1.order_id, t1.total_price, t1.order_number, t1.created_at, 
      t2.transaction_status, t2.transaction_id, transaction_type, transaction_date, 
      CASE t1.order_status 
        WHEN 1 THEN "Pending" 
        WHEN 2 THEN "Processing" 
        WHEN 3 THEN "Shipped" 
        WHEN 4 THEN "Delivered" 
        ELSE "Cancelled" 
      END AS order_status,
      t1.transection_status as order_flag, r.rating as order_rating, r.review as order_review
      FROM orders t1 
      INNER JOIN transactions t2 ON t1.order_id = t2.order_id 
      INNER JOIN cart c ON c.id IN (t1.order_details)  
      INNER JOIN ${b2bDB}.products p ON p.id = c.product_id 
      LEFT JOIN rating r ON t1.order_id = r.order_id 
      WHERE t1.customer_id=? 
      ORDER BY t1.order_id DESC`, [customerId]);

    if (resultOrder.length === 0) {
      return res.status(401).json({
        status: 401,
        message: 'record not found',
      });
    }

    const totalCount = resultOrder.length;

    // Use Promise.all for parallel queries
    const resultPromises = resultOrder.map(async (order) => {
      const cartIds = order.order_details;
      const cartResult = await queryAsync(`
        SELECT REPLACE(t2.product_image, '\"', "'") AS product_image 
        FROM cart t1 
        INNER JOIN ${b2bDB}.products t2 ON t1.product_id = t2.id 
        WHERE t1.id IN (${cartIds}) AND t1.customer_id = ? AND t1.store_id = ?`, [customerId, storeId]);

      const productsImage = cartResult.map(product => ({
        product_image: product.product_image.replace(/[\[\]']/g, '').split(','),
      }));

      return { ...order, product_image: productsImage };
    });

    // Wait for all promises to resolve
    const resultWithImages = await Promise.all(resultPromises);

    res.status(200).json({
      status: 200,
      total_count: totalCount,
      result: resultWithImages,
    });

  } catch (error) {
    console.error(error);
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






const getOrderDetailOLD = (req, res) => {
  const errors = {};
  const customerId = req.body.customer_id;
  const orderId = req.body.order_id;

  if (!customerId) {
    errors.customer_id = ['customer_id is required'];
  }
  if (!orderId) {
    errors.order_id = ['order_id is required'];
  }

  if (Object.keys(errors).length > 0) {
    res.send({
      status: 401,
      validation_error: errors,
    });
  } else {
    connection.query('SELECT  t1.*, t2.transaction_status, t2.transaction_id, transaction_type,transaction_date, CASE t1.order_status WHEN 1 THEN "Pending" WHEN 2 THEN "Processing" WHEN 3 THEN "Shipped" WHEN 4 THEN "Deliverd" ELSE "Cancelled" END AS order_status FROM orders t1 INNER JOIN transactions t2 on t1.order_id = t2.order_id WHERE t1.customer_id=? AND t1.order_id=?', [customerId, orderId], (error, result) => {
      if (error) throw error;
      console.log("-result.length-", result.length);
      if (result.length > 0) {
        const cartIds = result[0].order_details;
        console.log("cartIds", cartIds);
        const promises = [];
        let cartQuery = `SELECT
        mp.name AS product_name,
        (select name from categories where id=mp.category_id) as product_category,
        t2.product_image,
        t1.qty,
        t4.price,
        t4.offer_price
        FROM
        cart t1
        INNER JOIN products t2 ON t1.product_id = t2.id
        INNER JOIN ${b2bDB}.master_product mp ON mp.id = t2.master_product_id
        INNER JOIN store_product_price t4 ON t4.product_id = t2.id
      WHERE t1.id IN (${cartIds})`;
        const promise = new Promise((resolve, reject) => {
          connection.query(cartQuery, (error, cartResult) => {
            if (error) reject(error);
            else resolve(cartResult);
          });
        });
        promises.push(promise);

        Promise.all(promises)
          .then((orders) => {
            res.status(200).send({
              status: 200,
              order: result,
              order_items: orders,
            });
          })
          .catch((error) => {
            res.status(500).send({
              status: 500,
              message: 'Internal server error',
            });
          });
      } else {
        res.status(401).send({
          status: 401,
          message: 'Record not found',
        });
      }
    });
  }
};


const getOrderDetail = (req, res) => {
  const errors = {};
  const customerId = req.body.customer_id;
  const orderId = req.body.order_id;
  const storeId = req.body.store_id;

  if (!customerId) {
    errors.customer_id = ['customer_id is required'];
  }
  if (!orderId) {
    errors.order_id = ['order_id is required'];
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      status: 400,
      validation_error: errors,
    });
  } else {
    connection.query(
      'SELECT t1.*, t2.transaction_status, t2.transaction_id, transaction_type, transaction_date, CASE t1.order_status WHEN 1 THEN "Pending" WHEN 2 THEN "Processing" WHEN 3 THEN "Shipped" WHEN 4 THEN "Delivered" ELSE "Cancelled" END AS order_status FROM orders t1 INNER JOIN transactions t2 ON t1.order_id = t2.order_id WHERE t1.customer_id=? AND t1.order_id=? AND t1.store_id =?',
      [customerId, orderId, storeId],
      (error, result) => {
        if (error) {
          console.error("Database error:", error);
          res.status(500).json({
            status: 500,
            message: 'Internal Server Error',
          });
        } else if (result.length > 0) {
          const cartIds = result[0].order_details;
          // console.log("--cartIds--", cartIds);
          const cartQuery = `SELECT
            mp.name AS product_name, cat.id as category_id, cat.name as category_name, subcat.id as subcategory_id ,subcat.name as sub_category,REPLACE(t2.product_image, '\"',"'") AS product_image, t2.unit, t2.unit_qty,
            t1.qty,
            t1.mrp as price,
            t1.offer_price
            FROM cart t1
            INNER JOIN ${b2bDB}.products t2 ON t1.product_id = t2.id
            INNER JOIN ${b2bDB}.categories cat ON cat.id = t1.category_id
            INNER JOIN ${b2bDB}.subcategories subcat ON subcat.id = t1.subcategory_id
            INNER JOIN ${b2bDB}.master_product mp ON mp.id = t2.master_product_id
            INNER JOIN store_product_price t4 ON t4.product_id = t2.id  AND t4.store_id = ${storeId}
            WHERE t1.id IN (${cartIds}) and t1.customer_id= ${customerId} AND t1.store_id = ${storeId}`;

           

          connection.query(cartQuery, (error, cartResult) => {
            if (error) {
              console.error("Database error:", error);
              res.status(500).json({
                status: 500,
                message: 'Internal Server Error',
              });
            } else {

              const cartresult2 = cartResult.map(product => ({
                ...product,
                product_image: product.product_image.replace(/[\[\]']/g, '').split(','),
              }));

              res.status(200).json({
                status: 200,
                order: result,
                order_items: cartresult2,
              });
            }
          });
        } else {
          res.status(404).json({
            status: 404,
            message: 'Record not found',
          });
        }
      }
    );
  }
};








module.exports = {
  orderList,
  getOrderDetail
};
