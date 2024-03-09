// const AWS = require('aws-sdk');
const { connection } = require('../../models/connection');
const { promisify } = require('util');
const config = require('../../config/env/development');
const b2bDB = process.env.B2BDATABASE;
const b2cDB = process.env.B2CDATABASE;


const getSubscription = async (req, res) => {
  const filter = req.params.categoryId;
  const queryAsync = promisify(connection.query).bind(connection);
  const storeId = 2;
  try {
    let query = `SELECT s.*,mp.name,p.product_image
      FROM ${b2cDB}.subscription s
      INNER JOIN ${b2cDB}.products p ON s.product_id = p.id
      INNER JOIN ${b2bDB}.master_product mp ON p.master_product_id = mp.id
      WHERE s.store_id=${storeId}  AND s.status = 1`;
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

// const getSubscriptionDetails = async (req, res) => {
//   const subscriptionId = req.params.subscriptionId;
//   const queryAsync = promisify(connection.query).bind(connection);
  
//   try {
//     let query = `
//       SELECT s.*, p.product_name,p.price
//       FROM subscription s
//       INNER JOIN products p ON s.product_id = p.id
//       WHERE s.is_deleted = 0 AND s.id = ?
//     `;    
//     const subscriptionLists = await queryAsync(query, [subscriptionId]);
    
//     res.json({ subscriptionDetails: subscriptionLists });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error." });
//   }
// };
const subscribe = async (req, res) => {
  const user_id = 2;
  const { subscription_id,product_id, customer_id ,frequencyJson} = req.body;
  const frequency_json = JSON.stringify(frequencyJson);
  const queryAsync = promisify(connection.query).bind(connection); 
  try {
    const query = `
    SELECT * FROM subscription
    WHERE id = ? AND product_id = ? AND is_deleted = 0;
  `; 
    const subscriptionPlans = await queryAsync(query, [subscription_id,product_id]); 
    if (subscriptionPlans && subscriptionPlans.length > 0) {
      // Check if the user has an existing subscription
    const existingSubscription = await queryAsync(
      'SELECT * FROM subscription_plans WHERE customer_id = ? AND product_id = ? AND subscription_id =? AND is_active = 0',
      [customer_id, product_id,subscription_id]
    );

    if (existingSubscription.length > 0) {
      return res.status(400).json({ error: 'User already subscribed to this subscription plan.' });
    }
      
      const insertQuery = `
      INSERT INTO subscription_plans (subscription_id,product_id,frequency_json,customer_id )
      VALUES (?, ?, ?, ?)
    `;
    await queryAsync(insertQuery, [subscription_id, product_id, frequency_json,customer_id]);

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




module.exports = {
    getSubscription, 
    // getSubscriptionDetails,
    subscribe,
    getExistingSubscription  
};