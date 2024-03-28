import User from "../models/userModel.js";
import Post from "../models/postModel.js";
import { v2 as cloudinary } from "cloudinary";

// createPost ----------------------------------------------------------------

const createPost = async (req, res) => {
  try {
    const { postedBy, text } = req.body;
    let { img } = req.body;

    if (!postedBy || !text) {
      return res.status(400).json({
        error: "postedby and text fields are required",
      });
    }
    const user = await User.findById(postedBy);

    if (!user) {
      return res.status(400).json({
        error: "user not found",
      });
    }

    if (user._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({
        error: "you are not authorized for this post",
      });
    }

    const maxLength = 500;
    if (text.length > maxLength) {
      return res.status(400).json({
        error: `Text must be less than ${maxLength} characters`,
      });
    }

    if (img) {
      const uploadResponse = await cloudinary.uploader.upload(img);
      img = uploadResponse.secure_url;
    }

    const newPost = await Post({ postedBy, text, img });

    await newPost.save();
    res.status(201).json({
      message: "Post created successfully",
      newPost,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Erorr in createPost", error.message);
  }
};

// getPost --------------------------------------------------------

const getPost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "id is required",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(400).json({
        error: "post not found",
      });
    }

    res.status(200).json({
      post,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Erorr in getPost", error.message);
  }
};

// deletePost --------------------------------------------------------------

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        error: "id is required",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(400).json({
        error: "post not found",
      });
    }

    if (post.postedBy.toString() !== req.user._id.toString()) {
      return res.status(400).json({
        error: "you are not authorized to delete this post",
      });
    }

    if (post?.img) {
      const imgId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    await Post.findByIdAndDelete(id);
    res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Erorr in deletePost", error.message);
  }
};

// likeUnlikePost --------------------------------------------------------------

const likeUnlikePost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id;

    if (!postId) {
      return res.status(400).json({
        error: "postId is required",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(400).json({
        error: "post not found",
      });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      // unlike the post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      res.status(200).json({
        message: "Post unliked successfully",
      });
    } else {
      // like the post
      await Post.updateOne({ _id: postId }, { $push: { likes: userId } });
      res.status(200).json({
        message: "Post liked successfully",
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Erorr in likeUnlikePost", error.message);
  }
};

// replToPost  ----------------------------------------------------------------

const replyToPost = async (req, res) => {
  try {
    const { text } = req.body;
    const { id: postId } = req.params;
    const userId = req.user._id;
    const userProfilePic = req.user.profilePic;
    const username = req.user.username;

    if (!postId) {
      return res.status(400).json({
        error: "postId is required",
      });
    }

    if (!text) {
      return res.status(400).json({
        error: "text is required",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(400).json({
        error: "post not found",
      });
    }

    const reply = { userId, text, userProfilePic, username };

    post.replies.push(reply);

    await post.save();

    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Erorr in replyToPost", error.message);
  }
};

// getFeedPost  --------------------------------------------------------

const getFeedPosts = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    const following = user.followings;

    const feedPosts = await Post.find({
      postedBy: { $in: following },
    }).sort({ createdAt: -1 });

    res.status(200).json(feedPosts);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Erorr in getFeedPosts", error.message);
  }
};

// getUserPosts ----------------------------------------------------------------------

const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        error: "username is required",
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const posts = await Post.find({ postedBy: user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Erorr in getUserPosts", error.message);
  }
};

export {
  createPost,
  getPost,
  deletePost,
  likeUnlikePost,
  replyToPost,
  getFeedPosts,
  getUserPosts,
};
