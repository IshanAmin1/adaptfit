import { DataTypes, literal } from "sequelize";
import { sequelize } from "../datasource.js";

export const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: literal("gen_random_uuid()"),
    },
    google_sub: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    first_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    full_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    avatar_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

function toPlainUser(user) {
  return user?.get ? user.get({ plain: true }) : user;
}

export function serializeUser(user) {
  const plainUser = toPlainUser(user);

  return {
    id: plainUser.id,
    email: plainUser.email,
    firstName: plainUser.first_name,
    lastName: plainUser.last_name,
    fullName: plainUser.full_name,
    avatarUrl: plainUser.avatar_url,
  };
}

export async function findUserById(id) {
  const user = await User.findByPk(id);
  return toPlainUser(user) || null;
}

export async function upsertGoogleUser(profile) {
  const [user] = await User.upsert(
    {
      google_sub: profile.googleSub,
      email: profile.email,
      email_verified: profile.emailVerified,
      first_name: profile.firstName,
      last_name: profile.lastName,
      full_name: profile.fullName,
      avatar_url: profile.avatarUrl,
    },
    {
      conflictFields: ["google_sub"],
      returning: true,
    },
  );

  return toPlainUser(user);
}
