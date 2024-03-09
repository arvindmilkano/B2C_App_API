const { connection } = require('../../models/connection');
const { promisify } = require('util');

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
    addSuggestions
};