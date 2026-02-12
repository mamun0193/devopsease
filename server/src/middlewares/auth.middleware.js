import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  const token = req.cookies?.access_token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { ...decoded, _id: decoded.userId };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
