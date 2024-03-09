
const express = require("express");
const router = express.Router();
const coupon = require("../../controllers/app/coupon.controllers");
const { verify } = require("../../middleware/auth");



router.get("/couponlist", coupon.getCouponList);
router.get("/coupondetails/:couponId", coupon.couponDetail);
router.post("/applycoupon", coupon.applyCoupon);

module.exports = router;
