import { findUserById } from "../models/users.js";

export async function isAuthenticated(req, res, next) {
	try {
		if (!req.session?.userId) {
			return res.status(401).json({ error: "Not Authenticated" });
		}

		const user = await findUserById(req.session.userId);
		if (!user) {
			req.session.destroy(() => {});
			return res.status(401).json({ error: "Not Authenticated" });
		}

		req.user = user;
		next();
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Authentication failed." });
	}
}
