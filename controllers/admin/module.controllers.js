const { connection } = require('../../models/connection');
const util = require('util');
const promisify = util.promisify;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const addModule = async (req, res) => {
    let loggedinUser =  req.user.user_id
    const { module_name } = req.body;

    if (!module_name) {
      return res.status(400).json({ error: "Missing  field" });
    }
    const queryAsync = promisify(connection.query).bind(connection);
    try {    
      const moduleQuery = await queryAsync(
        `INSERT INTO modules (module_name,created_by) VALUES (?, ?)`,
        [module_name,loggedinUser]
      );  
      res.json({ message: "Module added successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
};
const getModule = async (req, res) => {
  const queryAsync = promisify(connection.query).bind(connection);  
  try {
      const query = "SELECT * FROM modules where is_deleted = 0 AND is_active = 1 ";
      const moduleList = await queryAsync(query);
  
      res.json({ moduleList });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
};
  
module.exports = {
  addModule,
  getModule
  };