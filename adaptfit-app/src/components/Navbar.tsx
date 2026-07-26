import { googleLogout } from "@react-oauth/google";
import { useState } from "react";
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
	const [isMenuOpen, setIsMenuOpen] = useState(false);
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
		setIsMenuOpen(false);
		googleLogout();
		onLogout().finally(() => {
			navigate("/", { replace: true });
		});
	};

	const membershipLink = hasPaidAccess
		? { label: "Manage membership", href: "/subscribe" }
		: { label: "Subscribe", href: "/subscribe" };

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
				<div className="hidden items-center gap-3.5 md:flex">
					<Link
						to={membershipLink.href}
						className="rounded-lg bg-[#0f8b6f] px-4.25 py-2.75 font-black text-white no-underline"
					>
						{membershipLink.label}
					</Link>
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
					className="hidden rounded-lg bg-[#17211f] px-4.25 py-2.75 font-black text-white no-underline md:inline-block"
				>
					{location.pathname === "/login" ? "Home" : "Log in"}
				</Link>
			)}
			<div className="relative justify-self-end md:hidden">
				<button
					type="button"
					aria-label={isMenuOpen ? "Close menu" : "Open menu"}
					aria-expanded={isMenuOpen}
					className="grid h-11 w-11 place-items-center rounded-lg border border-[#d9e5df] bg-white text-[#17211f]"
					onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
				>
					<span className="grid gap-1.5">
						<span className="block h-0.5 w-5 rounded-full bg-current" />
						<span className="block h-0.5 w-5 rounded-full bg-current" />
						<span className="block h-0.5 w-5 rounded-full bg-current" />
					</span>
				</button>

				{isMenuOpen ? (
					<div className="absolute right-0 top-13 grid min-w-58 gap-2 rounded-lg border border-[#d9e5df] bg-white p-3 shadow-[0_18px_45px_rgba(23,33,31,0.14)]">
						{hasPaidAccess && authUser?.hasCompletedOnboarding
							? navItems.map((item) => (
									<Link
										key={item.href}
										to={item.href}
										onClick={() => setIsMenuOpen(false)}
										className={`rounded-md px-3.5 py-3 text-sm font-black uppercase tracking-[0.08em] no-underline ${
											isActiveLink(item, location)
												? "bg-[#e0f5ee] text-[#0f8b6f]"
												: "text-[#17211f]"
										}`}
									>
										{item.label}
									</Link>
								))
							: null}

						{authUser ? (
							<>
								<Link
									to={membershipLink.href}
									onClick={() => setIsMenuOpen(false)}
									className="rounded-md bg-[#0f8b6f] px-3.5 py-3 text-sm font-black text-white no-underline"
								>
									{membershipLink.label}
								</Link>
								<button
									type="button"
									className="rounded-md bg-[#17211f] px-3.5 py-3 text-left text-sm font-black text-white"
									onClick={handleLogout}
								>
									Log out
								</button>
							</>
						) : (
							<Link
								to={location.pathname === "/login" ? "/" : "/login"}
								onClick={() => setIsMenuOpen(false)}
								className="rounded-md bg-[#17211f] px-3.5 py-3 text-sm font-black text-white no-underline"
							>
								{location.pathname === "/login" ? "Home" : "Log in"}
							</Link>
						)}
					</div>
				) : null}
			</div>
		</header>
	);
}
