import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { sequelize } from "./datasource.js";
import { authRouter } from "./routers/auth_router.js";
import { billingRouter } from "./routers/billing_router.js";
import { stripeWebhookRouter } from "./routers/stripe_webhook_router.js";
import { sessionMiddleware } from "./models/sessions.js";

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

export const app = express();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use("/stripe", stripeWebhookRouter);
app.use(bodyParser.json());
app.use(sessionMiddleware());

try {
  await sequelize.authenticate();

  if (process.env.NODE_ENV !== "production") {
    await sequelize.sync({ alter: { drop: false } });
  }

  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
  process.exit(1);
}

app.get("/api/health", (req, res) => {
  return res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/billing", billingRouter);

app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});
