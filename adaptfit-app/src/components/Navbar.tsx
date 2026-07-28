import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AuthUser } from "../types/auth";
import { Button, ButtonLink } from "./common/Button";

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
	const mobileMenuRef = useRef<HTMLDivElement | null>(null);
	const navItems: NavItem[] = [
		{ label: "Today", href: "/dashboard" },
		{ label: "Insights", href: "/insights" },
		{ label: "Plan", href: "/plan" },
	];
	const hasPaidAccess = Boolean(authUser?.hasActiveSubscription);

	const getNavItemClassName = (item: NavItem) => {
		return `border-b-2 py-2 text-xs font-black uppercase tracking-[0.08em] no-underline ${
			isActiveLink(item, location)
				? "border-primary text-primary"
				: "border-transparent text-muted"
		}`;
	};

	const handleLogout = () => {
		setIsMenuOpen(false);
		onLogout().finally(() => {
			navigate("/", { replace: true });
		});
	};

	const membershipLink = hasPaidAccess
		? { label: "Manage membership", href: "/subscribe" }
		: { label: "Subscribe", href: "/subscribe" };

	useEffect(() => {
		if (!isMenuOpen) {
			return;
		}

		const handlePointerDown = (event: PointerEvent) => {
			if (
				event.target instanceof Node &&
				!mobileMenuRef.current?.contains(event.target)
			) {
				setIsMenuOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);

		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
		};
	}, [isMenuOpen]);

	return (
		<header className="fixed left-0 top-0 z-10 grid h-19.5 w-full grid-cols-[auto_1fr_auto] items-center gap-7 border-b border-border bg-white/90 px-4 backdrop-blur-sm md:px-12">
			<Link
				to={getHomePath(authUser)}
				className="flex items-center gap-2.5 text-[22px] font-black text-inherit no-underline"
			>
				<div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-primary font-black text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
					<span className="relative z-10 text-[23px] leading-none">A</span>
					<span className="absolute bottom-1.5 h-1 w-5 bg-white/80" />
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
					<ButtonLink to={membershipLink.href} variant="primary">
						{membershipLink.label}
					</ButtonLink>
					<Button variant="secondary" onClick={handleLogout}>
						Log out
					</Button>
				</div>
			) : (
				<ButtonLink
					to={location.pathname === "/login" ? "/" : "/login"}
					variant="secondary"
					className="hidden md:inline-block"
				>
					{location.pathname === "/login" ? "Home" : "Log in"}
				</ButtonLink>
			)}
			<div ref={mobileMenuRef} className="relative justify-self-end md:hidden">
				<Button
					type="button"
					aria-label={isMenuOpen ? "Close menu" : "Open menu"}
					aria-expanded={isMenuOpen}
					variant="menu"
					size="icon"
					className="grid place-items-center"
					onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
				>
					<span className="grid gap-1.5">
						<span className="block h-0.5 w-5 rounded-full bg-current" />
						<span className="block h-0.5 w-5 rounded-full bg-current" />
						<span className="block h-0.5 w-5 rounded-full bg-current" />
					</span>
				</Button>

				{isMenuOpen ? (
					<div className="absolute right-0 top-13 grid min-w-58 gap-2 rounded-xl border border-border bg-white p-3 shadow-[0_18px_45px_rgba(23,33,31,0.14)]">
						{hasPaidAccess && authUser?.hasCompletedOnboarding
							? navItems.map((item) => (
									<Link
										key={item.href}
										to={item.href}
										onClick={() => setIsMenuOpen(false)}
										className={`rounded-lg px-3.5 py-3 text-sm font-black uppercase tracking-[0.08em] no-underline ${
											isActiveLink(item, location)
												? "bg-primary-soft text-primary"
												: "text-secondary"
										}`}
									>
										{item.label}
									</Link>
								))
							: null}

						{authUser ? (
							<>
								<ButtonLink
									to={membershipLink.href}
									onClick={() => setIsMenuOpen(false)}
									size="sm"
								>
									{membershipLink.label}
								</ButtonLink>
								<Button
									variant="secondary"
									size="sm"
									className="text-left"
									onClick={handleLogout}
								>
									Log out
								</Button>
							</>
						) : (
							<ButtonLink
								to={location.pathname === "/login" ? "/" : "/login"}
								onClick={() => setIsMenuOpen(false)}
								variant="secondary"
								size="sm"
							>
								{location.pathname === "/login" ? "Home" : "Log in"}
							</ButtonLink>
						)}
					</div>
				) : null}
			</div>
		</header>
	);
}
