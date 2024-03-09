const express = require("express");
const router = express.Router();
const subscription = require("../../controllers/app/subscription.controllers");
const { verify } = require("../../middleware/auth");


router.get("/productlist/:categoryId",  subscription.getSubscription);
router.get("/subscriptiondetails/:store_id/:subscriptionId",  subscription.getSubscriptionDetails);
router.post("/subscribe",  subscription.subscribe);
router.get("/subscriptionlist/:customerId",  subscription.getExistingSubscription);
router.post("/checkout", subscription.getCheckoutItem);

router.get("/getOrder/:id/:storeId",  subscription.orderList);
router.post("/getOrderDetail",   subscription.getOrderDetail);


module.exports = router;
