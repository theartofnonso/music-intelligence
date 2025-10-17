"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'

const navItems = [
	{ title: 'Overview', url: '/dashboard' },
	{ title: 'Tracks', url: '/dashboard/tracks' },
]

export function AppSidebarLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
	return (
		<SidebarProvider>
			{/* Desktop sidebar */}
			<Sidebar className="hidden md:block">
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
                                            <SidebarMenuButton isActive={active}>
												<Link href={item.url} className={cn('w-full cursor-pointer', active && 'bg-sidebar-accent')}>
													<span className="block w-full">{item.title}</span>
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
				{/* Mobile top bar with hamburger */}
				<div className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background/80 px-3 py-3 backdrop-blur md:hidden">
					<Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
						<SheetTrigger asChild>
							<Button variant="outline" size="icon" aria-label="Open navigation">
								<Menu className="h-5 w-5" />
							</Button>
						</SheetTrigger>
                        <SheetContent side="left" className="w-[85%] max-w-xs p-0">
							<div className="border-b">
								<div className="p-3 text-sm font-semibold">Studeeo</div>
							</div>
							<div className="p-2">
								<ul className="flex flex-col gap-1">
                                    {navItems.map((item) => {
										const active = pathname.startsWith(item.url)
										return (
											<li key={item.url}>
                                                <SidebarMenuButton isActive={active}>
													<Link href={item.url} className={cn('w-full cursor-pointer', active && 'bg-sidebar-accent')} onClick={() => {
														setIsMobileSheetOpen(false)
													}}>
														<span className="block w-full">{item.title}</span>
													</Link>
												</SidebarMenuButton>
											</li>
										)
									})}
								</ul>
							</div>
							<div className="mt-auto border-t p-3 text-xs text-foreground/60">v0</div>
						</SheetContent>
					</Sheet>
					<div className="text-sm font-semibold">Studeeo</div>
				</div>
				<div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
