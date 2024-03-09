const { connection } = require('../../models/connection');
const { promisify } = require('util');
const config = require('../../config/env/development');



const addRatingReview = async (req, res) => {
  const queryAsync = promisify(connection.query).bind(connection);
  const { customer_id ,order_id, rating, review } = req.body;
  try {
    const query = "Insert into rating (customer_id,order_id,rating,review)values(?,?,?,?)";
    await queryAsync(query,[customer_id,order_id,rating,review]);
    res.status(201).json({ message: 'Order rated successfully' });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};

const addSuggestions = async (req, res) => {
  const queryAsync = promisify(connection.query).bind(connection);
  const { customer_id , description} = req.body;
  try {
    const query = "Insert into suggestions (customer_id,description)values(?,?)";
    await queryAsync(query,[customer_id,description]);
    res.status(201).json({ message: 'Suggestion added successfully' });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};
module.exports = {
    addRatingReview,
    addSuggestions
};