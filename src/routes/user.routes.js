import { Router } from "express";
import {registerUser,loginUser} from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js';
const router = Router();
router.post("/register", upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverimage', maxCount: 1 }
]), registerUser);
router.route("/login").post(loginUser);


export default router;
