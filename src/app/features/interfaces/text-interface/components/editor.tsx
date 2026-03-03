"use client"

import { ErrorView, LoadingView } from "@/components/entity-components"
import { useEffect, useState } from "react"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import OrderedList from '@tiptap/extension-ordered-list'
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"
import Youtube from "@tiptap/extension-youtube"
import { Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Heading from "@tiptap/extension-heading"
// import { useProjectData } from "@/app/provider"
// import { saveContent as savePageContent } from "../_actions/save-content"
// import { sendEmailToClient } from "../_actions/send-email"
// import { approveContent } from "../_actions/approve-content"
import { Toolbar } from "./toolbar"
import { CustomEditorContent } from "./editor-content"
import { useSaveTextInterface, useSuspenseTextInterface } from "../hooks/use-editor-interface"

const getStringAttribute = (
  attrs: unknown,
  key: string,
): string | undefined => {
  if (!attrs || typeof attrs !== "object") return undefined
  const value = (attrs as Record<string, unknown>)[key]
  return typeof value === "string" ? value : undefined
}

// Custom Image extension that renders actual <img> nodes in the editor
const CustomImage = Image.extend({
  addNodeView() {
    return ({ node }) => {
      const img = document.createElement('img')
      img.className = 'rounded-md w-full h-auto'
      const src = getStringAttribute(node.attrs, "src")
      const alt = getStringAttribute(node.attrs, "alt") ?? ""
      if (src && typeof src === 'string' && src.trim() !== '') {
        img.setAttribute('src', src)
        img.setAttribute('data-image-id', src)
        img.setAttribute('data-tip-image', 'true')
      }
      img.setAttribute('alt', alt)

      return {
        dom: img,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'image') return false
          const nextSrc = getStringAttribute(updatedNode.attrs, "src")
          const nextAlt = getStringAttribute(updatedNode.attrs, "alt") ?? ""
          if (typeof nextSrc === 'string') {
            img.setAttribute('src', nextSrc)
            img.setAttribute('data-image-id', nextSrc)
          }
          img.setAttribute('alt', nextAlt)
          return true
        }
      }
    }
  },
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => {
          const src = element.getAttribute('src')
          return src && src.trim() !== '' ? src : null
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const src = getStringAttribute(attributes, "src")
          if (!src || src.trim() === '') {
            return {}
          }
          return {
            src,
            'data-image-id': src,
            'data-tip-image': 'true'
          }
        }
      },
      alt: {
        default: null,
        parseHTML: (element: HTMLElement): string | null => element.getAttribute('alt'),
        renderHTML: (attributes: Record<string, unknown>) => ({
          alt: getStringAttribute(attributes, "alt") ?? ''
        })
      }
    }
  }
})

export const TextInterfaceEditorLoading = () => {
  return <LoadingView message="Loading text interface..." />
}

export const TextInterfaceEditorError = () => {
  return <ErrorView message="Error loading text interface..." />
}

