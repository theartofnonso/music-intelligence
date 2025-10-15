"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const navItems = [
	{ title: 'Overview', url: '/dashboard' },
	{ title: 'Tracks', url: '/dashboard/tracks' },
]

export function AppSidebarLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	return (
		<SidebarProvider>
			<Sidebar>
				<SidebarHeader>
					<div className="p-3 text-sm font-semibold">Studeeo</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								{navItems.map((item) => {
									const active = pathname.startsWith(item.url)
									return (
										<SidebarMenuItem key={item.url}>
											<SidebarMenuButton asChild isActive={active}>
												<Link href={item.url} className={cn(active && 'bg-sidebar-accent')}>
													{item.title}
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									)
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<div className="p-3 text-xs text-foreground/60">v0</div>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset>
				<div className="mx-auto w-full max-w-6xl p-4">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
