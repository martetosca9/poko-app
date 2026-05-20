"use client"

import { useEffect, useRef, useState, useCallback } from "react"

type NodeType = "doc" | "tag" | "chat"

interface Node {
    id: string
    label: string
    type: NodeType
    x: number
    y: number
    vx: number
    vy: number
    documentId?: string | null
}

interface Edge {
    source: string
    target: string
}

const NODE_RADIUS: Record<NodeType, number> = { doc: 7, tag: 5, chat: 6 }
const NODE_COLOR:  Record<NodeType, string>  = { doc: "#22c55e", tag: "#a3e635", chat: "#2dd4bf" }
const NODE_GLOW:   Record<NodeType, string>  = { doc: "#22c55e", tag: "#a3e635", chat: "#2dd4bf" }

const REPULSION   = 3500
const ATTRACTION  = 0.012
const DAMPING     = 0.82
const CENTER_PULL = 0.002

export default function GraphView() {
    const canvasRef    = useRef<HTMLCanvasElement>(null)
    const nodesRef     = useRef<Node[]>([])
    const edgesRef     = useRef<Edge[]>([])
    const rafRef       = useRef<number>(0)
    const dragRef      = useRef<{ id: string; ox: number; oy: number } | null>(null)
    const panRef       = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
    const transformRef = useRef({ x: 0, y: 0, scale: 1 })
    const [hovered, setHovered]   = useState<string | null>(null)
    const [selected, setSelected] = useState<Node | null>(null)
    const [loading, setLoading]   = useState(true)
    const [graphData, setGraphData] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] })
    const [visibleTypes, setVisibleTypes] = useState<Record<NodeType, boolean>>({
        doc: true,
        tag: true,
        chat: true,
    })

    // Fetch real data
    useEffect(() => {
        fetch("/api/graph")
            .then(r => r.json())
            .then(data => {
                nodesRef.current = (data.nodes ?? []).map((n: Omit<Node, "vx" | "vy">) => ({
                    ...n,
                    vx: 0,
                    vy: 0,
                }))
                edgesRef.current = (data.edges ?? []).map((e: { sourceId: string; targetId: string }) => ({
                    source: e.sourceId,
                    target: e.targetId,
                }))
                setGraphData({
                    nodes: nodesRef.current,
                    edges: edgesRef.current,
                })
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const toCanvas = useCallback((sx: number, sy: number) => {
        const { x, y, scale } = transformRef.current
        return { cx: (sx - x) / scale, cy: (sy - y) / scale }
    }, [])

    const getNodeAt = useCallback((sx: number, sy: number) => {
        const { cx, cy } = toCanvas(sx, sy)
        return nodesRef.current.find(n => {
            if (!visibleTypes[n.type]) return false
            const r = NODE_RADIUS[n.type] + 4
            return Math.hypot(n.x - cx, n.y - cy) < r
        }) ?? null
    }, [toCanvas, visibleTypes])

    const simulate = useCallback(() => {
        const nodes = nodesRef.current
        const edges = edgesRef.current
        const cx = 500, cy = 350

        for (let i = 0; i < nodes.length; i++) {
            if (dragRef.current?.id === nodes[i].id) continue
            let fx = 0, fy = 0

            for (let j = 0; j < nodes.length; j++) {
                if (i === j) continue
                const dx = nodes[i].x - nodes[j].x
                const dy = nodes[i].y - nodes[j].y
                const dist = Math.max(Math.hypot(dx, dy), 1)
                const force = REPULSION / (dist * dist)
                fx += (dx / dist) * force
                fy += (dy / dist) * force
            }

            for (const e of edges) {
                const other =
                    e.source === nodes[i].id ? nodes.find(n => n.id === e.target) :
                    e.target === nodes[i].id ? nodes.find(n => n.id === e.source) :
                    null
                if (!other) continue
                const dx = other.x - nodes[i].x
                const dy = other.y - nodes[i].y
                fx += dx * ATTRACTION
                fy += dy * ATTRACTION
            }

            fx += (cx - nodes[i].x) * CENTER_PULL
            fy += (cy - nodes[i].y) * CENTER_PULL

            nodes[i].vx = (nodes[i].vx + fx) * DAMPING
            nodes[i].vy = (nodes[i].vy + fy) * DAMPING
            nodes[i].x += nodes[i].vx
            nodes[i].y += nodes[i].vy
        }
    }, [])

    const draw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")!
        const { x, y, scale } = transformRef.current
        const nodes = nodesRef.current.filter(node => visibleTypes[node.type])
        const visibleNodeIds = new Set(nodes.map(node => node.id))
        const edges = edgesRef.current.filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        ctx.translate(x, y)
        ctx.scale(scale, scale)

        for (const e of edges) {
            const src = nodes.find(n => n.id === e.source)
            const tgt = nodes.find(n => n.id === e.target)
            if (!src || !tgt) continue
            const isActive = hovered === src.id || hovered === tgt.id
            ctx.beginPath()
            ctx.moveTo(src.x, src.y)
            ctx.lineTo(tgt.x, tgt.y)
            ctx.strokeStyle = isActive ? "#22c55e55" : "#166534aa"
            ctx.lineWidth   = isActive ? 1.2 : 0.6
            ctx.stroke()
        }

        for (const n of nodes) {
            const r     = NODE_RADIUS[n.type]
            const color = NODE_COLOR[n.type]
            const glow  = NODE_GLOW[n.type]
            const isHov = hovered === n.id
            const isSel = selected?.id === n.id

            ctx.shadowColor = glow
            ctx.shadowBlur  = isHov || isSel ? 18 : 8

            ctx.beginPath()
            ctx.arc(n.x, n.y, isHov ? r + 2 : r, 0, Math.PI * 2)
            ctx.fillStyle = isSel ? "#fff" : color
            ctx.fill()

            ctx.shadowBlur = 0

            if (isHov || isSel || scale > 1.2) {
                ctx.font      = `${10 / scale}px ui-monospace, monospace`
                ctx.fillStyle = isHov ? "#86efac" : "#4ade80"
                ctx.fillText(n.label, n.x + r + 4, n.y + 4)
            }
        }

        ctx.restore()
    }, [hovered, selected, visibleTypes])

    useEffect(() => {
        const loop = () => {
            simulate()
            draw()
            rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(rafRef.current)
    }, [simulate, draw])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ro = new ResizeObserver(() => {
            canvas.width  = canvas.offsetWidth
            canvas.height = canvas.offsetHeight
        })
        ro.observe(canvas)
        canvas.width  = canvas.offsetWidth
        canvas.height = canvas.offsetHeight
        return () => ro.disconnect()
    }, [])

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect()
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top
        const node = getNodeAt(sx, sy)
        if (node) {
            dragRef.current = { id: node.id, ox: sx, oy: sy }
            setSelected(node)
        } else {
            panRef.current = {
                startX: sx, startY: sy,
                ox: transformRef.current.x,
                oy: transformRef.current.y,
            }
        }
    }, [getNodeAt])

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect()
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top
        if (dragRef.current) {
            const { cx, cy } = toCanvas(sx, sy)
            const node = nodesRef.current.find(n => n.id === dragRef.current!.id)
            if (node) { node.x = cx; node.y = cy; node.vx = 0; node.vy = 0 }
        } else if (panRef.current) {
            transformRef.current.x = panRef.current.ox + (sx - panRef.current.startX)
            transformRef.current.y = panRef.current.oy + (sy - panRef.current.startY)
        } else {
            const node = getNodeAt(sx, sy)
            setHovered(node?.id ?? null)
        }
    }, [toCanvas, getNodeAt])

    const onPointerUp = useCallback(() => {
        dragRef.current = null
        panRef.current  = null
    }, [])

    const onWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const rect  = canvasRef.current!.getBoundingClientRect()
        const sx    = e.clientX - rect.left
        const sy    = e.clientY - rect.top
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        const { x, y, scale } = transformRef.current
        const newScale = Math.min(Math.max(scale * delta, 0.3), 4)
        transformRef.current = {
            scale: newScale,
            x: sx - (sx - x) * (newScale / scale),
            y: sy - (sy - y) * (newScale / scale),
        }
    }, [])

    const graphStats = (["doc", "tag", "chat"] as NodeType[]).map(type => {
        const typeNodes = graphData.nodes.filter(node => node.type === type)
        const typeNodeIds = new Set(typeNodes.map(node => node.id))
        const connectionCount = graphData.edges.filter(edge =>
            typeNodeIds.has(edge.source) || typeNodeIds.has(edge.target)
        ).length

        return { type, nodeCount: typeNodes.length, connectionCount }
    })

    const selectedConnectionCount = selected
        ? graphData.edges.filter(edge => edge.source === selected.id || edge.target === selected.id).length
        : 0

    return (
        <div className="relative flex flex-1 overflow-hidden">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-600 font-mono">
                    loading graph...
                </div>
            )}

            <canvas
                ref={canvasRef}
                className="flex-1 cursor-crosshair"
                style={{ background: "transparent" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onWheel={onWheel}
            />

            <div className="absolute bottom-4 left-4 flex min-w-36 flex-col gap-1.5 border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-[10px] font-mono">
                {graphStats.map(({ type, nodeCount, connectionCount }) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setVisibleTypes(current => ({ ...current, [type]: !current[type] }))}
                        className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 text-left transition ${
                            visibleTypes[type] ? "text-neutral-300" : "text-neutral-700"
                        }`}
                    >
                        <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{
                                background: NODE_COLOR[type],
                                boxShadow: visibleTypes[type] ? `0 0 4px ${NODE_COLOR[type]}` : "none",
                                opacity: visibleTypes[type] ? 1 : 0.35,
                            }}
                        />
                        <span>{type}</span>
                        <span className="text-neutral-500">{nodeCount} / {connectionCount}</span>
                    </button>
                ))}
                <div className="mt-1 border-t border-neutral-800 pt-1 text-[9px] text-neutral-600">
                    nodes / links
                </div>
            </div>

            {selected && (
                <div className="absolute right-4 top-4 w-48 border border-neutral-800 bg-neutral-950/90 p-3 font-mono text-[10px]">
                    <div className="mb-1 text-green-400">{selected.label}</div>
                    <div className="text-neutral-500">type: {selected.type}</div>
                    <div className="text-neutral-500">links: {selectedConnectionCount}</div>
                    <button
                        onClick={() => setSelected(null)}
                        className="mt-2 text-neutral-600 hover:text-neutral-400"
                    >[ dismiss ]</button>
                </div>
            )}

            <div className="absolute bottom-4 right-4 font-mono text-[9px] text-neutral-700">
                scroll to zoom · drag to pan · drag node to move
            </div>
        </div>
    )
}
