import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as server from '@/lib/supabase/server'
import { POST } from './route'
import type { NextRequest } from 'next/server'

describe('POST /api/events/batch', () => {
  const insertMock = vi.fn()

  beforeEach(() => {
    insertMock.mockReset()
    const mockClient = {
      from: (_table: string) => ({ insert: insertMock }),
    }
    vi.spyOn(server, 'createSecretClient').mockReturnValue(mockClient as unknown as ReturnType<typeof server.createSecretClient>)
  })

  it('validates input and returns 400 for invalid body', async () => {
    const req = new Request('http://test/api/events/batch', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
  })

  it('inserts payload and returns 200', async () => {
    insertMock.mockResolvedValue({ error: null })
    const body = { trackId: 'abc', events: [{ type: 'LIKE', payload: { event: 'LIKE', t: 1 } }] }
    const req = new Request('http://test/api/events/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(200)
    expect(insertMock).toHaveBeenCalledWith({ track_id: 'abc', payload: { events: body.events } })
  })
})


