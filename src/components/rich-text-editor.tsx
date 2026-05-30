"use client"

import { useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import LinkExtension from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  variables?: string[]
}

function MenuBar({ editor, onInsertButton }: { editor: ReturnType<typeof useEditor>; onInsertButton: () => void }) {
  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, label: string, title: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        active
          ? "bg-zinc-200 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100"
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B", "Bold")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I", "Italic")}
      {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "U", "Underline")}
      <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-1" />
      {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1", "Heading 1")}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", "Heading 2")}
      <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-1" />
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• List", "Bullet list")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. List", "Numbered list")}
      <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-1" />
      {btn(false, () => {
        const url = window.prompt("Link URL")
        if (url) editor.chain().focus().setLink({ href: url }).run()
      }, "Link", "Insert link")}
      {editor.isActive("link") && btn(true, () => editor.chain().focus().unsetLink().run(), "Unlink", "Remove link")}
      <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-1" />
      <button
        type="button"
        onClick={onInsertButton}
        title="Insert a styled email button"
        className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
      >
        + Button
      </button>
    </div>
  )
}

export default function RichTextEditor({ content, onChange, placeholder = "Write something...", minHeight = "200px", variables = [] }: RichTextEditorProps) {
  const [showButtonForm, setShowButtonForm] = useState(false)
  const [btnText, setBtnText] = useState("Click Here")
  const [btnUrl, setBtnUrl] = useState("")

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300",
        style: `min-height: ${minHeight}`,
      },
    },
  })

  function handleInsertButton() {
    setShowButtonForm(true)
    setBtnText("Click Here")
    setBtnUrl(variables.length > 0 ? `{{${variables[0]}}}` : "")
  }

  function doInsertButton() {
    if (!editor || !btnText.trim() || !btnUrl.trim()) return
    const html = `<a href="${btnUrl}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">${btnText}</a>`
    editor.chain().focus().insertContent(html).run()
    setShowButtonForm(false)
  }

  function insertVariable(v: string) {
    if (!editor) return
    editor.chain().focus().insertContent(`{{${v}}}`).run()
  }

  return (
    <div className="border border-zinc-300 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-zinc-700">
      <MenuBar editor={editor} onInsertButton={handleInsertButton} />

      {/* Variable chips row (always visible, even during editor init) */}
      {variables.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1 border-b border-zinc-200 dark:border-zinc-600 bg-zinc-100/50 dark:bg-zinc-800/80">
          <span className="text-[10px] font-medium text-zinc-400 uppercase mr-1">Insert:</span>
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              title={`Insert {{${v}}} at cursor`}
              className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors font-mono"
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      )}

      {/* Button insertion form */}
      {showButtonForm && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-600 bg-amber-50 dark:bg-amber-900/20">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">Button:</span>
          <input
            type="text"
            value={btnText}
            onChange={(e) => setBtnText(e.target.value)}
            placeholder="Button text"
            className="flex-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={btnUrl}
            onChange={(e) => setBtnUrl(e.target.value)}
            placeholder="URL or {{var}}"
            className="flex-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={doInsertButton}
            className="px-3 py-1 text-xs rounded bg-zinc-900 text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Insert
          </button>
          <button
            type="button"
            onClick={() => setShowButtonForm(false)}
            className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
