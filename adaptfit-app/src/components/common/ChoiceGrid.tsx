import type { Option } from "./Select";

export default function ChoiceGrid({
	options,
	value,
	onChange,
	multi = false,
	className = "sm:grid-cols-2",
}: {
	options: Option[];
	value: string | string[];
	onChange: (value: string | string[]) => void;
	multi?: boolean;
	className?: string;
}) {
	const selectedValues = Array.isArray(value) ? value : [value];

	return (
		<div className={`grid gap-3 ${className}`}>
			{options.map((option) => {
				const isSelected = selectedValues.includes(option.value);

				return (
					<button
						key={option.value}
						type="button"
						className={`min-h-12 rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${
							isSelected
								? "border-[#0f8b6f] bg-[#e7f6ef] text-[#0f8b6f]"
								: "border-[#d9e5df] bg-white text-[#17211f] hover:border-[#8db7a7]"
						}`}
						onClick={() => {
							if (!multi) {
								onChange(option.value);
								return;
							}

							const nextValues = isSelected
								? selectedValues.filter((item) => item !== option.value)
								: [...selectedValues, option.value];
							onChange(nextValues);
						}}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
