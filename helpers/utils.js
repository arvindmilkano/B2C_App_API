const config = require('../config');
const axios = require('axios');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const CryptoJS = require("crypto-js");
const setCookie = require('set-cookie-parser');
const base64 = require('base-64');
const pool = require('../models/pgconnection');
var crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3';
const iv = crypto.randomBytes(16);
const { getEmailTemplate } = require('../models/utils.model');
const mail = require('../helpers/mail');
const { validate } = require('../helpers/validation');
//const {startDynamicCronJob} = require('../triggerjob/dynamicCron.job');
/**
 * Encrypt String
 * @param {*} text 
 */
function encrypt(text) {
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
        iv: iv.toString('base64'),
        content: encrypted.toString('base64')
    };

}

/**
 * Decrypt string
 * @param {*} text 
 */
function decrypt(hash, IV) {
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(IV, 'base64'));
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash, 'base64')), decipher.final()]);
    return decrpyted.toString();
}

function returnStatus(res, data, status_code = 404, status_message = 'Invalid data') {
    res._response = {};
    res._response.status = status_code
    res._response.message = status_message
    cud_logs(res)
    //if(!data) return res.status(status_code || 404).send({status:'ERROR', 'message': status_message});
    return res.status(status_code).send({ status: status_code == 200 ? "OK" : "FAIL", message: status_message, data: data });
}

async function adminLogger(req, payload) {
    payload[0]['accessed_url'] = req.originalUrl;
    if(req.user) {
        let logged_by_user_id = req.user.admin_id ? req.user.admin_id : 0;
        let firstname = req.user.firstname ? req.user.firstname : '';
        let lastname = req.user.lastname ? req.user.lastname : '';
        payload[0]['logged_by_user_id'] = logged_by_user_id;
        payload[0]['logged_by_user_name'] = `${firstname} ${lastname}`;
    }
    if (payload) {
        await pool.executeBulkQuery(`SELECT * FROM fn_admin_log_tbl_add_update($1::json)`, payload);
    }
}

async function userLogger(req, payload) {
    payload[0]['accessed_url'] = req.originalUrl;
    if(req.user) {
        let logged_by_user_id = req.user.user_id ? req.user.user_id : 0;
        let firstname = req.user.firstname ? req.user.firstname : '';
        let lastname = req.user.lastname ? req.user.lastname : '';
        payload[0]['logged_by_user_id'] = logged_by_user_id;
        payload[0]['logged_by_user_name'] = `${firstname} ${lastname}`;
    }
    if(payload) {
        await pool.executeBulkQuery(`SELECT * FROM fn_user_log_tbl_add_update($1::json)`, payload);
    }
}

function IsJsonString(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return false;
    }
}

async function handleTestEntry(table, data, flag = 1) {
    return new Promise(async function (resolve, reject) {
        try {
            let query = '';
            let result = null;
            if (flag == 1) {
                query = `insert into public.${table} `;
                let field = '';
                let value = '';
                for (let [k, v] of Object.entries(data)) {
                    field += k + ',';
                    value += typeof v == 'number' ? v + ',' : `'${v}',`;
                }
                field = field.replace(/,\s*$/, "");
                value = value.replace(/,\s*$/, "");
                query += `(${field}) values (${value}) `
                result = await pool.executeQuery(query, [])
                resolve(true)
            } else {
                query = `delete from public.${table} `;
                let where = 'where ';
                for (let [k, v] of Object.entries(data)) {
                    let value = typeof v == 'number' ? v : `'${v}'`;
                    where += `${k}=${value} and `;
                }
                query += where.replace(/and\s*$/, "")
                result = await pool.executeQuery(query, [])
                resolve(true)
            }
        } catch (error) {
            console.log("error=", error)
        }

    })
}

function pgFormat(values) {
    if (Array.isArray(values)) {
        return `'${values.join("','")}'`;
    }
    return null;
}

