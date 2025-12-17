import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

const generateToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    console.log(user);

    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefereshToken();
    console.log("Access and refresh token generated");

    user.refreshTokens = refreshToken;
    console.log(user);
    await user.save({ validateBeforeSave: false });

    console.log("Refresh token updated to db");

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error(500, "Token generation failed");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // Get user details
  // Validate user details
  // Check if user exists in db: email
  // check for image/avatar upload
  // upload to cloudinary
  // create user object for mongodb
  // remove password from response
  // check for user creation
  // retrun response

  console.log("User Details: ", req.body);
  const { fullname, email, password, username } = req.body;

  if (
    [fullname, email, password, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  console.log("Existing User: ", existingUser);

  if (existingUser) {
    throw new ApiError(409, "User with given email or username already exists");
  }

  console.log("Files:", req.files);
  const avatarPath = req.files?.avatar[0]?.path;
  const coverImagePath = req.files?.coverImage[0]?.path;

  if (!avatarPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = await uploadToCloudinary(avatarPath);
  const coverImage = await uploadToCloudinary(coverImagePath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refereshTokens"
  );

  if (!createdUser) {
    throw new ApiError(500, "Failed to create user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, "User registered successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  //Get user credentials from req body
  //Validate user credentials
  //Check if user exists in db
  //Compare password
  //If all ok, generate JWT token
  //send cookies

  console.log(req.body);

  const { email, username, password } = req.body;

  if (!(email?.trim() || username?.trim()) || !password?.trim()) {
    throw new ApiError(400, "Email/Username and password are required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // const isPasswordCorrect = await user.isPasswordCorrect(password)
  // if (!isPasswordCorrect) {
  //     throw new ApiError(401, "Invalid credentials")
  // }

  await user.isPasswordCorrect(password).catch(() => {
    throw new ApiError(401, "Invalid credentials");
  });

  const { accessToken, refreshToken } = await generateToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refereshTokens"
  );

  const cookieSettings = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieSettings)
    .cookie("refreshToken", refreshToken, cookieSettings)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refereshTokens: undefined,
      },
    },
    {
      new: true,
    }
  );

  const cookieSettings = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieSettings)
    .clearCookie("refreshToken", cookieSettings)
    .json(new ApiResponse(200, {}, "User loggedOut successfully!!!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookie.refereshTokens || req.body.refereshTokens;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request.");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Token");
    }

    if (incomingRefreshToken !== user?.refereshTokens) {
      throw new ApiError(401, "Invalid or expired refresh token ");
    }

    const cookieSettings = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } = await generateToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieSettings)
      .cookie("refreshToken", newRefreshToken, cookieSettings)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "New Access and Refresh Token Generated "
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error generating refresh token");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  if (!user.isPasswordCorrect(oldPassword)) {
    throw new ApiError(400, "Invalid Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, "Password Updated"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Details"));
});

const updateAccount = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(401, "User details required to update");
  }

  const user = await User.findByIdAndUpdate(
    req.body?._id,
    {
      $set: {
        fullname: fullname,
        email: email,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Upadated user details"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  const oldAvatar = req.body?.avatar;

  if (!avatarLocalPath) {
    throw new ApiError(401, "Invalid file Path");
  }

  const avatar = await uploadToCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError("500", "Failed to upload new avatar file");
  }

  const user = await User.findByIdAndUpdate(req.body?._id, {
    $set: {
      avatar: avatar.url,
    },
  });

  const deleteOldFile = deleteFromCloudinary(oldAvatar);
  console.log(deleteOldFile);

  return res.status(200).json(new ApiResponse(200, user, "Avatar updated"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  const oldCoverImage = req.body?.coverImage;

  if (!coverImageLocalPath) {
    throw new ApiError(401, "Invalid file path");
  }

  const coverImage = await uploadToCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(500, "Failed to upload new file");
  }

  const user = await User.findByIdAndUpdate(req.body?._id, {
    set: {
      coverImage: coverImage.url,
    },
  });

  const deleteOldFile = deleteFromCloudinary(oldCoverImage);
  console.log(deleteOldFile);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Updated cover image"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccount,
  updateAvatar,
  updateCoverImage,
};
