"use client"

import { EditorContent, type Editor } from "@tiptap/react"

interface EditorContentProps {
  editor: Editor | null
  className?: string
}

export function CustomEditorContent({ editor, className }: EditorContentProps) {
  return (
    <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
      <EditorContent editor={editor} className={className} />
    </div>
  )
}