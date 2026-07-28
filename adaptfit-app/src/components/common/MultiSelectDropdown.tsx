import ChevronDown from "../icons/ChevronDown.js";
import ChevronUp from "../icons/ChevronUp.js";
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
			<summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-control bg-white px-4 text-base font-semibold text-secondary outline-none marker:hidden focus:border-primary focus:ring-4 focus:ring-primary/15">
				<span className={value.length ? "" : "text-muted"}>
					{selectedLabel}
				</span>
				<span className="text-primary">
					<span className="block group-open:hidden">
						<ChevronDown />
					</span>
					<span className="hidden group-open:block">
						<ChevronUp />
					</span>
				</span>
			</summary>
			<div className="absolute z-20 mt-2 grid max-h-72 w-full overflow-auto rounded-xl border border-control bg-white p-2 shadow-[0_18px_45px_rgba(23,33,31,0.16)]">
				{options.map((option) => {
					const isSelected = value.includes(option.value);

					return (
						<label
							key={option.value}
							className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-semibold text-secondary hover:bg-surface-soft"
						>
							<input
								type="checkbox"
								className="h-4 w-4 accent-primary"
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
