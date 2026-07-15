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
			className="min-h-12 rounded-lg border border-[#b7cbc2] bg-white px-4 text-base font-semibold text-[#17211f] outline-none focus:border-[#0f8b6f] focus:ring-4 focus:ring-[#0f8b6f]/15"
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
