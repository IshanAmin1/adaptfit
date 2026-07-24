import type { Option } from "./Select";

type MultiSelectDropdownProps = {
	value: string[];
	onChange: (value: string[]) => void;
	options: Option[];
	placeholder: string;
};

export default function MultiSelectDropdown({
	value,
	onChange,
	options,
	placeholder,
}: MultiSelectDropdownProps) {
	const selectedLabel = value.length ? value.join(", ") : placeholder;

	return (
		<details className="group relative">
			<summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-[#b7cbc2] bg-white px-4 text-base font-semibold text-[#17211f] outline-none marker:hidden focus:border-[#0f8b6f] focus:ring-4 focus:ring-[#0f8b6f]/15">
				<span className={value.length ? "" : "text-[#62706b]"}>
					{selectedLabel}
				</span>
				<span className="text-xs font-black text-[#0f8b6f] group-open:rotate-180">
					v
				</span>
			</summary>
			<div className="absolute z-20 mt-2 grid max-h-72 w-full overflow-auto rounded-lg border border-[#b7cbc2] bg-white p-2 shadow-[0_18px_45px_rgba(23,33,31,0.16)]">
				{options.map((option) => {
					const isSelected = value.includes(option.value);

					return (
						<label
							key={option.value}
							className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-semibold text-[#17211f] hover:bg-[#f6faf7]"
						>
							<input
								type="checkbox"
								className="h-4 w-4 accent-[#0f8b6f]"
								checked={isSelected}
								onChange={() => {
									const nextValue = isSelected
										? value.filter((item) => item !== option.value)
										: [...value, option.value];
									onChange(nextValue);
								}}
							/>
							{option.label}
						</label>
					);
				})}
			</div>
		</details>
	);
}
