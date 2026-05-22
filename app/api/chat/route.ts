import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { chunkAndEmbed } from "@/lib/embeddings"

type DocumentListItem = {
    id: string
    title: string
    content: string
}

const EDIT_ACTION_PATTERN = /\b(rellen[aáo]|rellenala|rellenalo|llen[aáo]|llenala|llenalo|edit[aá]|actualiz[aá]|modific[aá]|cambi[aá]|escrib[ií]|pon[eé]|agreg[aá])\b/i
const DOCUMENT_REFERENCE_PATTERN = /\b(documento|doc|nota|archivo)\b|(?:\b(?:es[aeo]|la|lo|el)\s+(?:q|que)\s+(?:dice|se\s+llama|contiene))|\b(rellenala|rellenalo|llenala|llenalo)\b/i
const LIST_DOCUMENTS_PATTERN = /\b(list[aá]r?|mostr[aá]r?|ver|cu[aá]les|dame|decime)\b.*\b(mis\s+)?(documentos|docs|notas|archivos)\b|\b(mis\s+)?(documentos|docs|notas|archivos)\b.*\b(list[aá]|ten[eé]s|hay)\b/i

function createGroqClient() {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error("Missing GROQ_API_KEY")
    return new Groq({ apiKey })
}

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
}

function singularish(value: string) {
    return normalizeText(value)
        .split(" ")
        .map(word => word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word)
        .join(" ")
}

function extractDocumentQuery(message: string) {
    const explicitQuoted = message.match(/(?:documento|doc|nota|archivo)\s+(?:llamad[oa]|titulad[oa]|que\s+(?:dice|se\s+llama))?\s*["“”']([^"“”']+)["“”']/i)
    if (explicitQuoted?.[1]) return explicitQuoted[1].trim()

    const calledQuoted = message.match(/(?:llamad[oa]|titulad[oa])\s*["“”']([^"“”']+)["“”']/i)
    if (calledQuoted?.[1]) return calledQuoted[1].trim()

    const says = message.match(/(?:es[aeo]|la|lo|el)\s+(?:q|que)\s+(?:dice|se\s+llama|contiene)\s*["“”']?([\p{L}\p{N}\s_-]+?)(?:["“”']|,|\.|;|\s+y\s+|\s+con\s+|\s+(?:rellen|llen|edit|actualiz|modific|cambi)|$)/iu)
    if (says?.[1]) return says[1].trim()

    const unquoted = message.match(/(?:documento|doc|nota|archivo)\s+(?:llamad[oa]\s+|titulad[oa]\s+)?([\p{L}\p{N}\s_-]+?)(?:\s+(?:con|que|y)|,|\.|;|$)/iu)
    if (unquoted?.[1]) {
        const candidate = unquoted[1].trim()
        if (!/^(llamado|llamada|titulado|titulada)$/i.test(candidate)) return candidate
    }

    return null
}

function findMatchingDocument(docs: DocumentListItem[], query: string | null, message: string) {
    const normalizedMessage = normalizeText(message)
    const normalizedQuery = query ? normalizeText(query) : null
    const singularQuery = query ? singularish(query) : null

    const scored = docs
        .map(doc => {
            const title = normalizeText(doc.title)
            const singularTitle = singularish(doc.title)
            let score = 0

            if (normalizedQuery) {
                if (title === normalizedQuery) score = 100
                else if (singularTitle === singularQuery) score = 95
                else if (title.includes(normalizedQuery)) score = 85
                else if (normalizedQuery.includes(title)) score = 75
                else if (singularTitle.includes(singularQuery ?? "")) score = 70
            } else if (title && normalizedMessage.includes(title)) {
                score = 65 + Math.min(title.length, 20)
            }

            return { doc, score }
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)

    return scored[0]?.doc ?? null
}

function extractEditInstruction(message: string, documentTitle: string) {
    const normalizedTitle = documentTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const afterCon = message.match(/\bcon\b\s*:?\s*([\s\S]+)$/i)?.[1]?.trim()
    if (afterCon) return afterCon

    const afterTitle = message.match(new RegExp(`${normalizedTitle}["“”']?\\s*,?\\s*([\\s\\S]+)$`, "i"))?.[1]?.trim()
    if (afterTitle) return afterTitle

    return message.trim()
}

async function draftDocumentContent(title: string, currentContent: string, instruction: string) {
    const groq = createGroqClient()
    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            {
                role: "system",
                content: [
                    "Sos un editor de documentos dentro de una app de notas.",
                    "Devolve solamente el contenido final del documento.",
                    "No agregues saludos, explicaciones ni markdown fences.",
                    "Si el usuario dio texto literal despues de 'con:' o 'texto:', usalo como contenido."
                ].join(" ")
            },
            {
                role: "user",
                content: [
                    `Titulo del documento: ${title}`,
                    `Contenido actual: ${currentContent || "(vacio)"}`,
                    `Pedido del usuario: ${instruction}`
                ].join("\n")
            }
        ],
    })

    return completion.choices[0].message.content?.trim() || instruction
}

