"use client"

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Check, Copy, Trash2 } from 'lucide-react'
import { deleteTrackAction } from '@/app/(dashboard)/dashboard/tracks/actions'

export function TrackRowActions({ trackId, onDeleted }: { trackId: string; onDeleted?: (trackId: string) => void }) {
	const [copied, setCopied] = useState(false)
	const [pending, startTransition] = useTransition()
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/session/${trackId}` : `/session/${trackId}`

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl)
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch {}
	}

    function onDelete() {
		if (!confirm('Delete this track? This cannot be undone.')) return
		startTransition(async () => {
            try {
                await deleteTrackAction(trackId)
                onDeleted?.(trackId)
            } catch {}
		})
	}

	return (
        <div className="flex items-center gap-1.5">
            <a href={`/session/${trackId}`} target="_blank" rel="noopener noreferrer">
				<Button variant="outline" size="icon-sm" aria-label="Preview">
					<ExternalLink className="h-4 w-4" />
				</Button>
			</a>
			<Button variant="outline" size="icon-sm" onClick={copyLink} aria-label={copied ? 'Copied' : 'Copy link'}>
				{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
			</Button>
			<Button variant="destructive" size="icon-sm" onClick={onDelete} disabled={pending} aria-label="Delete track">
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	)
}
