const express = require("express");
const router = express.Router();
const notification = require("../../controllers/app/notification.controllers");
const  verify  = require("../../middleware/verify");
// router.use(verify)

router.get("/notificationlist/:filter",  notification.getNotification);
router.post("/details",  notification.notificationDetail);
module.exports = router;
