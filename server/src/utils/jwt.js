import jwt from "jsonwebtoken";

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      plan: user.plan,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30m" }
  );
}
