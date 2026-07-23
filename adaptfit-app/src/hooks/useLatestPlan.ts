import { useEffect, useState } from "react";
import { plansService } from "../api/plans-service";
import type { GeneratedPlan } from "../types/plan";

export function useLatestPlan() {
	const [plan, setPlan] = useState<GeneratedPlan | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		plansService
			.getLatestPlan()
			.then((latestPlan) => {
				if (!isMounted) {
					return;
				}

				setPlan(latestPlan);
				setErrorMessage(null);
			})
			.catch((error: unknown) => {
				if (!isMounted) {
					return;
				}

				setErrorMessage(
					error instanceof Error ? error.message : "Plan could not be loaded.",
				);
			})
			.finally(() => {
				if (isMounted) {
					setIsLoading(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, []);

	return { plan, isLoading, errorMessage };
}
