var express = require("express");
/*
const { getCartByCustomerId, addToCart, deleteCartItem, getCheckoutItem,  confirmPayment, getRepayment } = require("../../controllers/app/cartControllers");
*/

const { addToCart, getCartByCustomerId, deleteCartItem,getCheckoutItem, confirmPayment, getRepayment } = require("../../controllers/app/cartControllers");
var router = express.Router();
const { verify } = require("../../middleware/auth");

router.post("/addtocart",  addToCart);
router.get("/getByCustomerId/:id", getCartByCustomerId);
router.delete("/deleteCartItems/:id", deleteCartItem);
router.post("/checkout", getCheckoutItem);
router.post("/getTransStatus", confirmPayment);
router.post ("/getRepayment", getRepayment);

/*
router.get("/getByCustomerId/:id", verify,getCartByCustomerId);


router.post ("/getRepayment", verify, getRepayment);
*/
module.exports = router;
