import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../utils/generateTokenAndSetCookie.js";

// singupUser ----------------------------------------------------------------

const signupUser = async (req, res) => {
  try {
    const { name, email, password, username } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (user) {
      return res.status(400).json({ message: "User already exists" });
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
      });
    } else {
      return res.status(400).json({ message: "Invalid user data" });
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
      return res.status(400).json({ message: "Invalid username or password" });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user?.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    generateTokenAndSetCookie(user._id, res);

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
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
      message: "Successfully logged out",
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

    if (id == toString(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You cannot follow/unfollow yourself" });
    }

    if (!userToModify || !currentUser) {
      return res.status(400).json({ message: "User not found" });
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

export { signupUser, loginUser, logoutUser, followUnFollowUser };
