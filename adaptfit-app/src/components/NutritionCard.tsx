import DashboardCard from "./common/DashboardCard";
import ProgressBar from "./common/ProgressBar";
import SectionHeading from "./common/SectionHeading";

export default function NutritionCard() {
	return (
		<DashboardCard id="nutrition" className="p-7.5 lg:col-span-6">
			<SectionHeading
				eyebrow="Nutrition planning"
				title="Daily targets"
				action={
					<span className="rounded-full bg-[#e0f5ee] px-2.75 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#0f8b6f]">
						Personalized
					</span>
				}
			/>

			<div className="mt-7">
				<ProgressBar
					label="Calories"
					value="1,850 / 2,350 kcal"
					widthClass="w-[78%]"
					barClassName="bg-[#0f8b6f]"
				/>
			</div>

			<div className="mt-7 grid grid-cols-1 gap-4.5 md:grid-cols-3">
				<ProgressBar
					label="Protein"
					value="120g"
					widthClass="w-[70%]"
					barClassName="bg-[#2567b8]"
				/>
				<ProgressBar
					label="Carbs"
					value="200g"
					widthClass="w-[55%]"
					barClassName="bg-[#d99b22]"
				/>
				<ProgressBar
					label="Fat"
					value="45g"
					widthClass="w-[42%]"
					barClassName="bg-[#f46f5e]"
				/>
			</div>

			<button className="mt-7.5 w-full rounded-lg border border-[#0f8b6f] bg-transparent px-4.5 py-3.75 font-black uppercase text-[#0f8b6f]">
				Log next meal
			</button>
		</DashboardCard>
	);
}
