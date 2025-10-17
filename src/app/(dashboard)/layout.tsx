import { AppSidebarLayout } from '@/components/app-sidebar'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabaseServer'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data } = await supabaseServer.auth.getUser()
    if (!data?.user) {
        redirect('/signin')
    }
    return <AppSidebarLayout>{children}</AppSidebarLayout>
}
