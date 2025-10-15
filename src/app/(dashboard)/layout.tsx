import { AppSidebarLayout } from '@/components/app-sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return <AppSidebarLayout>{children}</AppSidebarLayout>
}
