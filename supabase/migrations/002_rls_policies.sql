-- =============================================
-- Migration 002: Row Level Security (RLS)
-- =============================================

-- RLS aktif et
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_relations ENABLE ROW LEVEL SECURITY;

-- Helper fonksiyon: kullanıcı workspace üyesi mi?
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = $1
    AND workspace_members.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper fonksiyon: kullanıcı board üyesi mi?
CREATE OR REPLACE FUNCTION is_board_member(board_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM board_members
    WHERE board_members.board_id = $1
    AND board_members.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper fonksiyon: kullanıcı board admin mi?
CREATE OR REPLACE FUNCTION is_board_admin(board_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM board_members
    WHERE board_members.board_id = $1
    AND board_members.user_id = auth.uid()
    AND board_members.role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- USERS policies
-- =============================================
CREATE POLICY "users_select" ON users FOR SELECT USING (TRUE); -- herkes görebilir
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- WORKSPACES policies
-- =============================================
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT
  USING (is_workspace_member(id) OR owner_id = auth.uid());

CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- =============================================
-- WORKSPACE_MEMBERS policies
-- =============================================
CREATE POLICY "workspace_members_select" ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_insert" ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'manager'))
  );

CREATE POLICY "workspace_members_delete" ON workspace_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- =============================================
-- BOARDS policies
-- =============================================
CREATE POLICY "boards_select" ON boards FOR SELECT
  USING (
    visibility = 'public'
    OR is_board_member(id)
    OR (visibility = 'workspace' AND is_workspace_member(workspace_id))
  );

CREATE POLICY "boards_insert" ON boards FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "boards_update" ON boards FOR UPDATE
  USING (is_board_admin(id) OR created_by = auth.uid());

CREATE POLICY "boards_delete" ON boards FOR DELETE
  USING (created_by = auth.uid());

-- =============================================
-- BOARD_MEMBERS policies
-- =============================================
CREATE POLICY "board_members_select" ON board_members FOR SELECT
  USING (is_board_member(board_id));

CREATE POLICY "board_members_insert" ON board_members FOR INSERT
  WITH CHECK (is_board_admin(board_id));

CREATE POLICY "board_members_delete" ON board_members FOR DELETE
  USING (is_board_admin(board_id) OR user_id = auth.uid());

-- =============================================
-- LISTS policies
-- =============================================
CREATE POLICY "lists_select" ON lists FOR SELECT
  USING (is_board_member(board_id));

CREATE POLICY "lists_insert" ON lists FOR INSERT
  WITH CHECK (is_board_member(board_id));

CREATE POLICY "lists_update" ON lists FOR UPDATE
  USING (is_board_member(board_id));

CREATE POLICY "lists_delete" ON lists FOR DELETE
  USING (is_board_admin(board_id));

-- =============================================
-- CARDS policies
-- =============================================
CREATE POLICY "cards_select" ON cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists l WHERE l.id = list_id AND is_board_member(l.board_id)
    )
  );

CREATE POLICY "cards_insert" ON cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists l WHERE l.id = list_id AND is_board_member(l.board_id)
    )
  );

CREATE POLICY "cards_update" ON cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lists l WHERE l.id = list_id AND is_board_member(l.board_id)
    )
  );

CREATE POLICY "cards_delete" ON cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lists l
      JOIN board_members bm ON bm.board_id = l.board_id
      WHERE l.id = list_id AND bm.user_id = auth.uid() AND bm.role IN ('admin', 'member')
    )
  );

-- =============================================
-- Diğer tablolar - basit politikalar
-- =============================================

-- card_members
CREATE POLICY "card_members_select" ON card_members FOR SELECT USING (TRUE);
CREATE POLICY "card_members_insert" ON card_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "card_members_delete" ON card_members FOR DELETE USING (auth.uid() IS NOT NULL);

-- labels
CREATE POLICY "labels_all" ON labels FOR ALL USING (is_board_member(board_id));

-- card_labels
CREATE POLICY "card_labels_all" ON card_labels FOR ALL USING (auth.uid() IS NOT NULL);

-- checklists
CREATE POLICY "checklists_all" ON checklists FOR ALL USING (auth.uid() IS NOT NULL);

-- checklist_items
CREATE POLICY "checklist_items_all" ON checklist_items FOR ALL USING (auth.uid() IS NOT NULL);

-- comments
CREATE POLICY "comments_select" ON comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid() = user_id);

-- attachments
CREATE POLICY "attachments_select" ON attachments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "attachments_insert" ON attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attachments_delete" ON attachments FOR DELETE USING (auth.uid() = user_id);

-- activities
CREATE POLICY "activities_select" ON activities FOR SELECT USING (is_board_member(board_id));
CREATE POLICY "activities_insert" ON activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (TRUE); -- service role
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- notification_preferences
CREATE POLICY "notification_preferences_all" ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- invite_tokens
CREATE POLICY "invite_tokens_select" ON invite_tokens FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "invite_tokens_insert" ON invite_tokens FOR INSERT WITH CHECK (auth.uid() = invited_by);
CREATE POLICY "invite_tokens_update" ON invite_tokens FOR UPDATE USING (auth.uid() IS NOT NULL);

-- card_relations
CREATE POLICY "card_relations_select" ON card_relations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "card_relations_insert" ON card_relations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "card_relations_delete" ON card_relations FOR DELETE USING (auth.uid() = created_by);

-- =============================================
-- Realtime için tabloları yayınla
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
ALTER PUBLICATION supabase_realtime ADD TABLE lists;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE board_members;