export function Editor({ interfaceId }: { interfaceId: string }) {
  const { data: textInterface } = useSuspenseTextInterface(interfaceId)
  const saveTextInterface = useSaveTextInterface()
  const [showHtml, setShowHtml] = useState(false)
  const initialContent = textInterface.text?.contentHtml ?? ""
  const [content, setContent] = useState(initialContent)
  const [htmlContent, setHtmlContent] = useState(initialContent)
  //   const { projectData } = useProjectData();

  //   const { toast } = useToast()

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal pl-4',
        },
        itemTypeName: 'listItem',
        keepMarks: true,
        keepAttributes: true,
      }),
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-4',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-4',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'list-item',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'my-2',
          },
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing your content...",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),

      CustomImage.configure({
        HTMLAttributes: {
          class: "rounded-md w-full h-auto",
        },
        allowBase64: true,
        inline: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
        HTMLAttributes: {
          class: "font-bold",
        },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: "relative w-full h-full aspect-video",
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
      setHtmlContent(editor.getHTML())
    },
  })

  useEffect(() => {
    setContent(initialContent)
    setHtmlContent(initialContent)
    if (editor) {
      editor.commands.setContent(initialContent || "<p></p>")
    }
  }, [initialContent, editor])

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const transformedHtml = transformImageTags(e.target.value)
    setHtmlContent(transformedHtml)
    if (editor) {
      editor.commands.setContent(transformedHtml)
    }
  }

  const transformImageTags = (html: string) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const images = doc.getElementsByTagName('img')

    Array.from(images).forEach((img: HTMLImageElement) => {
      const src = img.getAttribute('src')
      const alt = img.getAttribute('alt') ?? ''
      const className = img.getAttribute('class') ?? ''

      // If the image source is an external URL (e.g., WordPress), keep it as a raw <img>
      if (src && /^https?:\/\//i.test(src)) {
        // If we previously stored the original URL in data-image-id, restore it
        const original = img.getAttribute('data-image-id')
        if (original && /^https?:\/\//i.test(original)) {
          img.setAttribute('src', original)
        }
        // Remove any Next.js specific attributes if present
        img.removeAttribute('data-nimg')
        img.removeAttribute('srcset')
        img.removeAttribute('width')
        img.removeAttribute('height')
        const style = img.getAttribute('style') ?? ''
        if (style.includes('color: transparent')) {
          const cleaned = style
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !/^color:\s*transparent$/i.test(s))
            .join('; ')
          if (cleaned) {
            img.setAttribute('style', cleaned)
          } else {
            img.removeAttribute('style')
          }
        }
        return
      }

      // For non-external images, apply lightweight loading attributes without Next.js rewrite
      img.setAttribute('loading', 'lazy')
      img.setAttribute('decoding', 'async')
    })

    return doc.body.innerHTML
  }

  const handleSave = async () => {
    const transformedContent = transformImageTags(content)
    await saveTextInterface.mutateAsync({
      id: interfaceId,
      contentHtml: transformedContent,
    })
  }

  //   const handleSave = async () => {
  //     try {
  //       setIsSaving(true)
  //       const transformedContent = transformImageTags(content)
  //       const pageId = page._id ?? page.id ?? ""
  //       if (!pageId) {
  //         toast.error("Page ID not found")
  //         return
  //       }
  //       const result = await savePageContent(pageId, transformedContent)
  //       if (result?.success) {
  //         toast.success("התוכן נשמר בהצלחה")
  //       } else {
  //         console.error("Failed to save content")
  //         toast.error("Failed to save content")
  //       }
  //     } catch (error) {
  //       console.error("Error saving content:", error)
  //       toast.error("Error saving content")
  //     } finally {
  //       setIsSaving(false)
  //     }
  //   }

  //   const handleSendEmail = async () => {
  //     if (!page.client_email) {
  //       toast.error("אין כתובת מייל ללקוח")
  //       return
  //     }

  //     try {
  //       setIsSendingEmail(true)

  //       const emailSubject = `תוכן עמוד: ${page.page_title || 'ללא כותרת'}`
  //       const emailContent = `
  //         <h2>שלום לקוח יקר,</h2>
  //         <p>התוכן של העמוד "${page.page_title || 'ללא כותרת'}" מוכן לבדיקה.</p>
  //         <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0; background-color: #f9f9f9;">
  //           ${transformImageTags(content)}
  //         </div>
  //         <p>בברכה,<br>צוות הפיתוח</p>
  //       `

  //       const result = await sendEmailToClient({
  //         to: page.client_email,
  //         subject: emailSubject,
  //         html: emailContent
  //       })

  //       if (result.success) {
  //         toast.success("המייל נשלח בהצלחה ללקוח")
  //       } else {
  //         toast.error("שגיאה בשליחת המייל")
  //       }
  //     } catch (error) {
  //       console.error("Error sending email:", error)
  //       toast.error("שגיאה בשליחת המייל")
  //     } finally {
  //       setIsSendingEmail(false)
  //     }
  //   }

  //   const handleApproveContent = async () => {
  //     try {
  //       setIsApproving(true)
  //       const pageId = page._id ?? page.id ?? ""
  //       if (!pageId) {
  //         toast.error("Page ID not found")
  //         return
  //       }
  //       const result = await approveContent(pageId)
  //       if (result?.success) {
  //         toast.success("התוכן אושר בהצלחה")
  //       } else {
  //         console.error("Failed to approve content")
  //         toast.error("Failed to approve content")
  //       }
  //     } catch (error) {
  //       console.error("Error approving content:", error)
  //       toast.error("Error approving content")
  //     } finally {
  //       setIsApproving(false)
  //     }
  //   }

  return (
    <div className="space-y-4 h-full">
      <Card className="p-4 border-0 shadow-none rounded-lg h-full flex flex-col xl:max-w-[80%]">
        <div className="px-2 py-2">
          <div className="flex justify-between">
            <h2 className="text-2xl font-semibold leading-none tracking-tight">{textInterface.name}</h2>
            <div className="flex items-center gap-6">
              {/* Action Buttons Group */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => void handleSave()}
                  className="flex items-center gap-1.5 px-3 py-1.5 h-8 font-medium text-xs transition-colors duration-200 disabled:opacity-50 cursor-pointer"
                  disabled={saveTextInterface.isPending}
                  size="sm"
                  variant="ghost"
                >
                  {saveTextInterface.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saveTextInterface.isPending ? "saving..." : "save"}
                </Button>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-border" />

              {/* View Mode Toggle Group */}
              <div className="inline-flex items-center gap-0.5 p-0.5 bg-muted rounded-md">
                <Button
                  variant="ghost"
                  onClick={() => setShowHtml(false)}
                  className={`px-2 py-1 h-7 text-xs font-medium transition-all duration-200 rounded-sm ${!showHtml
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  size="sm"
                >
                  ויזואלי
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowHtml(true)}
                  className={`px-2 py-1 h-7 text-xs font-medium transition-all duration-200 rounded-sm ${showHtml
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  size="sm"
                >
                  קוד
                </Button>
              </div>
            </div>
          </div>
        </div>

        {editor && <Toolbar editor={editor} />}
        {
          showHtml ? (
            <div className="border rounded-md flex-1 overflow-hidden">
              <textarea
                value={transformImageTags(htmlContent)}
                onChange={handleHtmlChange}
                className="whitespace-pre-wrap text-sm font-mono w-full focus:outline-none h-[calc(100vh-200px)] p-4 overflow-y-auto"
              />
            </div>
          ) : (
            <div className="border-0 flex-1 overflow-hidden shadow-none">
              <CustomEditorContent
                editor={editor}
                className="text-sm w-full focus:outline-none p-4 prose prose-sm max-w-none"
              />
            </div>
          )
        }
      </Card>
    </div>
  )
}