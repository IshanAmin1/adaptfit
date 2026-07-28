import { ReactNode } from "react";

export default function Field({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<label className="grid text-lg font-black text-[#111827]">
			<span>{label}</span>
			{children}
		</label>
	);
}
