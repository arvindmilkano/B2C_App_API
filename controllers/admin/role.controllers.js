const { connection } = require('../../models/connection');
const util = require('util');
const promisify = util.promisify;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const addRole = async (req, res) => {
    let loggedinUser =  req.user.user_id
    const { role_name } = req.body;

    if (!role_name) {
      return res.status(400).json({ error: "Missing  field" });
    }
    const queryAsync = promisify(connection.query).bind(connection);
    try {    
      const roleQuery = await queryAsync(
        `INSERT INTO role (role_name) VALUES (?)`,
        [role_name]
      );  
      res.json({ message: "Role added successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
};
const updateRole = async (req, res) => {
    const role_id = req.params.id;
    const { role_name } = req.body; 

    if (!role_name) {
      return res.status(400).json({ error: "Missing role_name field" });
    }
    const queryAsync = promisify(connection.query).bind(connection);
    try {    
      const roleQuery = await queryAsync(
        `UPDATE role SET role_name = ? WHERE id = ?`,
        [role_name,role_id]
      );  
      res.json({ message: "Role Updated successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
};
const getRole = async (req, res) => {
  const queryAsync = promisify(connection.query).bind(connection);  
  try {
      const query = "SELECT * FROM Role where is_deleted = 0 AND is_active = 1 ";
      const roleList = await queryAsync(query);
  
      res.json({ roleList });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
};
const updatePermission = async (req, res) => {
  const queryAsync = promisify(connection.query).bind(connection);
  try {
    const data = req.body;

    if (!data || !data.permissionJson || !data.role_id || !data.module_id) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const { role_id, module_id, permissionJson } = data;

    // Check if module_id exists in the modules table
    const moduleCheckQuery = "SELECT COUNT(*) AS moduleCount FROM modules WHERE id = ?";
    const moduleCheckParams = [module_id];
    const moduleCheckResult = await queryAsync(moduleCheckQuery, moduleCheckParams);

    if (moduleCheckResult[0].moduleCount === 0) {
      return res.status(400).json({ error: "module_id does not exist." });
    }
    const selectQuery =
      "SELECT * FROM role_permission_mapping WHERE role_id = ? AND module_id = ?";

    const selectParameters = [role_id, module_id];
    const existingRecord = await queryAsync(selectQuery, selectParameters);

    if (existingRecord.length === 0) {
      const insertQuery =
        "INSERT INTO role_permission_mapping (role_id, module_id, permission) VALUES (?, ?, ?)";
      const insertParameters = [role_id, module_id, JSON.stringify(permissionJson)];
      await queryAsync(insertQuery, insertParameters);
    } else {
      // If an existing record found, update it
      const updateQuery =
        "UPDATE role_permission_mapping SET permission = ? WHERE role_id = ? AND module_id = ?";

      const updateParameters = [JSON.stringify(permissionJson), role_id, module_id];
      await queryAsync(updateQuery, updateParameters);
    }

    res.json({ message: "Permission added or updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};


  
module.exports = {
  addRole,
  updateRole,
  updatePermission,
  getRole
  };