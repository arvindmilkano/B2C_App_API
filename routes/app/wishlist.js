var express = require("express");
const { addToWishlist, getWishlistByCustomerId, deleteWishlisttItem } = require("../../controllers/app/wishlistControllers");
var router = express.Router();
const { verify } = require("../../middleware/auth");

router.post("/addtowishlist",  addToWishlist);
router.get("/getByCustomerId/:id", getWishlistByCustomerId);
router.delete("/deleteWishlistItems/:id", deleteWishlisttItem);
module.exports = router;
