import DashboardCard from "../common/DashboardCard";

type PlanStateProps = {
	title: string;
	message: string;
};

export default function PlanState({ title, message }: PlanStateProps) {
	return (
		<DashboardCard className="p-8 lg:col-span-12">
			<p className="mb-3 text-xs font-black uppercase tracking-widest text-[#2563eb]">
				{title}
			</p>
			<p className="m-0 max-w-180 text-lg font-semibold leading-7 text-[#5b6b86]">
				{message}
			</p>
		</DashboardCard>
	);
}
