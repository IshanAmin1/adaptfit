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
			className="min-h-12 rounded-xl border border-[#9db4d8] bg-white px-4 text-base font-semibold text-[#111827] outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/15"
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
