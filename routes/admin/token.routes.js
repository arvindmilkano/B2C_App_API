const express = require("express");
// const auth = require("../app/auth.routes");
const router = express.Router();
const user = require("../../controllers/admin/user.controllers");
const modules = require("../../controllers/admin/module.controllers");
const role = require("../../controllers/admin/role.controllers");

const verify = require("../../middleware/auth");
router.use(verify)

// user routes---------------------------------
router.post("/user/add", user.addUser);
router.patch("/user/update/:id", user.updateUser);
router.get("/user/get", user.getUser);

// module routes---------------------------------
router.post("/module/add", modules.addModule);
router.get("/module/get", modules.getModule);

// role routes---------------------------------
router.post("/role/add", role.addRole);
router.patch("/role/update/:id", role.updateRole);
router.get("/role/get", role.getRole);
router.post("/role/updatepermission", role.updatePermission);

module.exports = router;
