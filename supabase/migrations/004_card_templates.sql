-- Kart şablonları tablosu
CREATE TABLE card_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  checklist_data JSONB DEFAULT '[]', -- [{title, items: [{title}]}]
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- null = kişisel
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE card_templates ENABLE ROW LEVEL SECURITY;

-- Kendi şablonlarını ve çalışma alanı şablonlarını gör
CREATE POLICY "card_templates_select" ON card_templates FOR SELECT
  USING (created_by = auth.uid() OR workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "card_templates_insert" ON card_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "card_templates_delete" ON card_templates FOR DELETE
  USING (created_by = auth.uid());
