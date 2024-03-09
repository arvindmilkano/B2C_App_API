
const express = require("express");
const router = express.Router();
const suggestion = require("../../controllers/app/suggestions.controllers");



router.post("/add", suggestion.addSuggestions);

module.exports = router;
