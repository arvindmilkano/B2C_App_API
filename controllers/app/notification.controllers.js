const { connection } = require('../../models/connection');
const { promisify } = require('util');
const config = require('../../config/env/development');


const getNotification = async (req, res) => {
  // let user_id =  req.user.user_id;
  const filter = req.params.filter;
  const queryAsync = promisify(connection.query).bind(connection);
  try { 
    let query = "SELECT * FROM notification WHERE is_deleted = 0";
    const queryParams = [];
    
    if (filter === 'expire') {
      query += " AND expiration_date < NOW()";
    } else if (filter !== 'all') {
      query += " AND type = ?";
      queryParams.push(filter);
    }

    const notificationLists = await queryAsync(query, queryParams);
    res.json({ notificationList: notificationLists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};

  
const notificationDetail = async (req, res) => {
  const { customer_id , notification_id} = req.body;
  const queryAsync = promisify(connection.query).bind(connection);
  try {
    const query = "Insert into user_notification (customer_id,notification_id,is_read)values(?,?,?)";
     await queryAsync(query,[customer_id,notification_id,1]);
    res.json({message: 'Notification read successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};


module.exports = {
    getNotification,
    notificationDetail,
    
};