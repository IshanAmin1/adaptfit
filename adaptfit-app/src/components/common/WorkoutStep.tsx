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
		<div className="min-h-37.5 rounded-lg bg-[#17322d] p-4.5 text-white">
			<span className="grid h-7.5 w-7.5 place-items-center rounded-full bg-[#0f8b6f] font-black">
				{index}
			</span>
			<strong className="mt-4.5 block text-lg font-semibold">{title}</strong>
			<p className="mt-2 text-[#c8f7e6]">{subtitle}</p>
		</div>
	);
}
