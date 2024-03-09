const { connection } = require('../../models/connection');
const b2bDB = process.env.B2BDATABASE;
const b2cDB = process.env.B2CDATABASE;



const addToWishlist = async (req, res) => {
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
        const quantity = 1;
        const categoryId = orders[i].category_id;
        const subCategoryId = orders[i].subcategory_id;

        const selectQuery = `SELECT * FROM wishlist WHERE customer_id = ${customerId} AND product_id = ${productId} AND active=1`;
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
          const insertQuery = `INSERT INTO wishlist(customer_id,store_id, product_id,category_id,subcategory_id, qty, active) 
          VALUES (${customerId}, ${storeId}, ${productId},${categoryId},${subCategoryId}, ${quantity}, 1)`;
          await new Promise((resolve, reject) => {
            connection.query(insertQuery, (error, result) => {
              if (error) {
                reject(error);
              } else {
                cartMessage = 'Wishlist item added successfully ';
                resolve();
              }
            });
          });
        } else {
          const existingQuantity = result[0].qty;
          if (existingQuantity !== quantity) {
            const updateQuery = `UPDATE wishlist SET qty = ${quantity} WHERE customer_id = ${customerId} AND product_id = ${productId}`;
            await new Promise((resolve, reject) => {
              connection.query(updateQuery, (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  cartMessage = 'Wishlist item updated successfully';
                  console.log("update");
                  resolve();
                }
              });
            });
          } else {
            cartMessage = "Item already into wishlist";
          }
        }
      }

      res.status(200).json({ status: 200, message: cartMessage });
    }
  } catch (err) {
    res.status(401).json({ status: 401, message: err });
  }
};

const getWishlistByCustomerId = async (req, res, next) => {
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
      const query = `SELECT t1.id as wishlist_id, t1.customer_id, t2.id as product_id, mp.name as product_name, cat.id as category_id, cat.name as category_name,subcat.id as subcategory_id,subcat.name as sub_category, t2.unit,t2.unit_qty, REPLACE(t2.product_image, '\"',"'") AS product_image,t2.gst, t2.igst, t1.qty, t4.price,
        t4.offer_price FROM ${b2cDB}.wishlist t1 
        LEFT JOIN ${b2bDB}.products t2 ON t2.id=t1.product_id
        LEFT JOIN ${b2bDB}.categories cat ON cat.id = t1.category_id
        LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = t1.subcategory_id
        LEFT JOIN ${b2bDB}.master_product mp ON mp.id = t2.master_product_id 
        LEFT JOIN ${b2cDB}.store_product_price t4 ON t4.product_id = t1.product_id AND t4.store_id=t1.store_id  WHERE t1.customer_id = ${customer_id} AND t1.active=1`;

      const countQuery = `SELECT COUNT(*) as total_count FROM wishlist WHERE customer_id = ${customer_id} AND active=1`;
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
        const { wishlist_id, customer_id, product_id, product_name, category_id, category, subcategory_id, sub_category,   unit, unit_qty, product_image, qty, price,
          offer_price, gst, igst } = row;

        const data2 = {
          wishlist_id, customer_id, product_id, product_name, category_id, category, subcategory_id, sub_category, unit, unit_qty, product_image, qty, price,
          offer_price, gst, igst
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

const deleteWishlisttItem = async (req, res) => {
  try {
    const cartId = req.params.id;
    const checkQuery = `SELECT id FROM wishlist WHERE id = ${cartId}`;
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
        const deleteQuery = `DELETE FROM wishlist WHERE id = ${cartId}`;
        connection.query(deleteQuery, (deleteError, deleteResults) => {
          if (deleteError) {
            res.status(500).json({
              status: 500,
              message: 'Internal server error',
            });
          } else {
            res.json({
              status: 200,
              message: "Wishlist item deleted successfully",
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


module.exports = {
  addToWishlist,
  getWishlistByCustomerId,
  deleteWishlisttItem

};
