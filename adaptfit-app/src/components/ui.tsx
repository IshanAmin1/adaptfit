import type { ReactNode } from "react";

type CardProps = {
	children: ReactNode;
	className?: string;
	id?: string;
};

export function DashboardCard({ children, className = "", id }: CardProps) {
	return (
		<div
			id={id}
			className={`col-span-1 rounded-lg border border-[#d9e5df] bg-white/90 shadow-[0_18px_45px_rgba(23,33,31,0.08)] ${className}`}
		>
			{children}
		</div>
	);
}

type SectionHeadingProps = {
	eyebrow: string;
	title: string;
	action?: ReactNode;
};

export function SectionHeading({
	eyebrow,
	title,
	action,
}: SectionHeadingProps) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div>
				<p className="mb-3 text-xs font-black uppercase tracking-[0.1em] text-[#0f8b6f]">
					{eyebrow}
				</p>
				<h2 className="m-0 text-[28px] font-semibold leading-[1.15]">
					{title}
				</h2>
			</div>
			{action}
		</div>
	);
}

type StatTileProps = {
	label: string;
	value: string;
	valueClassName?: string;
};

export function StatTile({
	label,
	value,
	valueClassName = "text-[27px]",
}: StatTileProps) {
	return (
		<div className="min-h-[112px] rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-[18px]">
			<span className="block text-xs font-black uppercase tracking-[0.08em] text-[#62706b]">
				{label}
			</span>
			<strong className={`mt-3 block font-semibold ${valueClassName}`}>
				{value}
			</strong>
		</div>
	);
}

type WorkoutStepProps = {
	index: number;
	title: string;
	subtitle: string;
};

export function WorkoutStep({ index, title, subtitle }: WorkoutStepProps) {
	return (
		<div className="min-h-[150px] rounded-lg bg-[#17322d] p-[18px] text-white">
			<span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#0f8b6f] font-black">
				{index}
			</span>
			<strong className="mt-[18px] block text-lg font-semibold">{title}</strong>
			<p className="mt-2 text-[#c8f7e6]">{subtitle}</p>
		</div>
	);
}

type ProgressBarProps = {
	label: string;
	value: string;
	widthClass: string;
	barClassName: string;
};

export function ProgressBar({
	label,
	value,
	widthClass,
	barClassName,
}: ProgressBarProps) {
	return (
		<div>
			<div className="flex items-center justify-between gap-4 text-sm text-[#62706b]">
				<span>{label}</span>
				<strong className="text-[#17211f]">{value}</strong>
			</div>
			<div className="mt-3 h-[9px] overflow-hidden rounded-full bg-[#e3ece7]">
				<span
					className={`block h-full rounded-[inherit] ${widthClass} ${barClassName}`}
				/>
			</div>
		</div>
	);
}
