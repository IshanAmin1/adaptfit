import { query } from "../datasource.js";

export function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
  };
}

export async function findUserById(id) {
  const result = await query(
    `
      select id, email, first_name, last_name, full_name, avatar_url
      from users
      where id = $1
    `,
    [id]
  );
  return result.rows[0] || null;
}

export async function upsertGoogleUser(profile) {
  const result = await query(
    `
      insert into users (
        google_sub,
        email,
        email_verified,
        first_name,
        last_name,
        full_name,
        avatar_url
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (google_sub) do update set
        email = excluded.email,
        email_verified = excluded.email_verified,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        full_name = excluded.full_name,
        avatar_url = excluded.avatar_url
      returning id, email, first_name, last_name, full_name, avatar_url
    `,
    [
      profile.googleSub,
      profile.email,
      profile.emailVerified,
      profile.firstName,
      profile.lastName,
      profile.fullName,
      profile.avatarUrl,
    ]
  );

  return result.rows[0];
}
