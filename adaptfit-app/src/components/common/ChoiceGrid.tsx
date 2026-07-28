import type { Option } from "./Select";

export default function ChoiceGrid({
	label,
	options,
	value,
	onChange,
	multi = false,
	className = "sm:grid-cols-2",
}: {
	label: string;
	options: Option[];
	value: string | string[];
	onChange: (value: string | string[]) => void;
	multi?: boolean;
	className?: string;
}) {
	const selectedValues = Array.isArray(value) ? value : [value];

	return (
		<fieldset className={`grid gap-3 ${className}`}>
			<legend className="text-lg font-black text-secondary">{label}</legend>
			{options.map((option) => {
				const isSelected = selectedValues.includes(option.value);

				return (
					<button
						key={option.value}
						type="button"
						className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
							isSelected
								? "border-primary bg-primary-tint text-primary"
								: "border-border bg-white text-secondary hover:border-control"
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
		</fieldset>
	);
}
