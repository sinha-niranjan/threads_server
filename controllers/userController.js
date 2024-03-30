import User from "../models/userModel.js";
import Post from "../models/postModel.js";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../utils/generateTokenAndSetCookie.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

// getUserProfile  ----------------------------------------------------------------

const getUserProfile = async (req, res) => {
  try {
    // we will fetch user profile either with username or userId
    // query is either username or userId
    const { query } = req.params;

    let user;

    // quey is userid
    if (mongoose.Types.ObjectId.isValid(query)) {
      user = await User.findById(query)
        .select("-password")
        .select("-updatedAt");
    } else {
      user = await User.findOne({ username: query })
        .select("-password")
        .select("-updatedAt");
    }

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    return res.status(200).json({
      user: user,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Error in getUserProfile : " + error.message);
  }
};

// singupUser ----------------------------------------------------------------

const signupUser = async (req, res) => {
  try {
    const { name, email, password, username } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name,
      email: email,
      password: hashedPassword,
      username: username,
    });

    await newUser.save();

    if (newUser) {
      generateTokenAndSetCookie(newUser._id, res);
      return res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        bio: newUser.bio,
        profilePic: newUser.profilePic,
      });
    } else {
      return res.status(400).json({ error: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Error in signupUser : " + error.message);
  }
};

// loginUser ----------------------------------------------------------------

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username });

    if (!user) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user?.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    if (user.isFrozen) {
      user.isFrozen = false;
      await user.save();
    }

    generateTokenAndSetCookie(user._id, res);

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio,
      profilePic: user.profilePic,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Error in loginUser : " + error.message);
  }
};

// logoutUser ----------------------------------------------------------------

const logoutUser = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 1 });
    res.status(200).json({
      error: "Successfully logged out",
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Error in logoutUser : " + error.message);
  }
};

// followUnFollowUser ----------------------------------------------------------------

const followUnFollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userToModify = await User.findById(id);
    const currentUser = await User.findById(req.user._id);

    if (id == req.user._id.toString()) {
      return res
        .status(400)
        .json({ error: "You cannot follow/unfollow yourself" });
    }

    if (!userToModify || !currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    const isFollowing = currentUser.followings.includes(id);

    if (isFollowing) {
      // unfollow user
      // Modify current user following , modify followers of userToModify
      await User.findByIdAndUpdate(req.user._id, { $pull: { followings: id } });
      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
      return res.status(200).json({ message: "User unfollowed successfully " });
    } else {
      // Follow user
      await User.findByIdAndUpdate(req.user._id, { $push: { followings: id } });
      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
      return res.status(200).json({ message: "User followed successfully " });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Error in followUnFollowUser : " + error.message);
  }
};

// updateUser --------------------------------------------------------------

const updateUser = async (req, res) => {
  try {
    const { name, email, username, password, bio } = req.body;
    let { profilePic } = req.body;
    const userId = req.user._id;

    let user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (req.params.id !== userId.toString()) {
      return res
        .status(400)
        .json({ error: "You are not authorized to update this user" });
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user.password = hashedPassword;
    }

    if (profilePic) {
      if (user.profilePic) {
        await cloudinary.uploader.destroy(
          user.profilePic.split("/").pop().split(".")[0]
        );
      }
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      profilePic = uploadResponse.secure_url;
    }
    user.name = name || user.name;
    user.email = email || user.email;
    user.username = username || user.username;
    user.profilePic = profilePic || user.profilePic;
    user.bio = bio || user.bio;
    user = await user.save();

    // Find all posts that this user replied and update username and userProfilePic fields

    await Post.updateMany(
      { "replies.userId": userId },
      {
        $set: {
          "replies.$[reply].username": user.username,
          "replies.$[reply].userProfilePic": user.profilePic,
        },
      },
      {
        arrayFilters: [{ "reply.userId": userId }],
      }
    );

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio,
      profilePic: user.profilePic,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Error in updateUser : " + error.message);
  }
};

// getSuggestedUsers --------------------------------------------------------

const getSuggestedUsers = async (req, res) => {
  try {
    // exclude the current uesr from suggested users array , exclude users that current user is already following

    const userId = req.user._id;

    const usersFollowedByYou = await User.findById(userId).select("followings");

    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
        },
      },
      {
        $sample: { size: 10 },
      },
    ]);

    const filteredUsers = users.filter(
      (user) => !usersFollowedByYou.followings.includes(user._id)
    );

    const suggestedUsers = filteredUsers.slice(0, 5);

    suggestedUsers.forEach((user) => (user.password = null));

    res.status(200).json(suggestedUsers);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Error in getSuggestedUsers : " + error.message);
  }
};

// freezeAccount --------------------------------------------------------------

const freezeAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    user.isFrozen = true;
    await user.save();

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
    console.log("Error in freezeAccount : " + error.message);
  }
};

export {
  signupUser,
  loginUser,
  logoutUser,
  followUnFollowUser,
  updateUser,
  getUserProfile,
  getSuggestedUsers,
  freezeAccount,
};
