"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

interface AccordionItem {
    title: string
    content: string | React.ReactNode
    icon?: React.ReactNode
}

interface AccordionProps {
    items: AccordionItem[]
    defaultOpenIndex?: number
    allowMultiple?: boolean
}

export default function Accordion({ items, defaultOpenIndex = 0, allowMultiple = false }: AccordionProps) {
    const [openIndexes, setOpenIndexes] = useState<Set<number>>(
        new Set(defaultOpenIndex >= 0 ? [defaultOpenIndex] : [])
    )

    const toggle = (index: number) => {
        setOpenIndexes(prev => {
            const next = new Set(allowMultiple ? prev : [])
            if (prev.has(index)) {
                next.delete(index)
            } else {
                next.add(index)
            }
            return next
        })
    }

    return (
        <div className="space-y-3">
            {items.map((item, index) => {
                const isOpen = openIndexes.has(index)
                return (
                    <div key={index} className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
                        <button
                            onClick={() => toggle(index)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {item.icon && <div className="shrink-0">{item.icon}</div>}
                                <span className="font-semibold text-sm text-zinc-900">{item.title}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="px-4 pb-4 text-sm text-zinc-600 leading-relaxed">
                                {typeof item.content === 'string' ? <p>{item.content}</p> : item.content}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
