var mysql      = require('mysql');
var config = require("../config/env/development")
var connection = mysql.createPool({
  connectionLimit : 100,
  host     : config.database.host,
  user     : config.database.username,
  password : config.database.password,
  database : config.database.databaseName,
});

connection.getConnection(function(err){

if(!err) {
    console.log("Database is connected ... ");
} else {
    console.log("Error connecting database ... ");
}

});

// module.exports = connection;

module.exports = {
	connection
}