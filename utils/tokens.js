import jwt from "jsonwebtoken";

export function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "30d" }
  );

  return { accessToken, refreshToken };
}
