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
						className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
							isSelected
								? "border-[#2563eb] bg-[#eaf2ff] text-[#2563eb]"
								: "border-[#d6e2f5] bg-white text-[#111827] hover:border-[#6b93d6]"
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