function getDateTime(date, format) {
    let DD = "";
    let MM = "";
    let HH = "";
    let Minutes = "";
    let SS = "";
    if (date) {
        DD = (date.getDate() < 10 ? '0' : '') + date.getDate();
        MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
        HH = (date.getHours() < 10 ? '0' : '') + date.getHours();
        Minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
        SS = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
    }
    if (date && format === "MM/DD/YYYY HH:MM") {
        return `${MM}/${DD}/${date.getFullYear()} ${HH}:${Minutes}`;
    } else if (date && format === "YYYY-MM-DD") {
        return `${date.getFullYear()}-${MM}-${DD}`;
    } else if (date && format === "YYYY-MM-DD HH:MM:SS") {
        return `${date.getFullYear()}-${MM}-${DD} ${HH}:${Minutes}:${SS}`;
    } else if (!date && format) {
        return "";
    } else {
        let d = new Date();
        let amOrPm = (d.getHours() < 12) ? "AM" : "PM";
        let hour = (d.getHours() < 12) ? d.getHours() : d.getHours() - 12;
        hour = (hour < 10 ? '0' : '') + hour;
        let DD = (d.getDate() < 10 ? '0' : '') + d.getDate();
        let MM = ((d.getMonth() + 1) < 10 ? '0' : '') + (d.getMonth() + 1);
        let Minutes = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
        let SS = (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();
        return `${MM}/${DD}/${d.getFullYear()} ${hour}:${Minutes}:${SS} ${amOrPm}`;
    }
}

function escapeSingleQuote(value) {
    return value.replace(/'/g, "''");
}

function sysErrorLog(error, filename, is_cronjob = false) {
    let funcName = sysErrorLog.caller.name;
    let errorLog = escapeSingleQuote(error.stack);
    let errorQuery = error.query != undefined ? escapeSingleQuote(error.query) : '';
    let query = `INSERT INTO public.sys_error_log(
        error_log, error_query, error_function, error_file, is_cronjob)
        VALUES ('${errorLog}', '${errorQuery}', '${funcName}', '${filename}',${is_cronjob});`;
    (async () => {
        await pool.executeQuery(query, []);
        if (is_cronjob && (errorLog.indexOf('Request failed with status code 500') > -1 || errorLog.indexOf('Request failed with status code 415') > -1)) {
            //if(is_cronjob && errorLog.indexOf('Request failed with status code 500')>-1){
            let updateQuery = `UPDATE public.myob_cron
                SET scheduled=false
                WHERE apiname='${funcName}' RETURNING *;`;
            let result = await pool.executeQuery(updateQuery, []);
            //console.log('result.rows==',result.rows)
            let cronName = []
            for (let [count, item] of result.rows.entries()) {
                cronName.push(item.name)
            }
            let CRON_NAME = cronName.join(",");
            let to = "rupesh.s@aditatechnologies.com";
            let resultMail = await pool.executeQuery(`select * from email_tempate_tbl where temp_name='Cron job Stop'`, []);
            let subject = resultMail.rows[0]['temp_subject'].replace('{CRON_NAME}', CRON_NAME);
            let body = resultMail.rows[0]['temp_body'].replace('{CRON_NAME}', CRON_NAME);
            mail.send(to, subject, body)
        }
    })();
}

function filterSingleQoute(data) {
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            data[key] = typeof data[key] == 'string' && data[key].indexOf("'") > -1 ? data[key].split("'").join("''") : data[key];
        }
    }
    return data;
}

async function customAxios(option, erroHandel) {
    return new Promise(async function (resolve, reject) {
        try {
            let response = await axios(option)
            resolve(response)
        } catch (error) {
            error.item = erroHandel
            reject(error)
        }
    })
}

async function multipleLoginAttempt(email) {
    return new Promise(async function (resolve, reject) {
        try {
           /* let querys = `SELECT failure_login_time, failure_login_attempt,blocked_time from public.admin_tbl where email='${email}'`
            let result = await pool.executeQuery(querys, []);
            let failure_attempt = "";
            if (result.rows[0].failure_login_time != null && result.rows[0].failure_login_attempt != null && result.rows[0].failure_login_attempt < 3) {
                failure_attempt = parseInt(result.rows[0].failure_login_attempt) + (parseInt(1));
                let query = `UPDATE public.admin_tbl SET failure_login_attempt=${failure_attempt} where email='${email}'`
                await pool.executeQuery(query, []);
                resolve(false);
            } else if (result.rows[0].failure_login_time != null && result.rows[0].failure_login_attempt != null && result.rows[0].failure_login_attempt == 3) {
                let query = `UPDATE public.admin_tbl SET failure_login_attempt=3, blocked_time= 30 where email='${email}' RETURNING failure_login_attempt,blocked_time`;
                let res = await pool.executeQuery(query, []);
                let mainObj = { 'message': `User blocked for ${res.rows[0].blocked_time} minutes` }
                let tempResult = await getEmailTemplate(8);
                let to = email;
                let subject = tempResult['temp_subject'];
                let body = tempResult['temp_body'];
                mail.send(to, subject, body);
                resolve(mainObj);
            } else {
                let query = `UPDATE public.admin_tbl SET failure_login_time=now(),failure_login_attempt=1 where email='${email}'`
                await pool.executeQuery(query, []);
                resolve(false);
            }*/
        } catch (error) {
            reject(error);
        }
    });
}


function setPGValue(value){
    return value==undefined || value==null?null:`'${escapeSingleQuote(value)}'`;
}

