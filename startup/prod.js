const helmet = require('helmet');
const compression = require('compression');

module.exports = function(app) {
    app.use(helmet());                                                                                                                                                                                                                              
    app.use(compression());
    app.response.jsonResponse = function (data,status_code,status_message) {
        // code is intentionally kept simple for demonstration purpose
        return this.contentType('application/json').status(status_code).send({ status: status_code == 200 ? "OK" : "FAIL", message: status_message, data: data });
    };
}
