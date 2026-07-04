import crypto from "crypto";
import { DataTypes, Op, literal } from "sequelize";
import { sequelize } from "../datasource.js";
import { User } from "./users.js";

const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);

export const Session = sequelize.define(
  "Session",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: literal("gen_random_uuid()"),
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    session_token_hash: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "sessions",
    createdAt: "created_at",
    updatedAt: false,
  },
);

Session.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Session, { foreignKey: "user_id" });

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getCookieOptions() {
  return {
    httpOnly: true, // JavaScript cannot access the cookie, helps prevent XSS attacks
    sameSite: "lax", // restricts when cookies are sent, helps prevent CSRF attacks
    secure: process.env.NODE_ENV === "production", // ensures cookies are only sent over HTTPS in production
    path: "/",
  };
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await Session.create({
    user_id: userId,
    session_token_hash: tokenHash,
    expires_at: expiresAt,
  });

  return { token, expiresAt };
}

export async function findSessionByToken(token) {
  const session = await Session.findOne({
    attributes: ["id", "user_id"],
    where: {
      session_token_hash: hashToken(token),
      expires_at: {
        [Op.gt]: new Date(),
      },
    },
  });

  return session?.get({ plain: true }) || null;
}

export async function deleteSessionByToken(token) {
  await Session.destroy({
    where: {
      session_token_hash: hashToken(token),
    },
  });
}

export async function deleteExpiredSessions() {
  await Session.destroy({
    where: {
      expires_at: {
        [Op.lte]: new Date(),
      },
    },
  });
}
