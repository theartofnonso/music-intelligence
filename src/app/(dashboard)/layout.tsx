import { AppSidebarLayout } from '@/components/app-sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (!data?.user) {
        redirect('/signin')
    }
    return <AppSidebarLayout>{children}</AppSidebarLayout>
}
