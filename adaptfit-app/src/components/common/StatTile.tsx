type StatTileProps = {
	label: string;
	value: string;
	valueClassName?: string;
};

export default function StatTile({
	label,
	value,
	valueClassName = "text-[27px]",
}: StatTileProps) {
	return (
		<div className="min-h-28 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4.5">
			<span className="block text-xs font-black uppercase tracking-[0.08em] text-[#62706b]">
				{label}
			</span>
			<strong className={`mt-3 block font-semibold ${valueClassName}`}>
				{value}
			</strong>
		</div>
	);
}
