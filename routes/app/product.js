var express = require("express");
const { list, productById, ProductsBySearchString, categoryList, ProductsByCategory, subCategoryList, ProductsBySubCategory,dashboardProductList,dashboardOrganicDining } = require("../../controllers/app/product.controllers");
var router = express.Router();
const { verify } = require("../../middleware/auth");


router.get("/list",  list);
router.get("/dashboardProductList",  dashboardProductList);
router.get("/productById/:productId", productById);
router.get("/getbysearch", ProductsBySearchString);
router.get("/categoryList", categoryList);
router.get("/productsByCategory/:categoryId", ProductsByCategory);
router.get("/subCategoryList/:categoryId", subCategoryList);
router.get("/productsBySubCategory/:subcategoryId", ProductsBySubCategory);
router.get("/dashboardOrganicDining",  dashboardOrganicDining);



module.exports = router;
