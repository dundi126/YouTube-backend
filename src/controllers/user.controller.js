import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import cookieParser from "cookie-parser";

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

export { registerUser, loginUser, logoutUser };
