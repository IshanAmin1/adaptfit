export default function TextInput({
	value,
	onChange,
	placeholder,
	type = "text",
	required = false,
	min,
	max,
	step,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	type?: string;
	required?: boolean;
	min?: number;
	max?: number;
	step?: number;
}) {
	return (
		<input
			className="min-h-12 rounded-xl border border-control bg-white px-4 text-base font-semibold text-secondary outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
			type={type}
			value={value}
			required={required}
			min={min}
			max={max}
			step={step}
			placeholder={placeholder}
			onChange={(event) => onChange(event.target.value)}
		/>
	);
}
