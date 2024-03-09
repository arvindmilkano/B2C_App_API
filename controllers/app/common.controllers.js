const { connection } = require('../../models/connection');
const b2bDB = process.env.B2BDATABASE;
const b2cDB = process.env.B2CDATABASE;

const getDeliveryCharge = (req, res) => {
  let body = req.body;
  let storeId = req.body.store_id;
  let totalPrice = req.body.total_price;

  console.log("body", body);
  const errors = {};
  connection.query(`SELECT id,store_id,charge as delivery_charge
   from delivery_charge where isActive=1 AND store_id=${storeId} AND total_order>= ${totalPrice} limit 1`, (error, result) => {
      if (error) throw error;
      if (result.length > 0) {
        res.status(200).send({
          status: 200,
          "result": result,
        });
      } else {
        res.status(401).send({
          status: 401,
          "message": "record not found",
        });
      }
    });
};


const getDashboardProduct = async (req, res) => {
  const errors = {};
  console.log("--getDashboardProduct--");
  // const customerId = req.body.id;
  const storeId = req.body.store_id;

  if (!storeId) {
    errors.storeId
      = ['store id is required'];
    res.status(401).json({
      status: 401,
      validation_error: errors,
    });
    return;
  }

  try {
    const resultOrder = await queryAsync('SELECT cat.name, t1.* FROM dashboard_product t1 INNER JOIN categories cat on cat.id = t1.category_id  WHERE t1.store_id=? order by t1.sort_index desc', [storeId]);

    console.log("--resultOrder.length--", resultOrder.length);
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
      const categoryId = resultOrder[i].category_id;
      console.log("-categoryId-", categoryId);

      const productResult = await queryAsync(`SELECT p.id as product_id,mp.name as product_name, p.product_image,p.unit,p.unit_qty, mp.category_id, cat.name as category_name,p.description,
      CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price,sp.discount FROM  ${b2bDB}.master_product mp INNER JOIN products p ON mp.id = p.master_product_id 
      LEFT JOIN ${b2cDB}.categories cat ON cat.id = mp.category_id
      LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
      WHERE mp.category_id = ${categoryId} and mp.status = 1`);
      resultOrder[i]['product_detail'] = productResult;

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
  }
  catch (error) {
    console.log("error",error);
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


const flashDealList = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const storeId = req.query.store || 2;

    const countQuery = `SELECT COUNT(*) as total_count
    FROM ${b2cDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.stock st ON st.product_id = p.id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    WHERE p.status = '1' AND p.flash_deal=1 AND sp.store_id = ${storeId}`;
    const totalCountResult = await promisifyQuery(connection, countQuery);
    const totalCount = totalCountResult[0].total_count;
    const query = `SELECT  p.id as id, mp.name as product_name, p.product_image,p.unit,p.unit_qty, pc.category_id, cat.name as category_name,subCat.id as subcategory_id,subCat.sub_category,p.description,st.total_stock,st.b2b_stock,st.b2c_stock,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price
    FROM ${b2cDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.stock st ON st.product_id = p.id
    LEFT JOIN ${b2cDB}.product_category pc ON pc.product_id = p.id
    LEFT JOIN ${b2cDB}.subcategory subCat ON subCat.id = pc.subcategory_id
    LEFT JOIN ${b2cDB}.categories cat ON cat.id = pc.category_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    where p.status = '1' AND p.flash_deal=1 AND sp.store_id = ${storeId}
    GROUP BY p.id order by mp.name asc
    LIMIT ${limit}
    OFFSET ${offset}`;
    const products = await promisifyQuery(connection, query);
    // connection.end();
    res.json({
      status: 200,
      total_count: totalCount,
      result: products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

function promisifyQuery(connection, query) {
  return new Promise((resolve, reject) => {
    connection.query(query, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

module.exports = {
  getDeliveryCharge,
  getDashboardProduct,
  flashDealList
};
