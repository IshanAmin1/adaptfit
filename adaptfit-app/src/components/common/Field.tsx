import { ReactNode } from "react";

export default function Field({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<label className="grid text-lg font-black text-[#17211f]">
			<span>{label}</span>
			{children}
		</label>
	);
}
