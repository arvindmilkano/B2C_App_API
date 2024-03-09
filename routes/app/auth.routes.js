const express = require("express");
const router = express.Router();
const auth = require("../../controllers/app/auth.controllers");
//const messageTemplate = require("../../controllers/app/templateControllers");
//const { verify } = require("../../middleware/auth");

router.post("/login", auth.login);
router.post("/logout", auth.logout);
router.post("/otpverify", auth.verifyOtp);
router.post("/resendotp", auth.resendotp);
router.post("/updateProfile", auth.updateProfile);
router.post("/searchAndSaveLocation",  auth.findLocation);





module.exports = router;
