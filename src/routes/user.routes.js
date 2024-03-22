import { Router } from "express";
import {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,updateAvatar,updateCoverimage} from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();
router.post("/register", upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverimage', maxCount: 1 }
]), registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT,changeCurrentPassword);
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateAvatar);
router.route("/update-coverimage").patch(verifyJWT,upload.single("coverimage"),updateCoverimage);
export default router;
