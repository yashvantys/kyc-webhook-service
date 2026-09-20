import "dotenv/config";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is not configured");
}

const token = jwt.sign(
  {
    tenant_id: "e698ff49-0e4f-4f46-a3bd-edf22dc3796f",
    investor_id: "6bdb2431-b2e7-4ccb-9b96-e1151741c1ad",
  },
  secret,
  {
    expiresIn: "1h",
  },
);

console.log(token);