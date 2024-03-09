const express = require("express");
const router = express.Router();
const common = require("../../controllers/app/common.controllers");
const { verify } = require("../../middleware/auth");

router.post("/getDeliveryCharge",  common.getDeliveryCharge);
router.post("/getDashboardProduct",  common.getDashboardProduct);
router.get("/getFlashDeal",  common.flashDealList);

module.exports = router;
