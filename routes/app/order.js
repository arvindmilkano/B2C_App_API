var express = require("express");
var router = express.Router();
const { orderList, getOrderDetail } = require("../../controllers/app/orderController");
/* POST checkout */
const { verify } = require("../../middleware/auth");

router.get("/getOrder/:id/:storeId",  orderList);
router.post("/getOrderDetail",   getOrderDetail);



module.exports = router;
