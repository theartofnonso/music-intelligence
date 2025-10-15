export default function TestLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-background text-foreground">
				<main className="max-w-2xl mx-auto p-6">{children}</main>
			</body>
		</html>
	)
}
