import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen grid grid-cols-[220px_1fr]">
			<aside className="border-r p-4 space-y-3">
				<h2 className="text-sm font-semibold">Studeeo</h2>
				<nav className="flex flex-col gap-2 text-sm">
					<Link className="underline" href="/dashboard">Overview</Link>
					<Link className="underline" href="/dashboard/tracks">Tracks</Link>
					<Link className="underline" href="/dashboard/upload">Upload</Link>
				</nav>
			</aside>
			<main className="p-6">{children}</main>
		</div>
	)
}
