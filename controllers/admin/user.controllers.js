const { connection } = require('../../models/connection');
const util = require('util');
const promisify = util.promisify;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const addUser = async (req, res) => {
    let loggedinUser =  req.user.user_id
    console.log(loggedinUser)
    const queryAsync = promisify(connection.query).bind(connection);
    try {
      const { name, email, mobile_number ,password,type,role_id,address } = req.body;
      
      if (!name || !email || !mobile_number || !type || !password || !role_id ) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (!emailPattern.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      // Check if the email already exists
      const existingUserQuery = await queryAsync('SELECT COUNT(*) AS count FROM user WHERE email = ? AND is_deleted = 0 AND is_active = 1' , [email]);
      const existingUserCount = existingUserQuery[0].count;
      if (existingUserCount > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    
      // Convert the password to base64
      const base64Password = Buffer.from(password).toString("base64");
      const userQuery = await queryAsync(
        `INSERT INTO user (name, email, mobile_number, type, password,address, role_id,created_by) VALUES (?, ?, ?,?,?,?,?,?)`,
        [name, email, mobile_number,type,base64Password,address,role_id,loggedinUser]
      );  
      res.json({ message: "User added successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
};

const updateUser = async (req, res) => {
    const userId = req.params.id;
    const queryAsync = promisify(connection.query).bind(connection);
    try {
      const { name, type,role_id, address } = req.body;
      
      if (!name  || !type || !role_id || !address) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const userQuery = await queryAsync(
        `UPDATE user SET name = ?,type = ?,role_id = ?,address = ? WHERE id = ?`,
        [name, type,role_id,address,userId]
      );  
      res.json({ message: "User updated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
};

const getUser = async (req, res) => {
  const queryAsync = promisify(connection.query).bind(connection);  
  try {
      const query = "SELECT * FROM user where is_deleted = 0 AND is_active = 1 ";
      const userList = await queryAsync(query);
  
      res.json({ userList });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
};
  
module.exports = {
  addUser,
  updateUser,
  getUser
  };