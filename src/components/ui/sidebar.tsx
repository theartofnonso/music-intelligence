"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'

export function SidebarProvider({ children }: { children: React.ReactNode }) {
	return <div className="flex min-h-screen w-full bg-background text-foreground">{children}</div>
}

export function Sidebar({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
        <aside className={cn('w-56 shrink-0 border-r border-border bg-sidebar', className)}>
			{children}
		</aside>
	)
}

export function SidebarHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('border-b border-border', className)}>{children}</div>
}

export function SidebarContent({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('p-2', className)}>{children}</div>
}

export function SidebarFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('mt-auto border-t border-border', className)}>{children}</div>
}

export function SidebarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('py-2', className)}>{children}</div>
}

export function SidebarGroupContent({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('space-y-1', className)}>{children}</div>
}

export function SidebarMenu({ children, className }: { children: React.ReactNode; className?: string }) {
	return <ul className={cn('flex flex-col gap-1', className)}>{children}</ul>
}

export function SidebarMenuItem({ children, className }: { children: React.ReactNode; className?: string }) {
	return <li className={cn('', className)}>{children}</li>
}

export function SidebarMenuButton({ children, className, isActive }: { children: React.ReactNode; className?: string; isActive?: boolean }) {
	return (
        <Slot className={cn('block rounded-none px-3 py-2 text-sm hover:bg-sidebar-accent', isActive && 'bg-sidebar-accent', className)}>
            {children}
        </Slot>
	)
}

export function SidebarInset({ children, className }: { children: React.ReactNode; className?: string }) {
	return <main className={cn('flex-1', className)}>{children}</main>
}
