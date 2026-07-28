type WorkoutStepProps = {
	index: number;
	title: string;
	subtitle: string;
};

export default function WorkoutStep({
	index,
	title,
	subtitle,
}: WorkoutStepProps) {
	return (
		<div className="min-h-37.5 rounded-xl bg-[#1e3a8a] p-4.5 text-white">
			<span className="grid h-7.5 w-7.5 place-items-center rounded-full bg-[#2563eb] font-black">
				{index}
			</span>
			<strong className="mt-4.5 block text-lg font-semibold">{title}</strong>
			<p className="mt-2 text-[#dbeafe]">{subtitle}</p>
		</div>
	);
}
