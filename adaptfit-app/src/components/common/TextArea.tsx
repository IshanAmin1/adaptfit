export default function TextArea({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	return (
		<textarea
			className="min-h-28 resize-y rounded-lg border border-[#b7cbc2] bg-white px-4 py-3 text-base font-semibold text-[#17211f] outline-none focus:border-[#0f8b6f] focus:ring-4 focus:ring-[#0f8b6f]/15"
			value={value}
			placeholder={placeholder}
			onChange={(event) => onChange(event.target.value)}
		/>
	);
}
