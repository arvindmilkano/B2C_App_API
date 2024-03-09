const express = require("express");
const router = express.Router();
const auth = require("../../controllers/admin/auth.controllers");


router.post("/login", auth.login);

module.exports = router;
