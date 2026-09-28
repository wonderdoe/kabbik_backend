const router = require("express").Router();
const BlogController = require("../../controllers/blog-controller");
const authorize = require("../../middlewares/auth-middleware");
const authorizeAdmin = require("../../middlewares/auth-admin-middleware");

router.get("/", BlogController.getAll);
router.post("/create", BlogController.create);
router.get("/:id", BlogController.getById);
router.get("/find/:slug", BlogController.getApprovedBySlug);
router.patch("/update/:id", BlogController.update);
router.patch("/toggle-approved/:id", BlogController.toggle);
router.delete("/delete/:id", BlogController.delete);

module.exports = router;
