import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import csrf from '@dr.pogodin/csurf';
import { sequelize } from "./datasource.js";
import { authRouter } from "./routers/auth_router.js";
import { billingRouter } from "./routers/billing_router.js";
import { onboardingRouter } from "./routers/onboarding_router.js";
import { plansRouter } from "./routers/plans_router.js";
import { exercisesRouter } from "./routers/exercises_router.js";
import { stripeWebhookRouter } from "./routers/stripe_webhook_router.js";
import { sessionMiddleware } from "./models/sessions.js";
import { PORT, CLIENT_ORIGIN } from "./config/env/server.js";

export const app = express();

app.use(
	cors({
		origin: CLIENT_ORIGIN,
		credentials: true,
	}),
);
// The webhook route uses express.raw({ type: "application/json" }) because signature verification needs
// the raw request body bytes, so we cannot use express.json() or bodyParser.json() for the webhook route.
app.use("/stripe", stripeWebhookRouter);
app.use(bodyParser.json());
app.use(sessionMiddleware());
app.use(csrf({ cookie: false }));

app.get("/csrf-token", (req, res) => {
  res.json({
    csrfToken: req.csrfToken(),
  });
});

try {
	await sequelize.authenticate();

	if (process.env.NODE_ENV !== "production") {
		await sequelize.sync({ alter: { drop: false } });
	}

	console.log("Connection has been established successfully.");
} catch (error) {
	throw new Error("Unable to connect to the database:", error);
}

app.get("/api/health", (req, res) => {
	return res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/billing", billingRouter);
app.use("/onboarding", onboardingRouter);
app.use("/plans", plansRouter);
app.use("/exercises", exercisesRouter);

app.listen(PORT, (err) => {
	if (err) console.log(err);
	else console.log("HTTP server on http://localhost:%s", PORT);
});
