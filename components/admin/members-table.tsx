'use client'

import { useState, useTransition } from 'react'
import { setMemberStatus, setMemberRole, setChapterAdminScope } from '@/actions/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { ChapterPicker, type Chapter } from '@/components/forms/chapter-picker'
import { describeChapterScope } from '@/lib/chapter-scope'

type Status = 'pending' | 'active' | 'suspended'
type Role = 'member' | 'chapter_admin' | 'super_admin'

interface Member {
  id: string
  full_name: string
  eo_chapter: string | null
  role: Role
  status: Status
  created_at: string
  eo_membership_email: string | null
  admin_scope_country: string | null
  admin_scope_city: string | null
}

const STATUS_VARIANTS: Record<Status, string> = {
  active: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  suspended: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
}

interface MembersTableProps {
  members: Member[]
  canChangeRole: boolean
  chapters: Chapter[]
}

export function MembersTable({ members, canChangeRole, chapters }: MembersTableProps) {
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [search, setSearch] = useState('')

  const filtered = members.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return m.full_name.toLowerCase().includes(q) || m.eo_chapter?.toLowerCase().includes(q) || m.eo_membership_email?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
        <input
          placeholder="Search by name, email, chapter…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm"
        />
        <div className="flex gap-1">
          {(['all', 'pending', 'active', 'suspended'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize',
                filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              )}
            >
              {s} {s !== 'all' && `(${members.filter(m => m.status === s).length})`}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Chapter</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Joined</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <MemberRow key={m.id} member={m} canChangeRole={canChangeRole} chapters={chapters} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                  No members match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MemberRow({ member, canChangeRole, chapters }: { member: Member; canChangeRole: boolean; chapters: Chapter[] }) {
  const [isPending, startTransition] = useTransition()
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false)

  const changeStatus = (status: Status) =>
    startTransition(() => { setMemberStatus(member.id, status) })

  const changeRole = (role: Role) => {
    if (role === 'chapter_admin') {
      // Prompt for scope before applying — admin needs a chapter assignment.
      setScopeDialogOpen(true)
      // Optimistically update role too:
      startTransition(() => { setMemberRole(member.id, role) })
      return
    }
    startTransition(() => { setMemberRole(member.id, role) })
  }

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-muted/20">
        <td className="p-3">
          <p className="font-medium">{member.full_name}</p>
          {member.eo_membership_email && (
            <p className="text-xs text-muted-foreground">{member.eo_membership_email}</p>
          )}
        </td>
        <td className="p-3 text-muted-foreground">{member.eo_chapter ?? '—'}</td>
        <td className="p-3">
          {canChangeRole ? (
            <div className="flex flex-col gap-1">
              <Select value={member.role} onValueChange={(v: string | null) => v && changeRole(v as Role)}>
                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="chapter_admin">Chapter Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              {member.role === 'chapter_admin' && (
                <button
                  type="button"
                  onClick={() => setScopeDialogOpen(true)}
                  className="text-[11px] text-left text-muted-foreground hover:text-foreground hover:underline"
                >
                  Scope: {describeChapterScope({ country: member.admin_scope_country, city: member.admin_scope_city })}
                </button>
              )}
            </div>
          ) : (
            <span className="capitalize text-xs">{member.role.replace('_', ' ')}</span>
          )}
        </td>
        <td className="p-3">
          <Badge className={cn('border', STATUS_VARIANTS[member.status])}>{member.status}</Badge>
        </td>
        <td className="p-3 text-muted-foreground text-xs">
          {format(new Date(member.created_at), 'MMM d, yyyy')}
        </td>
        <td className="p-3 text-right space-x-1">
          {member.status !== 'active' && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => changeStatus('active')}>
              Approve
            </Button>
          )}
          {member.status !== 'suspended' && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => changeStatus('suspended')}
              className="text-destructive hover:text-destructive">
              Suspend
            </Button>
          )}
        </td>
      </tr>
      <ScopeDialog
        open={scopeDialogOpen}
        onOpenChange={setScopeDialogOpen}
        member={member}
        chapters={chapters}
      />
    </>
  )
}

function ScopeDialog({
  open, onOpenChange, member, chapters,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  member: Member
  chapters: Chapter[]
}) {
  const [isPending, startTransition] = useTransition()
  // Match the chapter that corresponds to the member's current scope, if any.
  const initial = chapters.find(c =>
    c.country === member.admin_scope_country &&
    (c.city ?? null) === (member.admin_scope_city ?? null)
  ) ?? null
  const [chapter, setChapter] = useState<Chapter | null>(initial)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    setError(null)
    if (!chapter) {
      setError('Pick a chapter to scope this admin to')
      return
    }
    if (!chapter.country) {
      setError('This chapter has no country — pick a country-based chapter')
      return
    }
    startTransition(async () => {
      const res = await setChapterAdminScope(member.id, {
        country: chapter.country,
        city: chapter.city,
      })
      if (res.error) setError(res.error)
      else onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set admin scope for {member.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Pick the EO chapter this admin will manage. Members and businesses in that chapter
            (matched by country, plus city for city-level chapters) become moderatable.
          </p>
          <ChapterPicker
            chapters={chapters.filter(c => c.country !== null)}
            value={chapter?.name ?? null}
            onChange={setChapter}
            placeholder="Select chapter to administer…"
          />
          {chapter && (
            <p className="text-xs text-muted-foreground">
              Will manage: <span className="text-foreground">{describeChapterScope({ country: chapter.country, city: chapter.city })}</span>
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={save} disabled={isPending || !chapter}>
            {isPending ? 'Saving…' : 'Save scope'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
