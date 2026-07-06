import { googleLogout } from "@react-oauth/google";
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

export default function Navbar({ authUser, onLogout }: NavbarProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const navItems: NavItem[] = [
		{ label: "Today", href: "/dashboard" },
		{ label: "AI Insights", href: "/dashboard#insights" },
		{ label: "Nutrition", href: "/dashboard#nutrition" },
		{ label: "Progress", href: "/dashboard#progress" },
	];
	const isDashboardPath = location.pathname === "/dashboard";

	const getNavItemClassName = (item: NavItem) => {
		return `border-b-2 py-2 text-xs font-black uppercase tracking-[0.08em] no-underline ${
			isActiveLink(item, location)
				? "border-[#0f8b6f] text-[#0f8b6f]"
				: "border-transparent text-[#62706b]"
		}`;
	};

	const handleLogout = () => {
		googleLogout();
		onLogout().finally(() => {
			navigate("/", { replace: true });
		});
	};

	return (
		<header className="fixed left-0 top-0 z-10 grid h-19.5 w-full grid-cols-[auto_1fr_auto] items-center gap-7 border-b border-[#d9e5df] bg-white/90 px-4 backdrop-blur-sm md:px-12">
			<Link
				to={authUser ? "/dashboard" : "/"}
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
				{authUser
					? navItems.map((item) => {
							const className = getNavItemClassName(item);

							if (isDashboardPath && item.href.includes("#")) {
								return (
									<a key={item.href} className={className} href={item.href}>
										{item.label}
									</a>
								);
							}

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
					<span className="hidden whitespace-nowrap text-sm font-black text-[#17211f] sm:inline">
						Hi, {authUser.firstName}!
					</span>
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
