const express = require("express");
const router = express.Router();
const customer = require("../../controllers/app/customer.controllers");
const { verify } = require("../../middleware/auth");


router.get("/customerDetail/:id",  customer.getCustomer);
router.post("/saveAddress", customer.saveAddress);
router.get("/customerAddress/:id",  customer.getAddress);
router.post("/updateDefaultAddress", customer.updateDefaultAddress);
router.post("/updateAddress", customer.updateAddress);





module.exports = router;