async function updateDocumentTags(documentId: string, userId: string, content: string) {
    const tagMatches = [...content.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(m => m[1].toLowerCase())
    const uniqueTags = [...new Set(tagMatches)]
    const docNode = await prisma.graphNode.findFirst({ where: { documentId, userId } })
    if (!docNode) return

    const oldTagNodes = await prisma.graphNode.findMany({
        where: { userId, type: "tag" },
        select: { id: true }
    })

    await prisma.graphEdge.deleteMany({
        where: {
            sourceId: docNode.id,
            targetId: { in: oldTagNodes.map(node => node.id) }
        }
    })

    for (const tag of uniqueTags) {
        let tagNode = await prisma.graphNode.findFirst({
            where: { userId, type: "tag", label: `#${tag}` }
        })

        if (!tagNode) {
            tagNode = await prisma.graphNode.create({
                data: {
                    label: `#${tag}`,
                    type: "tag",
                    userId,
                    x: Math.random() * 600 + 100,
                    y: Math.random() * 400 + 100,
                }
            })
        }

        await prisma.graphEdge.upsert({
            where: {
                sourceId_targetId: {
                    sourceId: docNode.id,
                    targetId: tagNode.id
                }
            },
            update: {},
            create: {
                sourceId: docNode.id,
                targetId: tagNode.id,
                userId
            }
        })
    }
}

async function handleDocumentEdit(message: string) {
    if (!EDIT_ACTION_PATTERN.test(message)) return null

    const session = await getSession()
    if (!session) {
        return NextResponse.json({ reply: "Necesito que inicies sesion para editar documentos." }, { status: 401 })
    }

    const documents = await prisma.document.findMany({
        where: { userId: session.userId },
        select: { id: true, title: true, content: true },
        orderBy: { updatedAt: "desc" }
    })

    const query = extractDocumentQuery(message)
    const hasDocumentReference = DOCUMENT_REFERENCE_PATTERN.test(message)
    const document = findMatchingDocument(documents, query, message)

    if (!query && !hasDocumentReference && !document) return null

    if (!document) {
        const name = query ? ` llamado "${query}"` : ""
        return NextResponse.json({ reply: `No encontre un documento${name}.` })
    }

    const instruction = extractEditInstruction(message, document.title)
    let content: string

    try {
        content = await draftDocumentContent(document.title, document.content, instruction)
    } catch (error) {
        console.error("Document edit draft failed:", error)
        return NextResponse.json({
            reply: "No pude generar contenido porque la IA no esta configurada. Revisa GROQ_API_KEY y reinicia el servidor."
        })
    }

    const updatedDocument = await prisma.document.update({
        where: { id: document.id },
        data: { content }
    })

    await prisma.documentChunk.deleteMany({ where: { documentId: document.id } })
    await chunkAndEmbed(document.id, content)
    await updateDocumentTags(document.id, session.userId, content)

    return NextResponse.json({
        reply: `Listo, actualice "${updatedDocument.title}".`,
        documentUpdated: true,
        document: {
            id: updatedDocument.id,
            title: updatedDocument.title,
            updatedAt: updatedDocument.updatedAt,
        }
    })
}

async function handleDocumentList(message: string) {
    if (!LIST_DOCUMENTS_PATTERN.test(message)) return null

    const session = await getSession()
    if (!session) {
        return NextResponse.json({ reply: "Necesito que inicies sesion para listar tus documentos." }, { status: 401 })
    }

    const documents = await prisma.document.findMany({
        where: { userId: session.userId },
        orderBy: { updatedAt: "desc" },
        select: {
            title: true,
            updatedAt: true,
        }
    })

    if (documents.length === 0) {
        return NextResponse.json({ reply: "No tenes documentos todavia." })
    }

    const formatter = new Intl.DateTimeFormat("es-UY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })

    const list = documents
        .map((doc, index) => `${index + 1}. ${doc.title} (${formatter.format(doc.updatedAt)})`)
        .join("\n")

    return NextResponse.json({ reply: `Tus documentos:\n${list}` })
}

export async function POST(req: Request) {
    const { message } = await req.json()
    const documentListResponse = await handleDocumentList(message)
    if (documentListResponse) return documentListResponse

    const documentEditResponse = await handleDocumentEdit(message)
    if (documentEditResponse) return documentEditResponse

    try {
        const groq = createGroqClient()
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "Eres poko, un asistente inteligente dentro de una app estilo Obsidian. Respondés de forma concisa y directa."
                },
                {
                    role: "user",
                    content: message
                }
            ],
        })

        const reply = completion.choices[0].message.content ?? "Sin respuesta."

        return NextResponse.json({ reply })
    } catch (error) {
        console.error("Chat completion failed:", error)
        return NextResponse.json({
            reply: "No pude conectar con el modelo de IA. Revisa GROQ_API_KEY y reinicia el servidor."
        })
    }
}
