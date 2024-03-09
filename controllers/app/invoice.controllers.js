const { connection } = require('../../models/connection');
const { promisify } = require('util');

const downloadInvoice = async (req, res) => {
  const queryAsync = promisify(connection.query).bind(connection);
  try{

  }catch(err){

  }
};

module.exports = {
    downloadInvoice
};