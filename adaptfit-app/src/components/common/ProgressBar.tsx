type ProgressBarProps = {
	label: string;
	value: string;
	widthPercent?: number;
	barClassName: string;
};

export default function ProgressBar({
	label,
	value,
	widthPercent,
	barClassName,
}: ProgressBarProps) {
	return (
		<div>
			<div className="flex items-center justify-between gap-4 text-sm text-[#62706b]">
				<span>{label}</span>
				<strong className="text-[#17211f]">{value}</strong>
			</div>
			<div className="mt-3 h-2.25 overflow-hidden rounded-full bg-[#e3ece7]">
				<span
					className={`block h-full rounded-[inherit] ${barClassName}`}
					style={
						typeof widthPercent === "number"
							? { width: `${widthPercent}%` }
							: undefined
					}
				/>
			</div>
		</div>
	);
}
