import Link from 'next/link'

export default function Home() {
	return (
		<main className="p-6">
			<h1 className="text-2xl font-bold mb-4">Studeeo: Music Intelligence (MVP)</h1>
			<p className="mb-4">Start a sample listening test:</p>
			<Link href="/test/00000000-0000-0000-0000-000000000001" className="underline text-blue-600">
				Open Sample Test
			</Link>
		</main>
	)
}
