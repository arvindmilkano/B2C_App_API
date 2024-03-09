const express = require("express");
const router = express.Router();

const app = require("./app");
router.use("/app", app);

// const admin = require("./admin");
// router.use("/admin", admin);

module.exports = router;
