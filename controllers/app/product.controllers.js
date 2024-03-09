const { connection } = require('../../models/connection');
const b2bDB = process.env.B2BDATABASE;
const b2cDB = process.env.B2CDATABASE;


const list = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const storeId = req.query.store || 2;

    const countQuery = `SELECT COUNT(*) as total_count
    FROM ${b2bDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    WHERE p.status = '1' AND sp.store_id = ${storeId}`;

    console.log("countQuery", countQuery);

    const totalCountResult = await promisifyQuery(connection, countQuery);
    const totalCount = totalCountResult[0].total_count;

    const query = `SELECT  p.id as id, mp.name as product_name, REPLACE(p.product_image, '\"',"'") AS product_image, p.unit,p.unit_qty, cat.id as category_id, cat.name as category_name, subcat.id as subcategory_id, subcat.name as sub_category, p.description,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price,sp.discount
    FROM ${b2bDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    where p.status = '1' AND sp.store_id = ${storeId}
    GROUP BY p.id order by mp.name asc
    LIMIT ${limit}
    OFFSET ${offset}`;

    const products = await promisifyQuery(connection, query);
    const final_products = products.map(product => ({
      ...product,
      product_image: product.product_image.replace(/[\[\]']/g, '').split(','),
    }));
    res.json({
      status: 200,
      total_count: totalCount,
      result: final_products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const dashboardProductList = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 4;
    const offset = (page - 1) * limit;
    const storeId = req.query.store || 2;

    const categoryQuery = `SELECT cat.id, cat.name
    FROM ${b2bDB}.categories cat
    INNER JOIN ${b2bDB}.master_product mp ON mp.category_id = cat.id
    INNER JOIN ${b2bDB}.products p ON p.master_product_id = mp.id
    INNER JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id = ${storeId}
    WHERE cat.status = 1 GROUP BY cat.name
    ORDER BY cat.category_order ASC`;

    const CategoryResult = await promisifyQuery(connection, categoryQuery);
    const categories = await Promise.all(CategoryResult.map(async categoryData => {
      const query = `SELECT  p.id as id, mp.name as product_name, REPLACE(p.product_image, '\"',"'") AS product_image, p.unit,p.unit_qty, cat.id as category_id, cat.name as category_name, subcat.id as subcategory_id, subcat.name as sub_category,
        CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, sp.price,sp.offer_price,sp.discount
        FROM ${b2bDB}.products p
        LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
        LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
        LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
        LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
        where p.status = '1' AND sp.store_id = ${storeId} AND cat.id = ${categoryData.id}
        GROUP BY p.id order by mp.name asc LIMIT ${limit}
        OFFSET ${offset}`;

      const products = await promisifyQuery(connection, query);
      const final_products = products.map(product => ({
        ...product,
        product_image: product.product_image
          .replace(/[\[\]']/g, '')
          .split(',')
          .map(image => image.trim())
          .shift(),
      }));
      const categoryName = categoryData.name;
      return {
        category: categoryName,
        products: final_products,
      };
    }));

    res.json({
      status: 200,
      result: categories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const dashboardOrganicDining = async (req, res) => {
  try {

    const query = `SELECT  id,name,image,background_color from ${b2bDB}.subcategories where category_id=18 order by name asc limit 8`;
    const products = await promisifyQuery(connection, query);
    res.json({
      status: 200,
      result: products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};







const productByIdOld = async (req, res) => {
  try {
    const errors = {};
    if (!req.query.store) {
      errors.store = ['store is required'];
    }
    if (!req.params.productId) {
      errors.productId = ['Product ID is required'];
    }

    if (Object.keys(errors).length > 0) {
      return res.json({
        status: 'failed',
        validation_error: errors,
      });
    }

    const storeId = req.query.store || 2;
    const productId = req.params.productId;

    const query = `
      SELECT
        p.id as id,
        mp.name as product_name,
        p.product_image,
        p.unit,
        p.unit_qty,
        pc.category_id,
        cat.name as category_name,
        subCat.id as subcategory_id,
        subCat.sub_category,
        p.description,
        st.total_stock,
        st.b2b_stock,
        st.b2c_stock,
        CASE cat.type WHEN 1 THEN "true" ELSE "false" END AS IsVeg,
        p.gst,
        p.igst,
        sp.price,sp.offer_price,sp.discount
      FROM ${b2cDB}.products p
      LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
      LEFT JOIN ${b2bDB}.stock st ON st.product_id = p.id
      LEFT JOIN ${b2cDB}.product_category pc ON pc.product_id = p.id
      LEFT JOIN ${b2cDB}.subcategory subCat ON subCat.id = pc.subcategory_id
      LEFT JOIN ${b2cDB}.categories cat ON cat.id = pc.category_id
      LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id = ${storeId}
      WHERE p.status = '1' AND sp.store_id = ${storeId} AND p.id = ${productId}
      GROUP BY p.id
      ORDER BY mp.name ASC`;

    const products = await promisifyQuery(connection, query);

    if (products.length > 0) {
      res.json({
        status: 200,
        result: products,
      });
    } else {
      res.json({
        status: 200,
        message: 'record not found',
        result: [],
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const productById = async (req, res) => {
  try {
    const errors = {};
    if (!req.query.store) {
      errors.store = ['store is required'];
    }
    if (!req.params.productId) {
      errors.productId = ['Product ID is required'];
    }

    if (Object.keys(errors).length > 0) {
      return res.json({
        status: 'failed',
        validation_error: errors,
      });
    }

    const storeId = req.query.store || 2;
    const productId = req.params.productId;

    const query = `SELECT  p.id as id, mp.name as product_name, REPLACE(p.product_image, '\"',"'") AS product_image, p.unit,p.unit_qty, cat.id as category_id, cat.name as category_name, subcat.id as subcategory_id, subcat.name as sub_category, p.description,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price,sp.discount
    FROM ${b2bDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    where p.status = '1' AND sp.store_id = ${storeId} AND p.id = ${productId}
    GROUP BY p.id order by mp.name asc`;

    const products = await promisifyQuery(connection, query);

    if (products.length > 0) {

      const products2 = products.map(product => ({
        ...product,
        product_image: product.product_image.replace(/[\[\]']/g, '').split(','),
      }));

      res.json({
        status: 200,
        result: products2,
      });
    } else {
      res.json({
        status: 200,
        message: 'record not found',
        result: [],
      });
    }
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

const ProductsBySearchStringOld = async (req, res) => {
  try {
    const category = req.query.category || '';
    const name = req.query.name || '';
    let search = '';

    if (category && name) {
      search = `WHERE cat.name LIKE '%${category}%' OR mp.name LIKE '%${name}%'`;
    } else if (category) {
      search = `WHERE cat.name LIKE '%${category}%'`;
    } else if (name) {
      search = `WHERE mp.name LIKE '%${name}%'`;
    }

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
    ${search} AND p.status = '1' AND sp.store_id = ${storeId}`;
    const totalCountResult = await promisifyQuery(connection, countQuery);
    const totalCount = totalCountResult[0].total_count;
    const query = `SELECT  p.id as id, mp.name as product_name, p.product_image,p.unit,p.unit_qty, pc.category_id, cat.name as category_name,subCat.id as subcategory_id,subCat.sub_category,p.description,st.total_stock,st.b2b_stock,st.b2c_stock,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price, sp.offer_price,sp.discount
    FROM ${b2cDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.stock st ON st.product_id = p.id
    LEFT JOIN ${b2cDB}.product_category pc ON pc.product_id = p.id
    LEFT JOIN ${b2cDB}.subcategory subCat ON subCat.id = pc.subcategory_id
    LEFT JOIN ${b2cDB}.categories cat ON cat.id = pc.category_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    ${search}
    AND p.status = '1' AND sp.store_id = ${storeId}
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

const ProductsBySearchString = async (req, res) => {
  try {
    const category = req.query.category || '';
    const name = req.query.name || '';
    const sort = req.query.sort || '';
    const order = req.query.order;
    const brand = req.query.brand;

    let search = '';

    if (category && name) {
      search = `WHERE cat.name LIKE '%${category}%' OR mp.name LIKE '%${name}%'`;
    } else if (category) {
      search = `WHERE cat.name LIKE '%${category}%'`;
    } else if (name) {
      search = `WHERE mp.name LIKE '%${name}%'`;
    } else if (sort == 'brand') {
      search = `WHERE mp.brand_id IN (${brand})`;
    }

    let sortValue = '';
    if (sort == 'price') {
      sortValue = `order by p.price_per_kg ${order}`;
    } else {
      sortValue = `order by mp.name asc`;
    }

    const page = req.query.page || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const storeId = req.query.store || 2;


    const countQuery = `SELECT COUNT(*) as total_count
    FROM ${b2bDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    ${search} AND p.status = '1' AND sp.store_id = ${storeId}`;

    const totalCountResult = await promisifyQuery(connection, countQuery);
    const totalCount = totalCountResult[0].total_count;

    const query = `SELECT  p.id as id, mp.name as product_name, REPLACE(p.product_image, '\"',"'") AS product_image, p.unit,p.unit_qty, cat.id as category_id, cat.name as category_name, subcat.id as subcategory_id, subcat.name as sub_category, p.description,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price,sp.discount
    FROM ${b2bDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    ${search} AND p.status = '1' AND sp.store_id = ${storeId}
    GROUP BY p.id ${sortValue} LIMIT ${limit}
    OFFSET ${offset}`;

    const products = await promisifyQuery(connection, query);
    const products2 = products.map(product => ({
      ...product,
      product_image: product.product_image.replace(/[\[\]']/g, '').split(','),
    }));

    res.json({
      status: 200,
      total_count: totalCount,
      result: products2,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const ProductsByCategory = async (req, res) => {
  try {
    const errors = {};
    const categoryId = req.params.categoryId;
    const page = req.query.page || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const storeId = req.query.store || 2;


    /*
    const countQuery = `SELECT COUNT(*) AS total_count
    FROM ${b2cDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.stock st ON st.product_id = p.id
    LEFT JOIN ${b2cDB}.product_category pc ON pc.product_id = p.id
    LEFT JOIN ${b2cDB}.subcategory subCat ON subCat.id = pc.subcategory_id
    LEFT JOIN ${b2cDB}.categories cat ON cat.id = pc.category_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    WHERE pc.category_id = ${categoryId} AND p.status = '1' AND sp.store_id = ${storeId}`;

    const totalCountResult = await promisifyQuery(connection, countQuery);
    const totalCount = totalCountResult[0].total_count;
    const query = `SELECT  p.id as id, mp.name as product_name, p.product_image,p.unit,p.unit_qty, pc.category_id, cat.name as category_name,subCat.id as subcategory_id,subCat.sub_category, p.description,st.total_stock,st.b2b_stock,st.b2c_stock,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price,sp.discount
    FROM ${b2cDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.stock st ON st.product_id = p.id
    LEFT JOIN ${b2cDB}.product_category pc ON pc.product_id = p.id
    LEFT JOIN ${b2cDB}.subcategory subCat ON subCat.id = pc.subcategory_id
    LEFT JOIN ${b2cDB}.categories cat ON cat.id = pc.category_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    AND p.status = '1' AND sp.store_id = ${storeId}
    WHERE pc.category_id = ${categoryId}
    GROUP BY p.id order by mp.name asc
    LIMIT ${limit}
    OFFSET ${offset}`;
    */

    const countQuery = `SELECT COUNT(*) as total_count
    FROM ${b2bDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
    INNER JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    WHERE mp.category_id = ${categoryId} AND p.status = '1' AND sp.store_id = ${storeId} `;

    const totalCountResult = await promisifyQuery(connection, countQuery);
    const totalCount = totalCountResult[0].total_count;

    const query = `SELECT  p.id as id, mp.name as product_name, REPLACE(p.product_image, '\"',"'") AS product_image, p.unit,p.unit_qty, cat.id as category_id, cat.name as category_name, subcat.id as subcategory_id, subcat.name as sub_category, p.description,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price,sp.discount
    FROM ${b2bDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    WHERE mp.category_id = ${categoryId} AND p.status = '1' AND sp.store_id = ${storeId}
    GROUP BY p.id order by mp.name asc
    LIMIT ${limit}
    OFFSET ${offset}`;

    const products = await promisifyQuery(connection, query);
    const products2 = products.map(product => ({
      ...product,
      product_image: product.product_image.replace(/[\[\]']/g, '').split(','),
    }));
    res.json({
      status: 200,
      total_count: totalCount,
      result: products2,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const ProductsBySubCategoryOld = async (req, res) => {
  try {
    const errors = {};
    const subCategoryId = req.params.subcategoryId;
    const page = req.query.page || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const storeId = req.query.store || 2;


    const countQuery = `SELECT COUNT(*) AS total_count
    FROM ${b2cDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.stock st ON st.product_id = p.id
    LEFT JOIN ${b2cDB}.product_category pc ON pc.product_id = p.id
    LEFT JOIN ${b2cDB}.subcategory subCat ON subCat.id = pc.subcategory_id
    LEFT JOIN ${b2cDB}.categories cat ON cat.id = pc.category_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    WHERE pc.subcategory_id = ${subCategoryId} AND p.status = '1' AND sp.store_id = ${storeId}`;

    const totalCountResult = await promisifyQuery(connection, countQuery);
    const totalCount = totalCountResult[0].total_count;
    const query = `SELECT  p.id as id, mp.name as product_name, p.product_image,p.unit,p.unit_qty, pc.category_id, cat.name as category_name,subCat.id as subcategory_id,subCat.sub_category, p.description,st.total_stock,st.b2b_stock,st.b2c_stock,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price,sp.discount
    FROM ${b2cDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.stock st ON st.product_id = p.id
    LEFT JOIN ${b2cDB}.product_category pc ON pc.product_id = p.id
    LEFT JOIN ${b2cDB}.subcategory subCat ON subCat.id = pc.subcategory_id
    LEFT JOIN ${b2cDB}.categories cat ON cat.id = pc.category_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    AND p.status = '1' AND sp.store_id = ${storeId}
    WHERE pc.subcategory_id = ${subCategoryId}
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

const ProductsBySubCategory = async (req, res) => {
  try {
    const errors = {};
    const subCategoryId = req.params.subcategoryId;
    const page = req.query.page || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const storeId = req.query.store || 2;


    const countQuery = `SELECT COUNT(*) as total_count
    FROM ${b2bDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
    INNER JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    WHERE subcat.id = ${subCategoryId} AND p.status = '1' `;

    const totalCountResult = await promisifyQuery(connection, countQuery);
    const totalCount = totalCountResult[0].total_count;

    const query = `SELECT  p.id as id, mp.name as product_name, REPLACE(p.product_image, '\"',"'") AS product_image, p.unit,p.unit_qty, cat.id as category_id, cat.name as category_name, subcat.id as subcategory_id, subcat.name as sub_category, p.description,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price,sp.discount
    FROM ${b2bDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.categories cat ON cat.id = mp.category_id
    LEFT JOIN ${b2bDB}.subcategories subcat ON subcat.id = mp.subcategory_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    WHERE mp.subcategory_id = ${subCategoryId} AND p.status = '1' AND sp.store_id = ${storeId}
    GROUP BY p.id order by mp.name asc
    LIMIT ${limit}
    OFFSET ${offset}`;

    /*
    const countQuery = `SELECT COUNT(*) AS total_count
    FROM ${b2cDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.stock st ON st.product_id = p.id
    LEFT JOIN ${b2cDB}.product_category pc ON pc.product_id = p.id
    LEFT JOIN ${b2cDB}.subcategory subCat ON subCat.id = pc.subcategory_id
    LEFT JOIN ${b2cDB}.categories cat ON cat.id = pc.category_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    WHERE pc.subcategory_id = ${subCategoryId} AND p.status = '1' AND sp.store_id = ${storeId}`;

    const totalCountResult = await promisifyQuery(connection, countQuery);
    const totalCount = totalCountResult[0].total_count;
    const query = `SELECT  p.id as id, mp.name as product_name, p.product_image,p.unit,p.unit_qty, pc.category_id, cat.name as category_name,subCat.id as subcategory_id,subCat.sub_category, p.description,st.total_stock,st.b2b_stock,st.b2c_stock,
    CASE cat.type WHEN 1 THEN "true"  ELSE "false" END AS IsVeg, p.gst, p.igst,sp.price,sp.offer_price,sp.discount
    FROM ${b2cDB}.products p
    LEFT JOIN ${b2bDB}.master_product mp ON mp.id = p.master_product_id
    LEFT JOIN ${b2bDB}.stock st ON st.product_id = p.id
    LEFT JOIN ${b2cDB}.product_category pc ON pc.product_id = p.id
    LEFT JOIN ${b2cDB}.subcategory subCat ON subCat.id = pc.subcategory_id
    LEFT JOIN ${b2cDB}.categories cat ON cat.id = pc.category_id
    LEFT JOIN ${b2cDB}.store_product_price sp ON sp.product_id = p.id AND sp.store_id=${storeId}
    AND p.status = '1' AND sp.store_id = ${storeId}
    WHERE pc.subcategory_id = ${subCategoryId}
    GROUP BY p.id order by mp.name asc
    LIMIT ${limit}
    OFFSET ${offset}`;
    */
    const products = await promisifyQuery(connection, query);
    // connection.end();
    const products2 = products.map(product => ({
      ...product,
      product_image: product.product_image.replace(/[\[\]']/g, '').split(','),
    }));

    res.json({
      status: 200,
      total_count: totalCount,
      result: products2,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const categoryListOld = (req, res) => {
  const errors = {};
  if (Object.keys(errors).length > 0) {
    res.send({
      "status": 401,
      "validation_error": errors,
    })
  } else {
    connection.query('SELECT *, CASE type WHEN 1 THEN "Veg" WHEN 2 THEN "Non-Veg" ELSE "OTHER" END AS categoryType from categories order by status asc ', (error, result) => {
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
  }



};

const categoryList = (req, res) => {
  const errors = {};
  if (Object.keys(errors).length > 0) {
    res.send({
      "status": 401,
      "validation_error": errors,
    })
  } else {
    connection.query(`SELECT *, CASE type WHEN 1 THEN "Veg" WHEN 2 THEN "Non-Veg" ELSE "OTHER" END AS categoryType from 
    ${b2bDB}.categories where status=1 order  by category_order asc  `, (error, result) => {
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
  }



};


const subCategoryListOld = (req, res) => {
  const errors = {};
  const categoryId = req.params.categoryId;
  if (Object.keys(errors).length > 0) {
    res.send({
      "status": 401,
      "validation_error": errors,
    })
  } else {
    connection.query(`SELECT sc.id, sc.category_id,c.name as category_name, sc.sub_category, sc.status from subcategory as sc
    LEFT JOIN  categories c ON c.id = sc.category_id where sc.status ="1" AND sc.category_id=${categoryId} order by sc.id asc `, (error, result) => {
      if (error) throw error;
      if (result.length > 0) {
        res.status(200).send({
          status: 200,
          "total_count": result.length,
          "result": result,
        });
      } else {
        res.status(401).send({
          status: 401,
          "message": "record not found",
        });
      }
    });
  }



};

const subCategoryList = (req, res) => {
  const errors = {};
  var buyer_category = req.params.categoryId;
  if (!buyer_category) {
    errors.buyer_category = ['buyer_category is required'];
  }



  if (Object.keys(errors).length > 0) {
    res.send({
      "status": 401,
      "validation_error": errors,
    });
  } else {

    // buyer_category = buyer_category.join(",");
    // Assuming buyer_category is an array of category IDs
    connection.query(
      `SELECT id, name, subcategory_code,image,background_color, type, CASE type WHEN 1 THEN "Veg" WHEN 2 THEN "Non-Veg" ELSE "OTHER" END AS categoryType from ${b2bDB}.subcategories where status = 1 AND category_id IN (${buyer_category}) order by categoryType desc`,
      (error, result) => {
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
      }
    );
  }
};


module.exports = {
  list,
  dashboardProductList,
  productById,
  ProductsBySearchString,
  categoryList,
  ProductsByCategory,
  subCategoryList,
  ProductsBySubCategory,
  dashboardOrganicDining
};
