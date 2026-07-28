import DashboardCard from "../common/DashboardCard";

type PlanStateProps = {
	title: string;
	message: string;
};

export default function PlanState({ title, message }: PlanStateProps) {
	return (
		<DashboardCard className="p-8 lg:col-span-12">
			<p className="mb-3 text-xs font-black uppercase tracking-widest text-primary">
				{title}
			</p>
			<p className="m-0 max-w-180 text-lg font-semibold leading-7 text-muted">
				{message}
			</p>
		</DashboardCard>
	);
}
