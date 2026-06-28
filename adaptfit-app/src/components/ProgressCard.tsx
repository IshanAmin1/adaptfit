import DashboardCard from "./common/DashboardCard";
import SectionHeading from "./common/SectionHeading";

export default function ProgressCard() {
	return (
		<DashboardCard id="progress" className="p-7.5 lg:col-span-6">
			<SectionHeading
				eyebrow="Progress feedback"
				title="Weekly evolution"
				action={
					<strong className="text-[46px] leading-none text-[#0f8b6f]">
						+12%
					</strong>
				}
			/>

			<div
				className="relative mt-6.5 h-52.5 rounded-lg bg-[#f6faf7]"
				aria-label="Weekly performance trend"
			>
				<div className="absolute left-0 top-[33%] h-px w-full bg-[rgba(23,33,31,0.08)]" />
				<div className="absolute left-0 top-[66%] h-px w-full bg-[rgba(23,33,31,0.08)]" />
				<svg
					viewBox="0 0 300 120"
					role="img"
					aria-label="Performance line rising across the week"
				>
					<polyline
						className="fill-[rgba(15,139,111,0.15)]"
						points="0,95 45,86 90,90 135,66 180,54 225,34 270,42 300,20 300,120 0,120"
					></polyline>
					<polyline
						className="fill-none stroke-[#0f8b6f] stroke-5 [stroke-linecap:round] [stroke-linejoin:round]"
						points="0,95 45,86 90,90 135,66 180,54 225,34 270,42 300,20"
					></polyline>
					<circle cx="300" cy="20" r="5" className="fill-[#2567b8]" />
				</svg>
			</div>

			<div className="mt-3.5 flex justify-between gap-4 text-xs font-black uppercase tracking-[0.08em] text-[#62706b]">
				<span>Mon</span>
				<span>Wed</span>
				<span>Today</span>
			</div>
		</DashboardCard>
	);
}
