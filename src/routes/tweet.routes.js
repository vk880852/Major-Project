import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT);

router.route("/tweet").post(createTweet);
router.route("/tweet/user/:userId").get(getUserTweets);
router.route("/tweet/:tweetId").patch(updateTweet).delete(deleteTweet);

export default router