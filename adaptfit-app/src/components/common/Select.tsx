export type Option = {
	label: string;
	value: string;
};

export default function Select({
	value,
	onChange,
	options,
	placeholder,
	required = false,
}: {
	value: string;
	onChange: (value: string) => void;
	options: Option[];
	placeholder: string;
	required?: boolean;
}) {
	return (
		<select
			className="min-h-12 rounded-lg border border-[#b7cbc2] bg-white px-4 text-base font-semibold text-[#17211f] outline-none focus:border-[#0f8b6f] focus:ring-4 focus:ring-[#0f8b6f]/15"
			value={value}
			required={required}
			onChange={(event) => onChange(event.target.value)}
		>
			<option value="">{placeholder}</option>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}
