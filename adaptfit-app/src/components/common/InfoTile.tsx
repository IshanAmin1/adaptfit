import type { ReactNode } from "react";

type InfoTileProps = {
	label: string;
	children: ReactNode;
	className?: string;
	valueClassName?: string;
};

export default function InfoTile({
	label,
	children,
	className = "",
	valueClassName = "text-sm font-black leading-5 text-secondary",
}: InfoTileProps) {
	return (
		<div
			className={`rounded-xl border border-border bg-surface-soft p-4 ${className}`}
		>
			<p className="m-0 text-xs font-black uppercase tracking-widest text-muted">
				{label}
			</p>
			<p className={`mt-2 ${valueClassName}`}>{children}</p>
		</div>
	);
}
