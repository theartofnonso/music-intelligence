import { cn } from '@/lib/utils'

export function PageHeader({ title, subtitle, className, titleClassName, subtitleClassName }: { title: string; subtitle?: string; className?: string; titleClassName?: string; subtitleClassName?: string }) {
	return (
		<div className={cn('flex flex-col gap-1', className)}>
			<h1 className={cn('text-2xl font-semibold tracking-tight', titleClassName)}>{title}</h1>
			{subtitle ? (
				<p className={cn('text-sm text-muted-foreground font-light', subtitleClassName)}>{subtitle}</p>
			) : null}
		</div>
	)
}

