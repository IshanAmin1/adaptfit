import { Link } from "react-router-dom";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "menu";

const variantClassNames: Record<ButtonVariant, string> = {
	primary: "bg-primary text-white hover:bg-primary-hover",
	secondary: "bg-secondary text-white",
	outline:
		"border border-control bg-white text-secondary hover:border-primary hover:text-primary",
	menu: "border border-border bg-white text-secondary",
};

const sizeClassNames = {
	sm: "rounded-lg px-3.5 py-3 text-sm",
	md: "rounded-xl px-4.25 py-2.75",
	icon: "h-11 w-11 rounded-xl p-0",
};

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
	children: ReactNode;
	size?: keyof typeof sizeClassNames;
	variant?: ButtonVariant;
};

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
	children: ReactNode;
	size?: keyof typeof sizeClassNames;
	variant?: ButtonVariant;
};

function getButtonClassName(
	variant: ButtonVariant,
	size: keyof typeof sizeClassNames,
	className = "",
) {
	return `${sizeClassNames[size]} ${variantClassNames[variant]} flex items-center justify-center font-black transition ${className}`;
}

export function Button({
	children,
	className,
	size = "md",
	variant = "primary",
	...props
}: ButtonProps) {
	return (
		<button
			className={getButtonClassName(variant, size, className)}
			type="button"
			{...props}
		>
			{children}
		</button>
	);
}

export function ButtonLink({
	children,
	className,
	size = "md",
	variant = "primary",
	...props
}: ButtonLinkProps) {
	return (
		<Link
			className={`${getButtonClassName(variant, size, className)} no-underline`}
			{...props}
		>
			{children}
		</Link>
	);
}