/* Object.prototype.getSqlVal = function (key) {
    return this[key]==undefined || this[key]==null?null:`'${this[key]}'`;
}; */

async function cud_logs(res) {
    try {
        if(res.logdata!=undefined && res.logdata!=null && res.logdata!=""){
            let url=res.logdata.url
            let log_type = res.logdata.curd_log.log_type;
            let log_name = res.logdata.curd_log.log_name;
            let user_type = res.logdata.curd_log.user_type;
            let log_desc = res.logdata.curd_log.log_desc || '';
            let method = res.logdata.curd_log.method
            let machine_info = res.logdata.os;
           // let os_name = res.logdata.os.split(' ')[0]
            let usertype = 'app';
            // console.log({os_name},{machine_info},res.logdata)
            let userid = 0;
            let ipaddress = res.logdata.remote_addr;
            let location = '';
            let lat = '';
            let longit = '';
            let browser_info = res.logdata.userAgent;
            let app_version = res.logdata.app_version;
            let device_details = res.logdata.device_details;
            /* if(app_version == '0' && device_details == ''){
                if(machine_info.toLowerCase().indexOf('ios') > -1 || machine_info.toLowerCase().indexOf('android') > -1){
                    usertype = 'app';
                }else{
                    usertype = 'web';
                }
            }else{
                usertype = 'web';
            } */
           
            let deviceinfo = machine_info.split(' ')[0];
            if(app_version == '0' && device_details == '' && deviceinfo != 'iOS' && deviceinfo != 'Android'){
                usertype = user_type=='frontend'?'web':'admin';
            }
    
            let json_log = '';
            if(log_type=='login'){
                userid =res._response !=undefined && res._response.data !=undefined && res._response.data.user_id !=undefined ? res._response.data.user_id:0;
                // location = res.responseData.userData.iplocation.city;
                // lat = res.responseData.userData.iplocation.latitude;
                // longit = res.responseData.userData.iplocation.longitude;
                json_log = escapeSingleQuote(JSON.stringify({request:{},response:res._response}));
            }else if(log_type=='reset-password' || log_type=='change-password' || log_type=='verifcaltion'){
                json_log = JSON.stringify({request:{},response:res._response});
            }else{
                if(user_type=='frontend' && res.user != undefined && res.user != ""){
                    userid = res.user!=undefined && res.user.user_id!=undefined?res.user.user_id:0;
                }else if(user_type=='backend'){
                    userid = res.user!=undefined && res.user.admin_id!=undefined?res.user.admin_id:0;
                }if(res.user == undefined || res.user == ""){
                    userid = res.logdata.xauthUser != "" && user_type=='frontend'? res.logdata.xauthUser.user_id : 0 ;
                }
            
                // location = res.user.iplocation.city;
                // lat = res.user.iplocation.latitude;
                // longit = res.user.iplocation.longitude;
                // console.log(res.logdata.json_log)
                /* if(res._response.status==200){
                    json_log = escapeSingleQuote(JSON.stringify({request:res.logdata.json_log,response:{}}));
                }else{
                    json_log = escapeSingleQuote(JSON.stringify({request:res.logdata.json_log,response:res._response}));
                } */
                json_log = escapeSingleQuote(JSON.stringify({request:res.logdata.json_log,response:res._response}));
            }
            
            let query = `INSERT INTO public.logs_tbl(
                user_id, 
                usertype, 
                log_type, 
                log_name, 
                ipaddress, 
                location, 
                lat, 
                longit, 
                browser_info, 
                machine_info, 
                json_log,
                app_version,
                device_details, 
                created_by, 
                created_dt,
                accessed_url,
                log_desc,
                method
            ) VALUES (
                ${userid}, 
                '${usertype}', 
                '${log_type}', 
                '${log_name}', 
                '${ipaddress}', 
                '${location}', 
                '${lat}', 
                '${longit}', 
                '${browser_info}', 
                '${machine_info}', 
                '${json_log}',
                '${app_version}',
                '${escapeSingleQuote(device_details)}',
                ${userid}, 
                now(),
                '${url}',
                '${log_desc}',
                '${method}'
            );`;
            //  console.log(query)
            await pool.executeQuery(query, []);
        }
    } catch (error) {
        console.log("cud_logs==",error.stack)
    }
}
module.exports = {
    encrypt,
    decrypt,
    returnStatus,
    IsJsonString,
    handleTestEntry,
    pgFormat,
    escapeSingleQuote,
    sysErrorLog,
    filterSingleQoute,
    getDateTime,
    customAxios,
    adminLogger,
    multipleLoginAttempt,
    userLogger,
    setPGValue,
    cud_logs
}

