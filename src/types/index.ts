export type UserRole = 'admin' | 'manager' | 'employee' | 'guest'
export type BoardRole = 'admin' | 'member' | 'observer'
export type Visibility = 'private' | 'workspace' | 'public'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type RelationType = 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates'
export type BoardView = 'kanban' | 'calendar' | 'table'

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  phone: string | null
  position: string | null
  department: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  role: UserRole
  joined_at: string
  user?: User
}

export interface Board {
  id: string
  workspace_id: string
  title: string
  description: string | null
  background: string
  visibility: Visibility
  is_starred: boolean
  is_archived: boolean
  created_by: string
  created_at: string
  updated_at: string
  members?: BoardMember[]
  lists?: List[]
}

export interface BoardMember {
  board_id: string
  user_id: string
  role: BoardRole
  joined_at: string
  user?: User
}

export interface List {
  id: string
  board_id: string
  title: string
  position: number
  wip_limit: number | null
  is_archived: boolean
  created_at: string
  updated_at: string
  cards?: Card[]
}

export interface Card {
  id: string
  list_id: string
  title: string
  description: string | null
  position: number
  cover_image_url: string | null
  priority: Priority
  due_date_start: string | null
  due_date_end: string | null
  estimated_hours: number | null
  is_archived: boolean
  created_by: string
  created_at: string
  updated_at: string
  members?: CardMember[]
  labels?: Label[]
  checklists?: Checklist[]
  comments?: Comment[]
  attachments?: Attachment[]
  activities?: Activity[]
  relations?: CardRelation[]
}

export interface CardMember {
  card_id: string
  user_id: string
  assigned_at: string
  user?: User
}

export interface Label {
  id: string
  board_id: string
  name: string
  color: string
  created_at: string
}

export interface CardLabel {
  card_id: string
  label_id: string
}

export interface Checklist {
  id: string
  card_id: string
  title: string
  position: number
  created_at: string
  items?: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  checklist_id: string
  title: string
  is_completed: boolean
  assigned_to: string | null
  due_date: string | null
  position: number
  created_at: string
  assignee?: User
}

export interface Comment {
  id: string
  card_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user?: User
}

export interface Attachment {
  id: string
  card_id: string
  user_id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  board_id: string
  card_id: string | null
  user_id: string
  action_type: string
  description: string
  metadata: Record<string, unknown>
  created_at: string
  user?: User
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link_url: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
}

export interface NotificationPreference {
  id: string
  user_id: string
  card_assigned: boolean
  card_comment: boolean
  card_mention: boolean
  due_date_reminder: boolean
  board_invite: boolean
  email_notifications: boolean
  updated_at: string
}

export interface InviteToken {
  id: string
  workspace_id: string | null
  board_id: string | null
  email: string
  token: string
  role: string
  invited_by: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export interface CardRelation {
  id: string
  card_id: string
  related_card_id: string
  relation_type: RelationType
  created_by: string
  created_at: string
  related_card?: Card
}
