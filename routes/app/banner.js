const express = require("express");
const router = express.Router();
const banner = require("../../controllers/app/banner.controllers");
const { verify } = require("../../middleware/auth");


router.get("/getbanner",  banner.getBanner);
router.get("/productlist/:bannerId",  banner.getProductList);

module.exports = router;
