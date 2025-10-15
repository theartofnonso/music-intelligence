"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function TrackRowActions({ trackId }: { trackId: string }) {
	const [copied, setCopied] = useState(false)
	const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/test/${trackId}` : `/test/${trackId}`

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl)
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch {}
	}

	return (
		<div className="flex items-center gap-2">
			<a href={`/test/${trackId}`} target="_blank" rel="noopener noreferrer">
				<Button variant="secondary" size="sm">Preview</Button>
			</a>
			<Button variant="outline" size="sm" onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</Button>
		</div>
	)
}
