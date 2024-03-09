// const AWS = require('aws-sdk');
const { connection } = require('../../models/connection');
const multer = require('multer');
const { promisify } = require('util');
const b2bDB = process.env.B2BDATABASE;
const b2cDB = process.env.B2CDATABASE;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const config = require('../../config/env/development');

// const s3 = new AWS.S3({
//   accessKeyId: config.ACCESS_KEY_ID,
//   secretAccessKey:config.SECRET_ACCESS_KEY ,
//   region: config.REGION,
// });


const getBanner = async (req, res) => {
  console.log("--Banner---");
  const queryAsync = promisify(connection.query).bind(connection);
  try {
    const query = "SELECT id, banner_image_url FROM banner WHERE is_deleted = 0 AND is_active = 1";
    const bannerList = await queryAsync(query);

    const baseUrl = 'https://s3-bucket-url.com/';

    const bannerListWithUrls = bannerList.map((banner) => ({
      ...banner,
      banner_image_url: baseUrl + banner.banner_image_url,
    }));

    res.json({ bannerList: bannerListWithUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};


const getProductList = async (req, res) => {
  let banner_id = req.params.bannerId;
  const queryAsync = promisify(connection.query).bind(connection);

  try {
    const productIdsQuery = "SELECT product_id FROM banner_product_mapping WHERE banner_id = ?";
    const productIdsResult = await queryAsync(productIdsQuery, [banner_id]);
    const productIds = productIdsResult.map((row) => row.product_id);

    if (productIds.length === 0) {
      return res.json({ productList: [] }); 
    }
    // console.log(productIds)
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
    WHERE p.status = '1' AND sp.store_id = ${storeId} AND p.id IN (SELECT product_id FROM banner_product_mapping WHERE banner_id =${banner_id})`;
    const totalCountResult = await promisifyQuery(connection, countQuery);
    console.log(totalCountResult)
    const totalCount = totalCountResult[0].total_count;
    const query = `SELECT  p.id as id, mp.name as product_name, REPLACE(p.product_image, '\"',"'") AS product_image, p.unit,p.unit_qty, cat.id as category_id, cat.name as category_name, subcat.id as subcategory_id, subcat.name as sub_category,p.description,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price,sp.discount
    FROM ${b2bDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    where p.status = '1' AND sp.store_id = ${storeId} AND p.id IN (SELECT product_id FROM banner_product_mapping WHERE banner_id =${banner_id})
    GROUP BY p.id order by mp.name asc
    LIMIT ${limit}
    OFFSET ${offset}`;
    const products = await promisifyQuery(connection, query);
    // connection.end();

    const final_products = products.map(product => ({
      ...product,
      product_image: product.product_image.replace(/[\[\]']/g, '').split(','),
    }));
    

    res.json({
      status: 200,
      total_count: totalCount,
      result: final_products,
    });
    // const productListQuery = "SELECT * FROM products WHERE id IN (?) ";
    // const productListResult = await queryAsync(productListQuery, [productIds]);

    // res.json({ productList: productListResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
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
    // addBanner,
    getBanner,
    getProductList
};