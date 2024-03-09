const config = require('./../config');
const iplocation = require('iplocation');
const info = require('info');

async function getIpLocation(req){
    return new Promise(function(resolve, reject) {
        let ip;
        if(req.body.ip && req.body.ip != null) {
            ip = req.body.ip;
        } else {
            ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null);
        }
        let machine_info = ""//info(req);
        let iplocations={};
        if (!(ip == '::1' || ip == null || ip == '127:0:0:1')) {
            iplocation(ip).then((location) => {
                iplocations.ip =  ip;
                iplocations.city =  location.city;
                iplocations.latitude = location.latitude;
                iplocations.longitude = location.longitude;
                iplocations.machine_info =  machine_info.ua.ua;
                req.iplocation=iplocations;
                resolve(iplocations)
            }).catch(function (error) {
                iplocations.ip =  ip;
                iplocations.city =  "";
                iplocations.latitude = "";
                iplocations.longitude = "";
                iplocations.machine_info = "";
                req.iplocation=iplocations;
                resolve(iplocations)
            });
        }
        else
        {
            iplocations.ip =  ip;
            iplocations.city =  "";
            iplocations.latitude = "";
            iplocations.longitude = "";
            iplocations.machine_info = "";
            req.iplocation=iplocations;
            resolve(iplocations)
        }
    });
}


module.exports = {
    getIpLocation
};