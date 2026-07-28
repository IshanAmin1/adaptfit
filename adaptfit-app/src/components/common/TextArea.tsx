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
			className="min-h-28 resize-y rounded-xl border border-control bg-white px-4 py-3 text-base font-semibold text-secondary outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
			value={value}
			placeholder={placeholder}
			onChange={(event) => onChange(event.target.value)}
		/>
	);
}
