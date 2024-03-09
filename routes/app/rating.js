
const express = require("express");
const router = express.Router();
const rating = require("../../controllers/app/rating.controllers");



router.post("/addreview", rating.addRatingReview);
router.post("/addsuggestion", rating.addRatingReview);

module.exports = router;
