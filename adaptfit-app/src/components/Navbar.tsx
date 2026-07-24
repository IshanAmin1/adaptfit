import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AuthUser } from "../types/auth";

type NavbarProps = {
	authUser: AuthUser | null;
	onLogout: () => Promise<void>;
};

type NavItem = {
	label: string;
	href: string;
};

type RouterLocation = ReturnType<typeof useLocation>;

function isActiveLink(item: NavItem, location: RouterLocation) {
	return item.href.includes("#")
		? location.pathname + location.hash === item.href
		: location.pathname === item.href;
}

function getHomePath(authUser: AuthUser | null) {
	if (!authUser) {
		return "/";
	}

	if (!authUser.hasActiveSubscription) {
		return "/subscribe";
	}

	return authUser.hasCompletedOnboarding ? "/dashboard" : "/onboarding";
}

export default function Navbar({ authUser, onLogout }: NavbarProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const navItems: NavItem[] = [
		{ label: "Today", href: "/dashboard" },
		{ label: "Insights", href: "/insights" },
		{ label: "Plan", href: "/plan" },
	];
	const hasPaidAccess = Boolean(authUser?.hasActiveSubscription);

	const getNavItemClassName = (item: NavItem) => {
		return `border-b-2 py-2 text-xs font-black uppercase tracking-[0.08em] no-underline ${
			isActiveLink(item, location)
				? "border-[#0f8b6f] text-[#0f8b6f]"
				: "border-transparent text-[#62706b]"
		}`;
	};

	const handleLogout = () => {
		onLogout().finally(() => {
			navigate("/", { replace: true });
		});
	};

	return (
		<header className="fixed left-0 top-0 z-10 grid h-19.5 w-full grid-cols-[auto_1fr_auto] items-center gap-7 border-b border-[#d9e5df] bg-white/90 px-4 backdrop-blur-sm md:px-12">
			<Link
				to={getHomePath(authUser)}
				className="flex items-center gap-2.5 text-[22px] font-black text-inherit no-underline"
			>
				<div className="grid h-10 w-10 place-items-center rounded-lg bg-[#0f8b6f] font-black text-white">
					A
				</div>
				<div>AdaptFit</div>
			</Link>
			<nav
				aria-label="Main navigation"
				className="hidden justify-center gap-7.5 md:flex"
			>
				{hasPaidAccess && authUser?.hasCompletedOnboarding
					? navItems.map((item) => {
							const className = getNavItemClassName(item);

							return (
								<Link key={item.href} className={className} to={item.href}>
									{item.label}
								</Link>
							);
						})
					: null}
			</nav>
			{authUser ? (
				<div className="flex items-center gap-3.5">
					{hasPaidAccess ? (
						<Link
							to="/subscribe"
							className="rounded-lg bg-[#0f8b6f] px-4.25 py-2.75 font-black text-white no-underline"
						>
							Manage membership
						</Link>
					) : (
						<Link
							to="/subscribe"
							className="rounded-lg bg-[#0f8b6f] px-4.25 py-2.75 font-black text-white no-underline"
						>
							Subscribe
						</Link>
					)}
					<button
						type="button"
						className="rounded-lg bg-[#17211f] px-4.25 py-2.75 font-black text-white"
						onClick={handleLogout}
					>
						Log out
					</button>
				</div>
			) : (
				<Link
					to={location.pathname === "/login" ? "/" : "/login"}
					className="rounded-lg bg-[#17211f] px-4.25 py-2.75 font-black text-white no-underline"
				>
					{location.pathname === "/login" ? "Home" : "Log in"}
				</Link>
			)}
		</header>
	);
}
