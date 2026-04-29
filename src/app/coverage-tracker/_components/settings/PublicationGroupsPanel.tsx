'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { PublicationGroup } from './types'

interface Props {
  groups:    PublicationGroup[]
  onRefresh: () => void
}

export default function PublicationGroupsPanel({ groups, onRefresh }: Props) {
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [newName,     setNewName]     = useState('')
  const [newNote,     setNewNote]     = useState('')
  const [newMembers,  setNewMembers]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [addInputs,   setAddInputs]   = useState<Record<string, string>>({})
  const [groupSaving, setGroupSaving] = useState<Record<string, boolean>>({})
  const [groupErrors, setGroupErrors] = useState<Record<string, string | null>>({})

  async function createGroup() {
    const name    = newName.trim()
    const members = newMembers.split('\n').map(s => s.trim()).filter(Boolean)
    if (!name) { setError('Group name is required'); return }

    setSaving(true); setError(null)
    const res  = await fetch('/api/coverage-tracker/settings/publication-groups', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, note: newNote || undefined, members }),
    })
    const data = await res.json() as { error?: string }
    setSaving(false)

    if (!res.ok && res.status !== 207) { setError(data.error ?? 'Failed to create group'); return }
    setNewName(''); setNewNote(''); setNewMembers('')
    onRefresh()
  }

  async function addMembersToGroup(groupId: string) {
    const raw = (addInputs[groupId] ?? '').trim()
    if (!raw) return
    const toAdd = raw.split('\n').map(s => s.trim()).filter(Boolean)
    if (toAdd.length === 0) return

    setGroupSaving(s => ({ ...s, [groupId]: true }))
    setGroupErrors(e => ({ ...e, [groupId]: null }))

    const res  = await fetch(`/api/coverage-tracker/settings/publication-groups/${groupId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ addMembers: toAdd }),
    })
    const data = await res.json() as { error?: string }
    setGroupSaving(s => ({ ...s, [groupId]: false }))

    if (!res.ok) {
      setGroupErrors(e => ({ ...e, [groupId]: data.error ?? 'Failed to add members' }))
      return
    }
    setAddInputs(a => ({ ...a, [groupId]: '' }))
    onRefresh()
  }

  async function removeMember(groupId: string, memberId: string) {
    setGroupSaving(s => ({ ...s, [groupId]: true }))
    setGroupErrors(e => ({ ...e, [groupId]: null }))

    const res  = await fetch(`/api/coverage-tracker/settings/publication-groups/${groupId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ removeIds: [memberId] }),
    })
    const data = await res.json() as { error?: string }
    setGroupSaving(s => ({ ...s, [groupId]: false }))

    if (!res.ok) {
      setGroupErrors(e => ({ ...e, [groupId]: data.error ?? 'Failed to remove member' }))
      return
    }
    onRefresh()
  }

  async function deleteGroup(groupId: string, groupName: string) {
    if (!confirm(`Delete "${groupName}"? This cannot be undone and will break any rules that reference it.`)) return

    setGroupSaving(s => ({ ...s, [groupId]: true }))
    setGroupErrors(e => ({ ...e, [groupId]: null }))

    const res  = await fetch(`/api/coverage-tracker/settings/publication-groups/${groupId}`, { method: 'DELETE' })
    const data = await res.json() as { error?: string }
    setGroupSaving(s => ({ ...s, [groupId]: false }))

    if (!res.ok) {
      setGroupErrors(e => ({ ...e, [groupId]: data.error ?? 'Failed to delete group' }))
      return
    }
    if (expanded === groupId) setExpanded(null)
    onRefresh()
  }

  return (
    <div>
      {groups.length === 0 && (
        <p className="sm-groups-empty">No publication groups yet. Create one below.</p>
      )}

      {groups.map(g => {
        const isExpanded = expanded === g.id
        const isSaving   = groupSaving[g.id] ?? false
        const groupError = groupErrors[g.id] ?? null
        const addInput   = addInputs[g.id] ?? ''

        return (
          <div key={g.id} className="sm-group-row">
            <div className="sm-group-header">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : g.id)}
                className="sm-group-expand-btn"
              >
                <span className="sm-group-caret">{isExpanded ? '▼' : '▶'}</span>
                <span className="sm-group-name">{g.name}</span>
                <span className="sm-group-count">{g.members.length} {g.members.length === 1 ? 'publication' : 'publications'}</span>
              </button>

              <button
                type="button"
                onClick={() => deleteGroup(g.id, g.name)}
                disabled={isSaving}
                title="Delete group"
                className="sm-group-delete-btn"
              >
                Delete
              </button>
            </div>

            {isExpanded && (
              <div className="sm-group-body">
                {g.note && <p className="sm-group-note">{g.note}</p>}

                {g.members.length === 0 ? (
                  <p className="sm-members-empty">No members yet.</p>
                ) : (
                  <div className="sm-member-chips">
                    {g.members.map(m => (
                      <span key={m.id} className="sm-member-chip">
                        {m.value}
                        <button
                          type="button"
                          onClick={() => removeMember(g.id, m.id)}
                          disabled={isSaving}
                          aria-label={`Remove ${m.value}`}
                          className="sm-member-remove-btn"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2">
                  <label className="sm-label">Add publications — one per line</label>
                  <textarea
                    className={cn('sm-input', 'sm-textarea-resize')}
                    value={addInput}
                    onChange={e => setAddInputs(a => ({ ...a, [g.id]: e.target.value }))}
                    placeholder={'Nine Network\nSeven Network\n…'}
                    disabled={isSaving}
                  />
                </div>

                {groupError && <p className="sm-group-error">{groupError}</p>}

                <button
                  type="button"
                  className="sm-btn-ghost mt-2"
                  onClick={() => addMembersToGroup(g.id)}
                  disabled={!addInput.trim() || isSaving}
                >
                  {isSaving ? 'Saving…' : '+ Add Members'}
                </button>
              </div>
            )}
          </div>
        )
      })}

      <div className="sm-new-group-panel">
        <p className="sm-new-group-title">New Publication Group</p>

        <div className="sm-new-group-row">
          <div className="sm-new-group-field">
            <label className="sm-label">Group Name</label>
            <input
              type="text"
              className="sm-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. TV Broadcasters"
              maxLength={200}
            />
          </div>
          <div className="sm-new-group-field">
            <label className="sm-label">Note (optional)</label>
            <input
              type="text"
              className="sm-input"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="What is this group for?"
              maxLength={500}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="sm-label">Publications — one per line (exact names from Meltwater exports)</label>
          <textarea
            className={cn('sm-input', 'sm-textarea-lg')}
            value={newMembers}
            onChange={e => setNewMembers(e.target.value)}
            placeholder={'Nine Network\nSeven Network\nABC News\n…'}
          />
        </div>

        {error && <p className="sm-group-error--create">{error}</p>}

        <button type="button" className="sm-btn-primary" onClick={createGroup} disabled={saving}>
          {saving ? 'Creating…' : 'Create Group'}
        </button>
      </div>
    </div>
  )
}
