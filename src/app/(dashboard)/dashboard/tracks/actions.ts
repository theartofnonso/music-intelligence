'use server'

import { supabaseServer } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function createTrackAction(formData: FormData) {
  const title = String(formData.get('title') ?? '') || null
  const storage_path = String(formData.get('storage_path') ?? '')
  const artist = (formData.get('artist') as string) || null
  const duration_ms = formData.get('duration_ms') ? Number(formData.get('duration_ms')) : null
  if (!storage_path) throw new Error('storage_path required')
  const { data, error } = await supabaseServer
    .from('track')
    .insert({ title, artist, storage_path, duration_ms })
    .select('track_id,title,created_at,storage_path')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/tracks')
  return data
}

export async function deleteTrackAction(trackId: string) {
  // Look up storage_path to delete file, then delete the track
  const { data: t, error: selErr } = await supabaseServer
    .from('track')
    .select('storage_path')
    .eq('track_id', trackId)
    .maybeSingle()
  if (selErr) throw new Error(selErr.message)

  if (t?.storage_path) {
    try {
      // Parse bucket and object path from public URL: /storage/v1/object/public/<bucket>/<objectPath>
      const url = new URL(t.storage_path)
      const parts = url.pathname.split('/')
      const publicIdx = parts.findIndex((p) => p === 'public')
      let bucket: string | null = null
      let objectPath = ''
      if (publicIdx >= 0) {
        const after = parts.slice(publicIdx + 1) // [bucket, ...object]
        bucket = after.shift() ?? null
        objectPath = after.join('/')
      }
      if (bucket && objectPath) {
        const storage = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL as string,
          process.env.SUPABASE_SERVICE_ROLE_KEY as string,
        )
        await storage.storage.from(bucket).remove([objectPath])
      }
    } catch {}
  }

  const { error: delErr } = await supabaseServer.from('track').delete().eq('track_id', trackId)
  if (delErr) throw new Error(delErr.message)
  revalidatePath('/dashboard/tracks')
  return { ok: true }
}


