// development.js

module.exports = {
  database: {
    host: process.env.HOST,
    username: process.env.USER,
    password: process.env.PASSWORD,
    databaseName: process.env.DATATBASE,
  },

jwtKey:process.env.JWT_PRIVATEKEY
};




