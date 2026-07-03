export type AuthUser = {
	id: string;
	email: string;
	firstName: string;
	lastName?: string | null;
	fullName?: string | null;
	avatarUrl?: string | null;
};
