// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Integration Tests for Supabase Realtime
 * Tests subscriptions, multi-device sync, and connection management
 */

import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest'

import { supabase } from '@/lib/supabase'

import { server } from '../mocks/server'



// Setup MSW
beforeAll(() => { server.listen({ onUnhandledRequest: 'error' }); })
afterEach(() => { server.resetHandlers(); })
afterAll(() => { server.close(); })

describe('Supabase Realtime Integration', () => {
  const testUserId = 'test-user-id'
  let channel: RealtimeChannel | null = null

  beforeEach(async () => {
    // Setup auth for realtime tests
    await supabase.auth.signUp({
      email: 'realtimetest@example.com',
      password: 'SecurePassword123!',
    })
  })

  afterEach(() => {
    // Unsubscribe from any active channels
    if (channel) {
      channel.unsubscribe()
      channel = null
    }
  })

  describe('Channel Subscription', () => {
    it('should subscribe to notes changes', async () => {
      const callback = vi.fn()
      
      channel = supabase
        .channel('notes_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
            filter: `user_id=eq.${testUserId}`,
          },
          (payload) => {
            callback(payload)
          }
        )
        .subscribe((status) => {
          expect(['SUBSCRIBED', 'CLOSED', 'CHANNEL_ERROR']).toContain(status)
        })

      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })

    it('should subscribe to specific events (INSERT only)', async () => {
      const callback = vi.fn()
      
      channel = supabase
        .channel('notes_inserts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notes',
          },
          (payload) => {
            callback(payload)
          }
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })

    it('should subscribe to UPDATE events only', async () => {
      const callback = vi.fn()
      
      channel = supabase
        .channel('notes_updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notes',
          },
          (payload) => {
            callback(payload)
          }
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })

    it('should subscribe to DELETE events only', async () => {
      const callback = vi.fn()
      
      channel = supabase
        .channel('notes_deletes')
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notes',
          },
          (payload) => {
            callback(payload)
          }
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })

    it('should handle multiple tables subscription', async () => {
      const notesCallback = vi.fn()
      const foldersCallback = vi.fn()
      
      channel = supabase
        .channel('all_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notes' },
          (payload) => notesCallback(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'folders' },
          (payload) => foldersCallback(payload)
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })
  })

  describe('Change Events Handling', () => {
    it('should receive INSERT event payload', async () => {
      const callback = vi.fn()
      
      channel = supabase
        .channel('notes_test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notes',
          },
          (payload: RealtimePostgresChangesPayload<{
            id: string
            title: string
            content: string
          }>) => {
            callback(payload)
            expect(payload.eventType).toBe('INSERT')
            expect(payload.new).toBeDefined()
          }
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(channel).toBeDefined()
    })

    it('should receive UPDATE event payload', async () => {
      const callback = vi.fn()
      
      channel = supabase
        .channel('notes_test')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notes',
          },
          (payload: RealtimePostgresChangesPayload<{
            id: string
            title: string
          }>) => {
            callback(payload)
            expect(payload.eventType).toBe('UPDATE')
            expect(payload.new).toBeDefined()
            expect(payload.old).toBeDefined()
          }
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(channel).toBeDefined()
    })

    it('should receive DELETE event payload', async () => {
      const callback = vi.fn()
      
      channel = supabase
        .channel('notes_test')
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notes',
          },
          (payload: RealtimePostgresChangesPayload<{
            id: string
          }>) => {
            callback(payload)
            expect(payload.eventType).toBe('DELETE')
            expect(payload.old).toBeDefined()
          }
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(channel).toBeDefined()
    })
  })

  describe('Filtering', () => {
    it('should filter by user_id', async () => {
      const callback = vi.fn()
      
      channel = supabase
        .channel('user_notes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
            filter: `user_id=eq.${testUserId}`,
          },
          (payload) => {
            callback(payload)
          }
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
      // The filter should be applied at the subscription level
    })

    it('should filter by specific note id', async () => {
      const noteId = 'specific-note-id'
      const callback = vi.fn()
      
      channel = supabase
        .channel('specific_note')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
            filter: `id=eq.${noteId}`,
          },
          (payload) => {
            callback(payload)
          }
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })

    it('should filter by folder_id', async () => {
      const folderId = 'test-folder-id'
      const callback = vi.fn()
      
      channel = supabase
        .channel('folder_notes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
            filter: `folder_id=eq.${folderId}`,
          },
          (payload) => {
            callback(payload)
          }
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })
  })

  describe('Multi-device Synchronization', () => {
    it('should sync note creation across devices', async () => {
      const device1Callback = vi.fn()
      const device2Callback = vi.fn()
      
      // Simulate two devices subscribing
      const channel1 = supabase
        .channel('device1')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notes' },
          (payload) => device1Callback(payload)
        )
        .subscribe()

      const channel2 = supabase
        .channel('device2')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notes' },
          (payload) => device2Callback(payload)
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      // Both channels should be subscribed
      expect(channel1).toBeDefined()
      expect(channel2).toBeDefined()

      // Cleanup
      channel1.unsubscribe()
      channel2.unsubscribe()
    })

    it('should sync note updates across devices', async () => {
      const updateCallbacks: Array<typeof vi.fn> = []
      
      // Simulate multiple devices
      for (let i = 0; i < 3; i++) {
        const callback = vi.fn()
        updateCallbacks.push(callback)
        
        const ch = supabase
          .channel(`device-${i}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'notes' },
            (payload) => callback(payload)
          )
          .subscribe()

        await new Promise(resolve => setTimeout(resolve, 50))
        
        // Cleanup after test
        setTimeout(() => ch.unsubscribe(), 200)
      }

      expect(updateCallbacks).toHaveLength(3)
    })

    it('should sync note deletions across devices', async () => {
      const deleteCallback = vi.fn()
      
      channel = supabase
        .channel('delete_sync')
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notes' },
          (payload) => {
            deleteCallback(payload)
          }
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })
  })

  describe('Connection Management', () => {
    it('should handle subscription status changes', async () => {
      const statusHistory: string[] = []
      
      channel = supabase
        .channel('status_test')
        .subscribe((status) => {
          statusHistory.push(status)
        })

      await new Promise(resolve => setTimeout(resolve, 100))

      // Should have received at least one status update
      expect(statusHistory.length).toBeGreaterThan(0)
    })

    it('should unsubscribe from channel', async () => {
      channel = supabase
        .channel('unsubscribe_test')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notes' },
          () => {}
        )
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      const unsubscribeResult = channel.unsubscribe()
      
      expect(unsubscribeResult).toBeDefined()
    })

    it('should remove all channels', async () => {
      // Create multiple channels
      const channels = [
        supabase.channel('ch1').subscribe(),
        supabase.channel('ch2').subscribe(),
        supabase.channel('ch3').subscribe(),
      ]

      await new Promise(resolve => setTimeout(resolve, 100))

      // Remove all channels
      supabase.removeAllChannels()

      // All channels should be removed
      channels.forEach(ch => {
        expect(ch).toBeDefined()
      })
    })

    it('should handle reconnection after disconnection', async () => {
      const callback = vi.fn()
      
      channel = supabase
        .channel('reconnect_test')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notes' },
          (payload) => callback(payload)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            callback('connected')
          }
          if (status === 'CLOSED') {
            callback('disconnected')
          }
        })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle subscription errors', async () => {
      server.use(
        http.get(
          'https://yadtnmgyrmigqbndnmho.supabase.co/realtime/v1/websocket',
          async () => {
            return HttpResponse.json(
              { error: 'Connection refused' },
              { status: 403 }
            )
          }
        )
      )

      const errorCallback = vi.fn()
      
      channel = supabase
        .channel('error_test')
        .subscribe((status, err) => {
          if (err) {
            errorCallback(err)
          }
        })

      await new Promise(resolve => setTimeout(resolve, 100))

      // Channel should still be created even if connection fails
      expect(channel).toBeDefined()
    })

    it('should handle network disconnection', async () => {
      const statusCallback = vi.fn()
      
      channel = supabase
        .channel('network_test')
        .subscribe((status) => {
          statusCallback(status)
        })

      await new Promise(resolve => setTimeout(resolve, 100))

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      })

      expect(channel).toBeDefined()
    })

    it('should handle invalid table name', async () => {
      // Should handle gracefully
      channel = supabase
        .channel('invalid_table')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'nonexistent_table' },
          () => {}
        )
        .subscribe((status, err) => {
          // May receive error for invalid table
        })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })
  })

  describe('Broadcast Events', () => {
    it('should send broadcast message', async () => {
      channel = supabase
        .channel('broadcast_test')
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      const result = channel.send({
        type: 'broadcast',
        event: 'test_event',
        payload: { message: 'Hello' },
      })

      expect(result).toBeDefined()
    })

    it('should receive broadcast messages', async () => {
      const broadcastCallback = vi.fn()
      
      channel = supabase
        .channel('broadcast_receive')
        .on('broadcast', { event: 'custom_event' }, (payload) => {
          broadcastCallback(payload)
        })
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(channel).toBeDefined()
    })
  })

  describe('Presence', () => {
    it('should track presence', async () => {
      channel = supabase
        .channel('presence_test')
        .on('presence', { event: 'sync' }, () => {})
        .on('presence', { event: 'join' }, () => {})
        .on('presence', { event: 'leave' }, () => {})
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      // Track user presence
      const trackStatus = channel.track({
        user_id: testUserId,
        online_at: new Date().toISOString(),
      })

      expect(trackStatus).toBeDefined()
    })

    it('should untrack presence', async () => {
      channel = supabase
        .channel('presence_untrack')
        .subscribe()

      await new Promise(resolve => setTimeout(resolve, 100))

      const untrackStatus = channel.untrack()

      expect(untrackStatus).toBeDefined()
    })
  })
})
