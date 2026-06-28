import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
	const location = useLocation();
	const navItems = [
		{ label: "Today", href: "/" },
		{ label: "AI Insights", href: "#insights" },
		{ label: "Nutrition", href: "#nutrition" },
		{ label: "Progress", href: "#progress" },
	];

	return (
		<header className="fixed left-0 top-0 z-10 grid h-19.5 w-full grid-cols-[auto_1fr_auto] items-center gap-7 border-b border-[#d9e5df] bg-white/90 px-4 backdrop-blur-sm md:px-12">
			<Link
				to="/"
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
				{navItems.map((item) =>
					item.href.startsWith("#") ? (
						<a
							key={item.href}
							href={item.href}
							className="border-b-2 border-transparent py-2 text-xs font-black uppercase tracking-[0.08em] text-[#62706b] no-underline"
						>
							{item.label}
						</a>
					) : (
						<Link
							key={item.href}
							className={`border-b-2 py-2 text-xs font-black uppercase tracking-[0.08em] no-underline ${
								location.pathname === item.href
									? "border-[#0f8b6f] text-[#0f8b6f]"
									: "border-transparent text-[#62706b]"
							}`}
							to={item.href}
						>
							{item.label}
						</Link>
					),
				)}
			</nav>
			<Link
				to={location.pathname === "/login" ? "/" : "/login"}
				className="rounded-lg bg-[#17211f] px-4.25 py-2.75 font-black text-white no-underline"
			>
				{location.pathname === "/login" ? "Dashboard" : "Log in"}
			</Link>
		</header>
	);
}
