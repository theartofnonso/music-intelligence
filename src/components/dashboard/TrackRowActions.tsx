"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Check, Copy } from 'lucide-react'

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
		<div className="flex items-center gap-1.5">
			<a href={`/test/${trackId}`} target="_blank" rel="noopener noreferrer">
				<Button variant="outline" size="icon-sm" aria-label="Preview">
					<ExternalLink className="h-4 w-4" />
				</Button>
			</a>
			<Button variant="outline" size="icon-sm" onClick={copyLink} aria-label={copied ? 'Copied' : 'Copy link'}>
				{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
			</Button>
		</div>
	)
}
