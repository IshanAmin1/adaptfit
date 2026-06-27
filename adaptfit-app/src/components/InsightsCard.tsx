import { DashboardCard, SectionHeading } from "./ui";

export default function InsightsCard() {
	return (
		<DashboardCard id="insights" className="p-[26px] lg:col-span-4">
			<div className="border-b border-[#d9e5df] pb-[18px]">
				<SectionHeading
					eyebrow="Adaptive insights"
					title="Plan calibration"
					action={
						<div className="grid h-12 w-12 place-items-center rounded-full bg-[#e4efff] font-black text-[#2567b8]">
							AI
						</div>
					}
				/>
			</div>

			<div className="mt-[22px] grid gap-4">
				<div className="rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-[18px]">
					<strong className="block text-[17px] font-semibold">
						Intensity increased by 6%
					</strong>
					<p className="mt-2 text-[#62706b]">
						Workout completion stayed high last week, so AdaptFit adds one extra
						rowing set.
					</p>
				</div>
				<div className="rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-[18px]">
					<strong className="block text-[17px] font-semibold">
						Exercise alternative suggested
					</strong>
					<p className="mt-2 text-[#62706b]">
						Skipped lateral raises are replaced with a shoulder press variation.
					</p>
				</div>
			</div>
		</DashboardCard>
	);
}
