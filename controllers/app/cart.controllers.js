// const AWS = require('aws-sdk');
const { connection } = require('../../models/connection');
const { promisify } = require('util');
const config = require('../../config/env/development');


const addToCart = async (req, res) => {
    const queryAsync = promisify(connection.query).bind(connection);
    try {
      const {
        customer_id,
        product_details,
      } = req.body;
      const productDetailsJSON = JSON.stringify(product_details);
  
      const query = "INSERT INTO cart (customer_id, product_details) VALUES (?, ?)";
      await queryAsync(query, [customer_id, productDetailsJSON]);
  
      res.status(200).json({ message: "Item added to cart successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
  };
  
  const updateCart = async (req, res) => {
    const queryAsync = promisify(connection.query).bind(connection);
    try {
      const { customer_id, cart_id, product_details } = req.body;
      const productDetailsJSON = JSON.stringify(product_details);
  
      const updateQuery = "UPDATE cart SET product_details = ? WHERE customer_id = ? AND id = ?";
      await queryAsync(updateQuery, [productDetailsJSON, customer_id, cart_id]);
  
      res.status(200).json({ message: "Cart updated successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
  };
  
  const cartDetails = async (req, res) => {
    const queryAsync = promisify(connection.query).bind(connection);
    try {
      const customer_id = req.params.customerId;
      const query = "SELECT * FROM cart WHERE customer_id = ? AND is_deleted = 0 AND cart_status = 1";
      const cartDetails = await queryAsync(query, [customer_id]);
  
      if (cartDetails.length === 0) {
        res.status(404).json({ error: "Cart not found." });
      } else {
        const { id, product_details } = cartDetails[0]; // Assuming you only expect one cart for a customer
        const productDetailsJSON = JSON.parse(product_details);
  
        res.status(200).json({
          id,
          customer_id,
          product_details: productDetailsJSON, // Return the parsed product_details
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
  };
  
  
module.exports = {
    addToCart,
    updateCart,
    cartDetails
};