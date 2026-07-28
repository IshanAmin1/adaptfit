import { ReactNode } from "react";

type SectionHeadingProps = {
	eyebrow: string;
	title: string;
	action?: ReactNode;
};

export default function SectionHeading({
	eyebrow,
	title,
	action,
}: SectionHeadingProps) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div>
				<p className="mb-3 text-xs font-black uppercase tracking-widest text-[#2563eb]">
					{eyebrow}
				</p>
				<h2 className="m-0 text-[28px] font-semibold leading-[1.15]">
					{title}
				</h2>
			</div>
			{action}
		</div>
	);
}
