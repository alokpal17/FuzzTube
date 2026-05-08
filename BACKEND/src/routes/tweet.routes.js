import { Router } from 'express';
import {
    getAllTweets,
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controllers.js"
import {
    addTweetComment,
    deleteTweetComment,
    getTweetComments,
} from "../controllers/tweetComment.controllers.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").get(getAllTweets).post(createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

// Tweet comments
router.route("/:tweetId/comments").get(getTweetComments).post(addTweetComment);
router.route("/comments/:commentId").delete(deleteTweetComment);

export default router