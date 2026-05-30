"use client"

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
}

function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
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
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 rounded-t-lg">
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
    </div>
  )
}

export default function RichTextEditor({ content, onChange, placeholder = "Write something...", minHeight = "200px" }: RichTextEditorProps) {
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

  return (
    <div className="border border-zinc-300 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-zinc-700">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
