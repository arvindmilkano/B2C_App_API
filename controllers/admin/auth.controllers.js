const { connection } = require('../../models/connection');
const jwtToken = require('../../helpers/jwtToken');
const util = require('util');
const promisify = util.promisify;

const login = async function (req, res) {
    const email = req.body.email;
    const password = req.body.password;
  
    const queryAsync = promisify(connection.query).bind(connection);
    const base64Password = Buffer.from(password).toString("base64");
    try {
      const userQuery = await queryAsync(
        'SELECT id, role_id FROM user WHERE email = ? AND password = ?',
        [email, base64Password]
      );
  
      if (userQuery.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const user = userQuery[0];  
      const userData = {
        user_id: user.id,
        email: email,
      };
  
      const authtoken = jwtToken.generateLogin(userData);
  
      return res.send({
        message: 'Login successfully',
        token: authtoken,
        // data: userData,
      });
    } catch (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };


module.exports = {
    login
  };