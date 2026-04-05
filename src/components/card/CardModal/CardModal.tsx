'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Card, Label, BoardMember, Checklist, ChecklistItem, Comment, Activity, CardRelation, RelationType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useBoardStore } from '@/store/board.store'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Edit2, Users, Tag, Clock, AlignLeft, CheckSquare, Paperclip,
  MessageSquare, Activity as ActivityIcon, Archive, Copy, Loader2, Plus, Trash2, MoveRight, Link2, X, LayoutTemplate
} from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createNotifications } from '@/lib/createNotification'

interface CardModalProps {
  cardId: string
  boardId: string
  labels: Label[]
  boardMembers: BoardMember[]
  onClose: () => void
}

type SidebarPanel = 'members' | 'labels' | 'duedate' | null

export default function CardModal({ cardId, boardId, labels, boardMembers, onClose }: CardModalProps) {
  const supabase = createClient()
  const { updateCard, addCard } = useBoardStore()
  const currentUser = useAuthStore((s) => s.user)

  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')

  // Description
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState('')

  // Comments
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentValue, setEditingCommentValue] = useState('')

  // Checklists
  const [addingChecklistTitle, setAddingChecklistTitle] = useState('')
  const [showAddChecklist, setShowAddChecklist] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState<Record<string, string>>({})
  const [showAddItem, setShowAddItem] = useState<Record<string, boolean>>({})

  // Sidebar panel
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>(null)

  // Labels - board etiketleri (prop'tan alınır + yeniler eklenir)
  const [boardLabels, setBoardLabels] = useState<Label[]>(labels)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#0079bf')
  const [creatingLabel, setCreatingLabel] = useState(false)

  // Due date
  const [dueDateStart, setDueDateStart] = useState('')
  const [dueDateEnd, setDueDateEnd] = useState('')

  // Priority
  const [priority, setPriority] = useState<string>('normal')

  // ── Task 1: Move Card State ─────────────────────────────
  const [movePanel, setMovePanel] = useState(false)
  const [moveWorkspaceId, setMoveWorkspaceId] = useState('')
  const [moveBoardId, setMoveBoardId] = useState('')
  const [moveListId, setMoveListId] = useState('')
  const [moveWorkspaces, setMoveWorkspaces] = useState<{id:string,name:string}[]>([])
  const [moveBoards, setMoveBoards] = useState<{id:string,title:string}[]>([])
  const [moveLists, setMoveLists] = useState<{id:string,title:string}[]>([])
  const [moving, setMoving] = useState(false)

  // Attachments
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // @mention
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Task 2: Card Relations State ────────────────────────
  const [showRelationForm, setShowRelationForm] = useState(false)
  const [relationType, setRelationType] = useState<RelationType>('relates_to')
  const [relationSearch, setRelationSearch] = useState('')
  const [relationResults, setRelationResults] = useState<{id:string,title:string}[]>([])
  const [selectedRelatedCard, setSelectedRelatedCard] = useState<{id:string,title:string}|null>(null)
  const relationSearchTimeout = useRef<NodeJS.Timeout | null>(null)

  const fetchCard = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        card_members(user_id, users(id, full_name, avatar_url)),
        card_labels(label_id, labels(id, name, color)),
        checklists(*, checklist_items(*)),
        comments(*, users(id, full_name, avatar_url)),
        attachments(*),
        activities(*, users(id, full_name, avatar_url))
      `)
      .eq('id', cardId)
      .single()

    if (error || !data) {
      toast.error('Kart yüklenemedi')
      setLoading(false)
      return
    }

    // card_relations ayrı query ile yükle (tablo yoksa hata sessizce yok sayılır)
    let relations: CardRelation[] = []
    try {
      const { data: relData } = await supabase
        .from('card_relations')
        .select('id, relation_type, related_card_id')
        .eq('card_id', cardId)
      if (relData && relData.length > 0) {
        // İlişkili kart başlıklarını tek sorguda çek
        const relatedIds = relData.map((r: { related_card_id: string }) => r.related_card_id)
        const { data: relatedCards } = await supabase
          .from('cards')
          .select('id, title')
          .in('id', relatedIds)
        const cardMap = Object.fromEntries((relatedCards ?? []).map((c: { id: string; title: string }) => [c.id, c]))
        relations = relData.map((r: { id: string; relation_type: RelationType; related_card_id: string }) => ({
          id: r.id,
          card_id: cardId,
          related_card_id: r.related_card_id,
          relation_type: r.relation_type,
          created_by: '',
          created_at: '',
          related_card: cardMap[r.related_card_id] ?? null,
        }))
      }
    } catch {
      // card_relations tablosu yoksa devam et
    }

    // Normalize joined data
    const normalized: Card = {
      ...data,
      members: (data.card_members ?? []).map((m: { user_id: string; users: unknown }) => ({
        card_id: cardId,
        user_id: m.user_id,
        assigned_at: '',
        user: m.users as Card['members'] extends (infer U)[] ? (U extends { user?: infer V } ? V : never) : never,
      })),
      labels: (data.card_labels ?? []).map((cl: { label_id: string; labels: unknown }) => cl.labels as Label),
      checklists: (data.checklists ?? []).map((cl: Checklist & { checklist_items?: ChecklistItem[] }) => ({
        ...cl,
        items: cl.checklist_items ?? [],
      })),
      comments: data.comments ?? [],
      attachments: data.attachments ?? [],
      activities: (data.activities ?? []).sort(
        (a: Activity, b: Activity) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      relations,
    }

    setCard(normalized)
    setTitleValue(normalized.title)
    setDescValue(normalized.description ?? '')
    setDueDateStart(normalized.due_date_start?.slice(0, 10) ?? '')
    setDueDateEnd(normalized.due_date_end?.slice(0, 10) ?? '')
    setPriority(normalized.priority ?? 'normal')
    setLoading(false)
  }, [cardId, supabase])

  useEffect(() => {
    fetchCard()
  }, [fetchCard])

  // ── Move Card: fetch workspaces when panel opens ────────
  useEffect(() => {
    if (!movePanel) return
    supabase.from('workspaces').select('id, name').then(({ data }) => {
      setMoveWorkspaces(data ?? [])
      setMoveWorkspaceId('')
      setMoveBoardId('')
      setMoveListId('')
      setMoveBoards([])
      setMoveLists([])
    })
  }, [movePanel, supabase])

  // ── Move Card: fetch boards when workspace changes ──────
  useEffect(() => {
    if (!moveWorkspaceId) { setMoveBoards([]); setMoveListId(''); setMoveLists([]); return }
    supabase
      .from('boards')
      .select('id, title')
      .eq('workspace_id', moveWorkspaceId)
      .eq('is_archived', false)
      .then(({ data }) => {
        setMoveBoards(data ?? [])
        setMoveBoardId('')
        setMoveListId('')
        setMoveLists([])
      })
  }, [moveWorkspaceId, supabase])

  // ── Move Card: fetch lists when board changes ───────────
  useEffect(() => {
    if (!moveBoardId) { setMoveLists([]); setMoveListId(''); return }
    supabase
      .from('lists')
      .select('id, title')
      .eq('board_id', moveBoardId)
      .eq('is_archived', false)
      .then(({ data }) => {
        setMoveLists(data ?? [])
        setMoveListId('')
      })
  }, [moveBoardId, supabase])

  // ── Task 2: search cards when typing ───────────────────
  useEffect(() => {
    if (relationSearchTimeout.current) clearTimeout(relationSearchTimeout.current)
    if (relationSearch.length < 3) { setRelationResults([]); return }
    relationSearchTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('cards')
        .select('id, title')
        .ilike('title', `%${relationSearch}%`)
        .neq('id', cardId)
        .limit(8)
      setRelationResults(data ?? [])
    }, 300)
    return () => { if (relationSearchTimeout.current) clearTimeout(relationSearchTimeout.current) }
  }, [relationSearch, cardId, supabase])

  const logActivity = async (action_type: string, description: string, metadata: Record<string, unknown> = {}) => {
    if (!currentUser) return
    await supabase.from('activities').insert({
      board_id: boardId,
      card_id: cardId,
      user_id: currentUser.id,
      action_type,
      description,
      metadata,
    })
  }

  // ── Title ──────────────────────────────────────────────
  const handleSaveTitle = async () => {
    if (!titleValue.trim() || titleValue === card?.title) {
      setEditingTitle(false)
      return
    }
    const { error } = await supabase.from('cards').update({ title: titleValue.trim() }).eq('id', cardId)
    if (error) { toast.error('Başlık güncellenemedi'); return }
    updateCard(cardId, { title: titleValue.trim() })
    setCard((prev) => prev ? { ...prev, title: titleValue.trim() } : prev)
    await logActivity('update_title', `"${titleValue.trim()}" başlığı güncellendi`)
    setEditingTitle(false)
  }

  // ── Description ────────────────────────────────────────
  const handleSaveDesc = async () => {
    const { error } = await supabase.from('cards').update({ description: descValue }).eq('id', cardId)
    if (error) { toast.error('Açıklama güncellenemedi'); return }
    updateCard(cardId, { description: descValue })
    setCard((prev) => prev ? { ...prev, description: descValue } : prev)
    await logActivity('update_description', 'Açıklama güncellendi')
    setEditingDesc(false)
  }

  // ── Priority ───────────────────────────────────────────
  const handlePriorityChange = async (value: string | null) => {
    if (!value) return
    setPriority(value)
    const { error } = await supabase.from('cards').update({ priority: value }).eq('id', cardId)
    if (error) { toast.error('Öncelik güncellenemedi'); return }
    updateCard(cardId, { priority: value as Card['priority'] })
    setCard((prev) => prev ? { ...prev, priority: value as Card['priority'] } : prev)
    await logActivity('update_priority', `Öncelik "${value}" olarak güncellendi`)
  }

  // ── Due Date ───────────────────────────────────────────
  const handleSaveDueDate = async () => {
    const updates = {
      due_date_start: dueDateStart || null,
      due_date_end: dueDateEnd || null,
    }
    const { error } = await supabase.from('cards').update(updates).eq('id', cardId)
    if (error) { toast.error('Tarih güncellenemedi'); return }
    updateCard(cardId, updates)
    setCard((prev) => prev ? { ...prev, ...updates } : prev)
    await logActivity('update_due_date', 'Tarih güncellendi')
    setSidebarPanel(null)
    toast.success('Tarih güncellendi')
  }

  // ── Labels ─────────────────────────────────────────────
  const handleToggleLabel = async (labelId: string) => {
    if (!card) return
    const currentLabels = (card.labels ?? []) as Label[]
    const isActive = currentLabels.some((l) => l.id === labelId)

    if (isActive) {
      await supabase.from('card_labels').delete().eq('card_id', cardId).eq('label_id', labelId)
      const updated = currentLabels.filter((l) => l.id !== labelId)
      setCard((prev) => prev ? { ...prev, labels: updated } : prev)
    } else {
      await supabase.from('card_labels').insert({ card_id: cardId, label_id: labelId })
      const label = labels.find((l) => l.id === labelId)
      if (label) {
        setCard((prev) => prev ? { ...prev, labels: [...currentLabels, label] } : prev)
      }
    }
  }

  // ── Members ────────────────────────────────────────────
  const handleToggleMember = async (memberId: string) => {
    if (!card) return
    const currentMembers = card.members ?? []
    const isActive = currentMembers.some((m) => m.user_id === memberId)

    if (isActive) {
      await supabase.from('card_members').delete().eq('card_id', cardId).eq('user_id', memberId)
      setCard((prev) =>
        prev ? { ...prev, members: (prev.members ?? []).filter((m) => m.user_id !== memberId) } : prev
      )
    } else {
      await supabase.from('card_members').insert({ card_id: cardId, user_id: memberId })
      const bm = boardMembers.find((m) => m.user_id === memberId)
      if (bm) {
        setCard((prev) =>
          prev
            ? {
                ...prev,
                members: [
                  ...(prev.members ?? []),
                  { card_id: cardId, user_id: memberId, assigned_at: new Date().toISOString(), user: bm.user },
                ],
              }
            : prev
        )
        // Bildirim: atanan kişiye (kendisi atıyorsa gönderme)
        if (memberId !== currentUser?.id) {
          await createNotifications([memberId], {
            type: 'card_assigned',
            title: 'Karta atandınız',
            message: `${currentUser?.full_name ?? 'Biri'} sizi "${card?.title}" kartına atadı`,
            linkUrl: `/board/${boardId}`,
          })
        }
      }
    }
  }

  // ── Checklist ──────────────────────────────────────────
  const handleAddChecklist = async () => {
    if (!addingChecklistTitle.trim()) return
    const { data, error } = await supabase
      .from('checklists')
      .insert({ card_id: cardId, title: addingChecklistTitle.trim(), position: (card?.checklists ?? []).length })
      .select()
      .single()
    if (error) { toast.error('Kontrol listesi eklenemedi'); return }
    setCard((prev) => prev ? { ...prev, checklists: [...(prev.checklists ?? []), { ...data, items: [] }] } : prev)
    setAddingChecklistTitle('')
    setShowAddChecklist(false)
    await logActivity('add_checklist', `"${data.title}" kontrol listesi eklendi`)
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    await supabase.from('checklists').delete().eq('id', checklistId)
    setCard((prev) =>
      prev ? { ...prev, checklists: (prev.checklists ?? []).filter((cl) => cl.id !== checklistId) } : prev
    )
  }

  const handleAddChecklistItem = async (checklistId: string) => {
    const title = newItemTitle[checklistId]?.trim()
    if (!title) return
    const checklist = card?.checklists?.find((cl) => cl.id === checklistId)
    const { data, error } = await supabase
      .from('checklist_items')
      .insert({ checklist_id: checklistId, title, position: (checklist?.items ?? []).length, is_completed: false })
      .select()
      .single()
    if (error) { toast.error('Madde eklenemedi'); return }
    setCard((prev) =>
      prev
        ? {
            ...prev,
            checklists: (prev.checklists ?? []).map((cl) =>
              cl.id === checklistId ? { ...cl, items: [...(cl.items ?? []), data] } : cl
            ),
          }
        : prev
    )
    setNewItemTitle((prev) => ({ ...prev, [checklistId]: '' }))
  }

  const handleToggleChecklistItem = async (checklistId: string, itemId: string, current: boolean) => {
    await supabase.from('checklist_items').update({ is_completed: !current }).eq('id', itemId)
    setCard((prev) =>
      prev
        ? {
            ...prev,
            checklists: (prev.checklists ?? []).map((cl) =>
              cl.id === checklistId
                ? {
                    ...cl,
                    items: (cl.items ?? []).map((item) =>
                      item.id === itemId ? { ...item, is_completed: !current } : item
                    ),
                  }
                : cl
            ),
          }
        : prev
    )
  }

  // ── Comments ───────────────────────────────────────────
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser) return
    setSubmittingComment(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ card_id: cardId, user_id: currentUser.id, content: newComment.trim() })
      .select('*, users(id, full_name, avatar_url)')
      .single()
    setSubmittingComment(false)
    if (error) { toast.error('Yorum eklenemedi'); return }
    setCard((prev) => prev ? { ...prev, comments: [...(prev.comments ?? []), data] } : prev)
    setNewComment('')
    await logActivity('add_comment', 'Yorum eklendi')
    // Bildirim: kart üyelerine (yorum yapan hariç)
    const memberIds = (card?.members ?? [])
      .map((m) => m.user_id)
      .filter((id) => id !== currentUser.id)
    if (memberIds.length > 0) {
      await createNotifications(memberIds, {
        type: 'card_comment',
        title: 'Yeni yorum',
        message: `${currentUser.full_name} "${card?.title}" kartına yorum ekledi`,
        linkUrl: `/board/${boardId}`,
      })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId)
    setCard((prev) =>
      prev ? { ...prev, comments: (prev.comments ?? []).filter((c) => c.id !== commentId) } : prev
    )
  }

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentValue.trim()) return
    const { error } = await supabase
      .from('comments')
      .update({ content: editingCommentValue.trim(), updated_at: new Date().toISOString() })
      .eq('id', commentId)
    if (error) { toast.error('Yorum güncellenemedi'); return }
    setCard((prev) =>
      prev
        ? {
            ...prev,
            comments: (prev.comments ?? []).map((c) =>
              c.id === commentId ? { ...c, content: editingCommentValue.trim() } : c
            ),
          }
        : prev
    )
    setEditingCommentId(null)
    setEditingCommentValue('')
  }

  // ── Archive ────────────────────────────────────────────
  const handleArchive = async () => {
    const { error } = await supabase.from('cards').update({ is_archived: true }).eq('id', cardId)
    if (error) { toast.error('Kart arşivlenemedi'); return }
    updateCard(cardId, { is_archived: true })
    await logActivity('archive_card', 'Kart arşivlendi')
    toast.success('Kart arşivlendi')
    onClose()
  }

  // ── Save as Template ───────────────────────────────────
  const handleSaveAsTemplate = async () => {
    if (!card) return
    let userId = currentUser?.id
    if (!userId) {
      const { data: { user: su } } = await supabase.auth.getUser()
      userId = su?.id
    }
    if (!userId) { toast.error('Oturum bilgisi alınamadı'); return }

    const checklistData = (card.checklists ?? []).map((cl) => ({
      title: cl.title,
      items: (cl.items ?? []).map((item) => ({ title: item.title })),
    }))

    const { error } = await supabase.from('card_templates').insert({
      title: card.title,
      description: card.description,
      checklist_data: checklistData,
      created_by: userId,
    })
    if (error) { toast.error('Şablon kaydedilemedi: ' + error.message); return }
    toast.success(`"${card.title}" şablon olarak kaydedildi`)
  }

  // ── Copy Card ──────────────────────────────────────────
  const handleCopyCard = async () => {
    if (!card) return
    // currentUser store'dan null gelebilir, session'dan fallback al
    let userId = currentUser?.id
    if (!userId) {
      const { data: { user: sessionUser } } = await supabase.auth.getUser()
      userId = sessionUser?.id
    }
    if (!userId) { toast.error('Oturum bilgisi alınamadı'); return }
    const { data, error } = await supabase
      .from('cards')
      .insert({
        list_id: card.list_id,
        title: `${card.title} (Kopya)`,
        description: card.description,
        priority: card.priority,
        position: (card.position ?? 0) + 1,
        created_by: userId,
      })
      .select()
      .single()
    if (error) { toast.error('Kart kopyalanamadı: ' + error.message); return }
    addCard(card.list_id, data)
    toast.success('Kart kopyalandı')
    await logActivity('copy_card', `"${card.title}" kartı kopyalandı`, { new_card_id: data.id })
  }

  // ── Task 1: Move Card ──────────────────────────────────
  const handleMoveCard = async () => {
    if (!moveListId) { toast.error('Lütfen bir liste seçin'); return }
    setMoving(true)
    try {
      const { error } = await supabase
        .from('cards')
        .update({ list_id: moveListId, position: 0 })
        .eq('id', cardId)
      if (error) { toast.error('Kart taşınamadı'); return }
      await logActivity('move_card', `Kart başka bir board\'a taşındı`, { target_list_id: moveListId })
      useBoardStore.getState().removeCard(cardId)
      toast.success('Kart taşındı')
      onClose()
    } finally {
      setMoving(false)
    }
  }

  // ── Task 2: Add Relation ───────────────────────────────
  const reverseRelationType = (type: RelationType): RelationType => {
    if (type === 'blocks') return 'blocked_by'
    if (type === 'blocked_by') return 'blocks'
    return type // relates_to ve duplicates simetriktir
  }

  const handleAddRelation = async () => {
    if (!selectedRelatedCard) { toast.error('Lütfen bir kart seçin'); return }
    const userId = currentUser?.id

    // A → B
    const { error } = await supabase.from('card_relations').insert({
      card_id: cardId,
      related_card_id: selectedRelatedCard.id,
      relation_type: relationType,
      created_by: userId,
    })
    if (error) { toast.error('İlişki eklenemedi'); return }

    // B → A (ters yön, zaten varsa ignore et)
    await supabase.from('card_relations').insert({
      card_id: selectedRelatedCard.id,
      related_card_id: cardId,
      relation_type: reverseRelationType(relationType),
      created_by: userId,
    })

    toast.success('İlişki eklendi')
    setShowRelationForm(false)
    setRelationSearch('')
    setRelationResults([])
    setSelectedRelatedCard(null)
    setRelationType('relates_to')
    fetchCard()
  }

  const handleDeleteRelation = async (relationId: string) => {
    // Silinecek ilişkiyi bul (ters yönünü de silmek için)
    const rel = card?.relations?.find((r) => r.id === relationId)
    const { error } = await supabase.from('card_relations').delete().eq('id', relationId)
    if (error) { toast.error('İlişki silinemedi'); return }

    // Ters yönü de sil (B kartındaki A→B kaydı)
    if (rel) {
      await supabase
        .from('card_relations')
        .delete()
        .eq('card_id', rel.related_card_id)
        .eq('related_card_id', cardId)
    }

    setCard((prev) => prev ? { ...prev, relations: (prev.relations ?? []).filter((r) => r.id !== relationId) } : prev)
  }

  // ── Attachment handlers ──────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // userId: store'dan veya session'dan al
    let userId = currentUser?.id
    if (!userId) {
      const { data: { user: sessionUser } } = await supabase.auth.getUser()
      userId = sessionUser?.id
    }
    if (!userId) { toast.error('Oturum bilgisi alınamadı'); return }

    if (file.size > 10 * 1024 * 1024) { toast.error('Dosya boyutu 10MB\'dan büyük olamaz'); return }
    setUploading(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `cards/${cardId}/${Date.now()}_${safeName}`

      // Bucket'ı server-side (service role) ile oluştur/public yap
      const initRes = await fetch('/api/storage/init', { method: 'POST' })
      if (!initRes.ok) {
        const initErr = await initRes.json().catch(() => ({}))
        toast.error('Storage hazırlanamadı: ' + (initErr.error ?? 'Bilinmeyen hata'))
        return
      }

      const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file, { upsert: false })
      if (uploadError) { toast.error('Dosya yüklenemedi: ' + uploadError.message); return }

      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)
      const { data, error } = await supabase
        .from('attachments')
        .insert({ card_id: cardId, user_id: userId, file_name: file.name, file_url: publicUrl, file_size: file.size, file_type: file.type })
        .select().single()
      if (error) { toast.error('Ek kaydedilemedi: ' + error.message); return }
      setCard((prev) => prev ? { ...prev, attachments: [...(prev.attachments ?? []), data] } : prev)
      toast.success('Dosya yüklendi')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteAttachment = async (attId: string, fileUrl: string) => {
    try {
      const urlParts = fileUrl.split('/object/public/attachments/')
      if (urlParts[1]) await supabase.storage.from('attachments').remove([urlParts[1]])
    } catch { /* storage hatası kritik değil */ }
    await supabase.from('attachments').delete().eq('id', attId)
    setCard((prev) => prev ? { ...prev, attachments: (prev.attachments ?? []).filter((a) => a.id !== attId) } : prev)
    toast.success('Ek silindi')
  }

  // ─────────────────────────────────────────────────────
  const cardLabels = (card?.labels ?? []) as Label[]
  const totalItems = (card?.checklists ?? []).reduce((a, cl) => a + (cl.items?.length ?? 0), 0)
  const completedItems = (card?.checklists ?? []).reduce(
    (a, cl) => a + (cl.items?.filter((i) => i.is_completed).length ?? 0),
    0
  )
  const checklistProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  const priorityLabels: Record<string, string> = {
    low: 'Düşük', normal: 'Normal', high: 'Yüksek', urgent: 'Acil',
  }
  const priorityColors: Record<string, string> = {
    low: 'text-green-600', normal: 'text-gray-600', high: 'text-orange-600', urgent: 'text-red-600',
  }

  const relationTypeLabels: Record<RelationType, string> = {
    relates_to: 'İlgili',
    blocks: 'Blokluyor',
    blocked_by: 'Bloklanmış',
    duplicates: 'Kopya',
  }
  const relationTypeBadgeColors: Record<RelationType, string> = {
    relates_to: 'bg-blue-100 text-blue-700',
    blocks: 'bg-red-100 text-red-700',
    blocked_by: 'bg-orange-100 text-orange-700',
    duplicates: 'bg-gray-100 text-gray-700',
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-none sm:max-w-2xl md:max-w-3xl p-0 overflow-hidden max-h-[100dvh] sm:max-h-[90vh] flex flex-col sm:rounded-xl rounded-none"
      >
        <DialogTitle className="sr-only">{card?.title ?? 'Kart Detayı'}</DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !card ? (
          <div className="p-8 text-center text-gray-500">Kart bulunamadı.</div>
        ) : (
          <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
            {/* ── Left Column ───────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* Title */}
              <div className="flex items-start gap-2">
                <Edit2 className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  {editingTitle ? (
                    <Input
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onBlur={handleSaveTitle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle()
                        if (e.key === 'Escape') setEditingTitle(false)
                      }}
                      className="text-base font-semibold"
                      autoFocus
                    />
                  ) : (
                    <h2
                      className="text-base font-semibold text-gray-800 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-1 -mx-1 py-0.5"
                      onClick={() => setEditingTitle(true)}
                    >
                      {card.title}
                    </h2>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Öncelik:{' '}
                    <span className={priorityColors[card.priority]}>{priorityLabels[card.priority]}</span>
                  </p>
                </div>
              </div>

              {/* Labels */}
              {cardLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {cardLabels.map((label) => (
                    <Badge
                      key={label.id}
                      className="text-white text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Members */}
              {(card.members ?? []).length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div className="flex -space-x-1">
                    {(card.members ?? []).map((m) => (
                      <Avatar key={m.user_id} className="w-7 h-7 border-2 border-white dark:border-gray-800">
                        <AvatarImage src={m.user?.avatar_url ?? ''} />
                        <AvatarFallback className="text-[10px] bg-blue-500 text-white">
                          {m.user?.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              )}

              {/* Due Dates */}
              {(card.due_date_start || card.due_date_end) && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {card.due_date_start && (
                    <span>Başlangıç: {format(new Date(card.due_date_start), 'd MMM yyyy', { locale: tr })}</span>
                  )}
                  {card.due_date_end && (
                    <span>Son: {format(new Date(card.due_date_end), 'd MMM yyyy', { locale: tr })}</span>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlignLeft className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Açıklama</span>
                  {!editingDesc && (
                    <button
                      className="text-xs text-blue-500 hover:underline ml-auto"
                      onClick={() => setEditingDesc(true)}
                    >
                      Düzenle
                    </button>
                  )}
                </div>
                {editingDesc ? (
                  <div className="space-y-2">
                    <Textarea
                      value={descValue}
                      onChange={(e) => setDescValue(e.target.value)}
                      rows={5}
                      placeholder="Açıklama ekle... (Markdown desteklenir)"
                      className="text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveDesc}>Kaydet</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingDesc(false); setDescValue(card.description ?? '') }}>
                        İptal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="min-h-[40px] rounded-md bg-gray-50 dark:bg-gray-800 p-2.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 prose prose-sm dark:prose-invert max-w-none"
                    onClick={() => setEditingDesc(true)}
                  >
                    {card.description ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{card.description}</ReactMarkdown>
                    ) : (
                      <span className="text-gray-400">Açıklama eklemek için tıklayın...</span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Task 2: İlişkili Kartlar ───────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">İlişkili Kartlar</span>
                  <button
                    className="ml-auto w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs hover:bg-blue-200 dark:hover:bg-blue-900/60"
                    onClick={() => setShowRelationForm((p) => !p)}
                    title="İlişki Ekle"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Existing Relations */}
                {(card.relations ?? []).length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {(card.relations ?? []).map((rel) => (
                      <div key={rel.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-md px-2.5 py-1.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${relationTypeBadgeColors[rel.relation_type]}`}>
                          {relationTypeLabels[rel.relation_type]}
                        </span>
                        <span className="text-xs text-gray-700 dark:text-gray-200 truncate flex-1">
                          {rel.related_card?.title ?? rel.related_card_id}
                        </span>
                        <button
                          className="text-gray-400 hover:text-red-500 flex-shrink-0"
                          onClick={() => handleDeleteRelation(rel.id)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Relation Form */}
                {showRelationForm && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 space-y-2 border border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">İlişki Türü</label>
                      <select
                        value={relationType}
                        onChange={(e) => setRelationType(e.target.value as RelationType)}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="relates_to">İlgili</option>
                        <option value="blocks">Blokluyor</option>
                        <option value="blocked_by">Bloklanmış</option>
                        <option value="duplicates">Kopya</option>
                      </select>
                    </div>
                    <div className="relative">
                      <label className="text-xs text-gray-500 mb-1 block">Kart Ara</label>
                      {selectedRelatedCard ? (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 rounded px-2 py-1.5 text-xs">
                          <span className="flex-1 text-blue-700 dark:text-blue-300">{selectedRelatedCard.title}</span>
                          <button onClick={() => { setSelectedRelatedCard(null); setRelationSearch('') }}>
                            <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            placeholder="En az 3 karakter yazın..."
                            value={relationSearch}
                            onChange={(e) => setRelationSearch(e.target.value)}
                            className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          {relationResults.length > 0 && (
                            <div className="absolute z-10 top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                              {relationResults.map((r) => (
                                <button
                                  key={r.id}
                                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                                  onClick={() => { setSelectedRelatedCard(r); setRelationSearch(''); setRelationResults([]) }}
                                >
                                  {r.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddRelation} disabled={!selectedRelatedCard}>
                        Ekle
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowRelationForm(false); setRelationSearch(''); setSelectedRelatedCard(null); setRelationResults([]) }}>
                        İptal
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Checklists */}
              {(card.checklists ?? []).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Kontrol Listeleri</span>
                  </div>
                  {(card.checklists ?? []).map((cl) => {
                    const clTotal = cl.items?.length ?? 0
                    const clDone = cl.items?.filter((i) => i.is_completed).length ?? 0
                    const clProgress = clTotal > 0 ? Math.round((clDone / clTotal) * 100) : 0
                    return (
                      <div key={cl.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{cl.title}</span>
                          <button
                            className="text-xs text-red-400 hover:text-red-600"
                            onClick={() => handleDeleteChecklist(cl.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-8">{clProgress}%</span>
                          <Progress value={clProgress} className="flex-1 h-1.5" />
                        </div>
                        <div className="space-y-1 pl-2">
                          {(cl.items ?? []).map((item: ChecklistItem) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.is_completed}
                                onChange={() => handleToggleChecklistItem(cl.id, item.id, item.is_completed)}
                                className="w-3.5 h-3.5 rounded cursor-pointer"
                              />
                              <span className={`text-sm ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                {item.title}
                              </span>
                              {item.due_date && (
                                <span className="text-xs text-gray-400 ml-auto">
                                  {format(new Date(item.due_date), 'd MMM', { locale: tr })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* Add item */}
                        {showAddItem[cl.id] ? (
                          <div className="flex gap-2 pl-2">
                            <Input
                              value={newItemTitle[cl.id] ?? ''}
                              onChange={(e) => setNewItemTitle((p) => ({ ...p, [cl.id]: e.target.value }))}
                              placeholder="Madde ekle..."
                              className="h-7 text-xs flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddChecklistItem(cl.id)
                                if (e.key === 'Escape') setShowAddItem((p) => ({ ...p, [cl.id]: false }))
                              }}
                              autoFocus
                            />
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleAddChecklistItem(cl.id)}>Ekle</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddItem((p) => ({ ...p, [cl.id]: false }))}>İptal</Button>
                          </div>
                        ) : (
                          <button
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 pl-2"
                            onClick={() => setShowAddItem((p) => ({ ...p, [cl.id]: true }))}
                          >
                            <Plus className="w-3 h-3" /> Madde ekle
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Checklist summary if any */}
              {totalItems > 0 && (
                <div className="text-xs text-gray-500">
                  Toplam: {completedItems}/{totalItems} tamamlandı ({checklistProgress}%)
                </div>
              )}

              {/* Attachments */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Ekler {(card.attachments ?? []).length > 0 && `(${(card.attachments ?? []).length})`}
                  </span>
                  <button
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className="ml-auto text-xs text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Ekle
                  </button>
                </div>
                {(card.attachments ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Henüz ek yok</p>
                ) : (
                  <div className="space-y-2">
                    {(card.attachments ?? []).map((att) => {
                      const isImage = att.file_type?.startsWith('image/')
                      return (
                        <div key={att.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg group">
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={att.file_url} alt={att.file_name} className="w-10 h-10 object-cover rounded flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                              <Paperclip className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline truncate block"
                            >
                              {att.file_name}
                            </a>
                            <span className="text-xs text-gray-400">
                              {att.file_size < 1024 * 1024
                                ? `${(att.file_size / 1024).toFixed(0)} KB`
                                : `${(att.file_size / (1024 * 1024)).toFixed(1)} MB`}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteAttachment(att.id, att.file_url)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Yorumlar ({(card.comments ?? []).length})
                  </span>
                </div>
                <div className="space-y-3 mb-3">
                  {(card.comments ?? []).map((comment: Comment) => (
                    <div key={comment.id} className="flex gap-2.5">
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarImage src={comment.user?.avatar_url ?? ''} />
                        <AvatarFallback className="text-[10px] bg-purple-500 text-white">
                          {comment.user?.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{comment.user?.full_name}</span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(comment.created_at), 'd MMM HH:mm', { locale: tr })}
                          </span>
                          {currentUser?.id === comment.user_id && (
                            <div className="ml-auto flex gap-2">
                              <button
                                className="text-xs text-blue-400 hover:underline"
                                onClick={() => {
                                  setEditingCommentId(comment.id)
                                  setEditingCommentValue(comment.content)
                                }}
                              >
                                Düzenle
                              </button>
                              <button
                                className="text-xs text-red-400 hover:underline"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                Sil
                              </button>
                            </div>
                          )}
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="space-y-1.5">
                            <Textarea
                              value={editingCommentValue}
                              onChange={(e) => setEditingCommentValue(e.target.value)}
                              rows={3}
                              className="text-sm"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 text-xs" onClick={() => handleEditComment(comment.id)}>Kaydet</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingCommentId(null)}>İptal</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm bg-gray-50 dark:bg-gray-800 rounded-md p-2 prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* New comment */}
                <div className="flex gap-2.5">
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    <AvatarImage src={currentUser?.avatar_url ?? ''} />
                    <AvatarFallback className="text-[10px] bg-blue-500 text-white">
                      {currentUser?.full_name?.charAt(0).toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1.5 relative">
                    <Textarea
                      ref={commentTextareaRef}
                      value={newComment}
                      onChange={(e) => {
                        const val = e.target.value
                        setNewComment(val)
                        // @mention tetikleyici
                        const cursor = e.target.selectionStart
                        const textBeforeCursor = val.slice(0, cursor)
                        const match = textBeforeCursor.match(/@(\w*)$/)
                        if (match) {
                          setMentionQuery(match[1])
                          setMentionOpen(true)
                        } else {
                          setMentionOpen(false)
                          setMentionQuery('')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setMentionOpen(false)
                        if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
                          e.preventDefault()
                          handleSubmitComment()
                        }
                      }}
                      placeholder="Yorum ekle... (@isim ile etiketle)"
                      rows={2}
                      className="text-sm"
                    />
                    {/* @mention dropdown */}
                    {mentionOpen && (
                      <div className="absolute bottom-full left-0 mb-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-36 overflow-y-auto">
                        {boardMembers
                          .filter((m) => m.user?.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()))
                          .map((m) => (
                            <button
                              key={m.user_id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                // @kısmını seçili kullanıcının adıyla değiştir
                                const name = m.user?.full_name?.replace(/\s+/g, '') ?? m.user_id
                                const cursor = commentTextareaRef.current?.selectionStart ?? newComment.length
                                const before = newComment.slice(0, cursor).replace(/@\w*$/, `@${name} `)
                                const after = newComment.slice(cursor)
                                setNewComment(before + after)
                                setMentionOpen(false)
                                setMentionQuery('')
                                // Bildirimi tetikle
                                if (m.user_id !== currentUser?.id) {
                                  createNotifications([m.user_id], {
                                    type: 'card_mention',
                                    title: 'Bir yorumda etiketlendiniz',
                                    message: `${currentUser?.full_name ?? 'Biri'} sizi "${card?.title}" kartında etiketledi`,
                                    linkUrl: `/board/${boardId}`,
                                  })
                                }
                              }}
                            >
                              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                {m.user?.full_name?.charAt(0).toUpperCase() ?? '?'}
                              </div>
                              <span className="truncate">{m.user?.full_name}</span>
                            </button>
                          ))}
                        {boardMembers.filter((m) => m.user?.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                          <p className="px-3 py-2 text-xs text-gray-400">Kullanıcı bulunamadı</p>
                        )}
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || submittingComment}
                    >
                      {submittingComment && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Gönder
                    </Button>
                  </div>
                </div>
              </div>

              {/* Activity */}
              {(card.activities ?? []).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ActivityIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Aktivite</span>
                  </div>
                  <div className="space-y-2">
                    {(card.activities ?? []).slice(0, 10).map((act: Activity) => (
                      <div key={act.id} className="flex gap-2 text-xs text-gray-500">
                        <Avatar className="w-5 h-5 flex-shrink-0">
                          <AvatarFallback className="text-[9px] bg-gray-400 text-white">
                            {act.user?.full_name?.charAt(0).toUpperCase() ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          <strong>{act.user?.full_name}</strong> {act.description}
                        </span>
                        <span className="ml-auto flex-shrink-0">
                          {format(new Date(act.created_at), 'd MMM HH:mm', { locale: tr })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Sidebar ─────────────────────────────── */}
            <div className="sm:w-48 flex-shrink-0 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-1.5 overflow-y-auto">
              <button className="w-full text-left" onClick={onClose}>
                <div className="flex justify-end mb-2">
                  <span className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕ Kapat</span>
                </div>
              </button>

              <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wide mb-1">İşlemler</p>

              {/* Members */}
              <SidebarButton
                icon={<Users className="w-3.5 h-3.5" />}
                label="Üyeler"
                active={sidebarPanel === 'members'}
                onClick={() => setSidebarPanel(sidebarPanel === 'members' ? null : 'members')}
              />
              {sidebarPanel === 'members' && (
                <div className="bg-white dark:bg-gray-700 rounded-md p-2 space-y-1.5 text-xs">
                  {boardMembers.map((bm) => {
                    const isActive = (card.members ?? []).some((m) => m.user_id === bm.user_id)
                    return (
                      <button
                        key={bm.user_id}
                        className={`flex items-center gap-2 w-full text-left px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 ${isActive ? 'font-semibold' : ''}`}
                        onClick={() => handleToggleMember(bm.user_id)}
                      >
                        <Avatar className="w-5 h-5 flex-shrink-0">
                          <AvatarImage src={bm.user?.avatar_url ?? ''} />
                          <AvatarFallback className="text-[9px] bg-blue-500 text-white">
                            {bm.user?.full_name?.charAt(0).toUpperCase() ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{bm.user?.full_name ?? bm.user_id}</span>
                        {isActive && <span className="ml-auto text-blue-500">✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Labels */}
              <SidebarButton
                icon={<Tag className="w-3.5 h-3.5" />}
                label="Etiketler"
                active={sidebarPanel === 'labels'}
                onClick={() => setSidebarPanel(sidebarPanel === 'labels' ? null : 'labels')}
              />
              {sidebarPanel === 'labels' && (
                <div className="bg-white dark:bg-gray-700 rounded-md p-2 space-y-1.5 text-xs">
                  {/* Mevcut board etiketleri */}
                  {boardLabels.map((label) => {
                    const isActive = cardLabels.some((l) => l.id === label.id)
                    return (
                      <button
                        key={label.id}
                        className={`flex items-center gap-2 w-full text-left px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 ${isActive ? 'ring-1 ring-blue-400' : ''}`}
                        onClick={() => handleToggleLabel(label.id)}
                      >
                        <span className="w-5 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                        <span className="truncate flex-1">{label.name || 'İsimsiz'}</span>
                        {isActive && <span className="text-blue-500 text-xs">✓</span>}
                      </button>
                    )
                  })}
                  {boardLabels.length === 0 && (
                    <p className="text-gray-400 text-center py-1">Henüz etiket yok</p>
                  )}

                  {/* Yeni etiket oluştur */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2 space-y-1.5">
                    <p className="text-gray-400 font-medium">Yeni Etiket</p>
                    <input
                      type="text"
                      placeholder="Etiket adı (opsiyonel)"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      className="w-full border rounded px-1.5 py-1 text-xs dark:bg-gray-600 dark:border-gray-500 outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <div className="flex flex-wrap gap-1">
                      {[
                        '#0079bf','#d29034','#519839','#b04632',
                        '#89609e','#cd5a91','#4bbf6b','#00aecc',
                        '#838c91','#172b4d',
                      ].map((color) => (
                        <button
                          key={color}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${newLabelColor === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewLabelColor(color)}
                        />
                      ))}
                    </div>
                    <button
                      disabled={creatingLabel}
                      onClick={async () => {
                        setCreatingLabel(true)
                        const { data, error } = await supabase
                          .from('labels')
                          .insert({ board_id: boardId, name: newLabelName.trim() || 'Etiket', color: newLabelColor })
                          .select()
                          .single()
                        if (!error && data) {
                          setBoardLabels((prev) => [...prev, data])
                          setNewLabelName('')
                          // Kartı bu etiketle otomatik etiketle
                          await supabase.from('card_labels').insert({ card_id: cardId, label_id: data.id })
                          fetchCard()
                        }
                        setCreatingLabel(false)
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-1 text-xs font-medium disabled:opacity-50"
                    >
                      {creatingLabel ? 'Oluşturuluyor...' : '+ Etiket Oluştur'}
                    </button>
                  </div>
                </div>
              )}

              {/* Due Date */}
              <SidebarButton
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Tarih"
                active={sidebarPanel === 'duedate'}
                onClick={() => setSidebarPanel(sidebarPanel === 'duedate' ? null : 'duedate')}
              />
              {sidebarPanel === 'duedate' && (
                <div className="bg-white dark:bg-gray-700 rounded-md p-2 space-y-2 text-xs">
                  <div>
                    <label className="block text-gray-500 mb-0.5">Başlangıç</label>
                    <input
                      type="date"
                      value={dueDateStart}
                      onChange={(e) => setDueDateStart(e.target.value)}
                      className="w-full border rounded px-1.5 py-1 text-xs dark:bg-gray-600 dark:border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-0.5">Bitiş</label>
                    <input
                      type="date"
                      value={dueDateEnd}
                      onChange={(e) => setDueDateEnd(e.target.value)}
                      className="w-full border rounded px-1.5 py-1 text-xs dark:bg-gray-600 dark:border-gray-500"
                    />
                  </div>
                  <Button size="sm" className="w-full h-6 text-xs" onClick={handleSaveDueDate}>Kaydet</Button>
                </div>
              )}

              {/* Priority */}
              <div className="pt-1">
                <p className="text-[10px] text-gray-400 mb-1">Öncelik</p>
                <Select value={priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-7 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Düşük</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Yüksek</SelectItem>
                    <SelectItem value="urgent">Acil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Add Checklist */}
              <SidebarButton
                icon={<CheckSquare className="w-3.5 h-3.5" />}
                label="Kontrol Listesi"
                onClick={() => setShowAddChecklist((p) => !p)}
              />
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="*/*" />
              <SidebarButton
                icon={uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                label={uploading ? 'Yükleniyor...' : 'Ek Ekle'}
                onClick={() => !uploading && fileInputRef.current?.click()}
              />
              {showAddChecklist && (
                <div className="bg-white dark:bg-gray-700 rounded-md p-2 space-y-1.5 text-xs">
                  <Input
                    value={addingChecklistTitle}
                    onChange={(e) => setAddingChecklistTitle(e.target.value)}
                    placeholder="Başlık..."
                    className="h-7 text-xs"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklist() }}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-xs flex-1" onClick={handleAddChecklist}>Ekle</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowAddChecklist(false)}>İptal</Button>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-600 pt-1.5 space-y-1.5">
                <SidebarButton
                  icon={<LayoutTemplate className="w-3.5 h-3.5" />}
                  label="Şablon Olarak Kaydet"
                  onClick={handleSaveAsTemplate}
                />
                <SidebarButton
                  icon={<Copy className="w-3.5 h-3.5" />}
                  label="Kartı Kopyala"
                  onClick={handleCopyCard}
                />
                {/* ── Task 1: Taşı Button ── */}
                <SidebarButton
                  icon={<MoveRight className="w-3.5 h-3.5" />}
                  label="Taşı"
                  active={movePanel}
                  onClick={() => setMovePanel((p) => !p)}
                />
                {movePanel && (
                  <div className="bg-white dark:bg-gray-700 rounded-md p-2 space-y-2 text-xs">
                    <p className="font-medium text-gray-600 dark:text-gray-300">Başka Board&apos;a Taşı</p>
                    <div>
                      <label className="block text-gray-500 mb-0.5">Çalışma Alanı</label>
                      <select
                        value={moveWorkspaceId}
                        onChange={(e) => setMoveWorkspaceId(e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 text-xs dark:bg-gray-600 outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">Seçin...</option>
                        {moveWorkspaces.map((ws) => (
                          <option key={ws.id} value={ws.id}>{ws.name}</option>
                        ))}
                      </select>
                    </div>
                    {moveWorkspaceId && (
                      <div>
                        <label className="block text-gray-500 mb-0.5">Board</label>
                        <select
                          value={moveBoardId}
                          onChange={(e) => setMoveBoardId(e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 text-xs dark:bg-gray-600 outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">Seçin...</option>
                          {moveBoards.map((b) => (
                            <option key={b.id} value={b.id}>{b.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {moveBoardId && (
                      <div>
                        <label className="block text-gray-500 mb-0.5">Liste</label>
                        <select
                          value={moveListId}
                          onChange={(e) => setMoveListId(e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 text-xs dark:bg-gray-600 outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">Seçin...</option>
                          {moveLists.map((l) => (
                            <option key={l.id} value={l.id}>{l.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="w-full h-6 text-xs"
                      onClick={handleMoveCard}
                      disabled={!moveListId || moving}
                    >
                      {moving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      Taşı
                    </Button>
                  </div>
                )}
                <SidebarButton
                  icon={<Archive className="w-3.5 h-3.5" />}
                  label="Arşivle"
                  onClick={handleArchive}
                  danger
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SidebarButton({
  icon,
  label,
  onClick,
  active = false,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
        active
          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
          : danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
