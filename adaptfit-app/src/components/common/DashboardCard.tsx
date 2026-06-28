import { ReactNode } from "react";

type CardProps = {
	children: ReactNode;
	className?: string;
	id?: string;
};

export default function DashboardCard({
	children,
	className = "",
	id,
}: CardProps) {
	return (
		<div
			id={id}
			className={`col-span-1 rounded-lg border border-[#d9e5df] bg-white/90 shadow-[0_18px_45px_rgba(23,33,31,0.08)] ${className}`}
		>
			{children}
		</div>
	);
}
