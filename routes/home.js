const  express = require('express');
const router = express.Router();

// default request
router.get("/", async(req, res)=>{
    return res.status(200).send("App is running.....");
});


router.all("/sf/callback", async(req, res)=>{
    console.log("sf/callback===",req.params,req.query,req.body)
    return res.status(200).send("ok");
});


module.exports = router;