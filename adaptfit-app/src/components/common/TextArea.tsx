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
			className="min-h-28 resize-y rounded-xl border border-[#9db4d8] bg-white px-4 py-3 text-base font-semibold text-[#111827] outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/15"
			value={value}
			placeholder={placeholder}
			onChange={(event) => onChange(event.target.value)}
		/>
	);
}
