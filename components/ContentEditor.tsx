import { useState, useMemo } from 'react'
import { 
    Palette, 
    Type, 
    Layers, 
    Box, 
    ChevronDown, 
    ChevronUp, 
    Save, 
    Layout, 
    Monitor, 
    Smartphone,
    Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface EditorCustomizations {
    heroStyle: string
    aboutStyle: string
    servicesStyle: string
    galleryStyle: string
    contactStyle: string
    colorScheme: string
    colorSchemeId: string
    fontPairing: string
    fontPairingId: string
    // Legacy fields kept for backward compat
    navbarStyle?: string
    featuredStyle?: string
    footerStyle?: string
}

const STYLE_METADATA: Record<string, Record<string, { label: string, description: string, previewUrl?: string }>> = {
    heroStyle: {
        'A': { label: 'Split Modern', description: 'Dynamic split with text left and visual focus right.' },
        'B': { label: 'Fullscreen', description: 'Immersive background with elegant centered typography.' },
        'C': { label: 'Carousel', description: 'Narrative-driven slides with intuitive navigation.' },
        'D': { label: 'Agency Dark', description: 'Bold services-first list with a sophisticated dark theme.' },
        'E': { label: 'Visual Narrative', description: 'Modern, layered composition with floating elements.' },
        'F': { label: 'Luxury Elegant', description: 'Minimalist high-end layout with refined spacing.' },
        'G': { label: 'First Class', description: 'Cinematic luxury with ornate gold accents and motion.' }
    },
    aboutStyle: {
        'A': { label: 'Gallery Split', description: 'Balanced layout with integrated mini-gallery.' },
        'B': { label: 'Minimal Italic', description: 'Typographic focus with decorative serif accents.' },
        'C': { label: 'Tags Card', description: 'Structured information cards for quick readability.' },
        'D': { label: 'Corporate Quote', description: 'Trust-focused layout with brand carousel.' },
        'E': { label: 'Immersive DNA', description: 'Deep storytelling with parallax backgrounds.' },
        'F': { label: 'Luxury Story', description: 'Magazine-style layout with elegant editorial feel.' },
        'G': { label: 'Michelin Star', description: 'Asymmetric luxury with executive chef signatures.' }
    },
    servicesStyle: {
        'A': { label: 'Accordion', description: 'Interactive expandable lists with contextual imagery.' },
        'B': { label: 'Numbered Grid', description: 'Sequential minimal grid for process-driven services.' },
        'C': { label: 'Action Cards', description: 'Clickable feature cards with subtle hover effects.' },
        'D': { label: 'Stats Focus', description: 'Data-driven layout with social proof integration.' },
        'E': { label: 'Capabilities Mosaic', description: 'Asymmetric grid for a creative, modern display.' },
        'F': { label: 'Luxury Mosaic', description: 'Refined grid with premium hover states and spacing.' },
        'G': { label: 'Curated Menu', description: 'Sophisticated dark menu with numbered experiences.' }
    },
    galleryStyle: {
        'A': { label: 'Scroll Reveal', description: 'Smooth entrance animations on scroll.' },
        'B': { label: 'Stack Deck', description: 'Layered horizontal scroll for compact navigation.' },
        'C': { label: 'Fixed Grid', description: 'Standard high-visibility image grid.' },
        'D': { label: 'Staggered Masonry', description: 'Creative vertical flow for diverse asset sizes.' },
        'E': { label: 'Fluid Mosaic', description: 'Edge-to-edge immersive experience.' },
        'F': { label: 'Luxury Showcase', description: 'Premium focus on single items with elegant framing.' },
        'G': { label: 'Epicurean Tour', description: 'High-contrast immersion with immersive vignettes.' }
    },
    contactStyle: {
        'A': { label: 'Grid Dark', description: 'High-contrast footer with structured contact info.' },
        'B': { label: 'Artisan Light', description: 'Clean, airy layout with soft shadows and focus.' },
        'C': { label: 'Bold CTA', description: 'Loud, center-aligned call to action section.' },
        'D': { label: 'Marquee Rows', description: 'Dynamic moving visuals with overlayed info.' },
        'E': { label: 'Glass Tiles', description: 'Premium interactive tiles with blur effects.' },
        'F': { label: 'Luxury Concierge', description: 'The peak of refined contact experiences.' },
        'G': { label: 'Reserve Elite', description: 'Prestigious brand sign-off with gold brand detailing.' }
    }
}

const StylePreviewBadge = ({ style, type, colorScheme = 'blue' }: { style: string, type: string, colorScheme?: string }) => {
    // Dynamic colors based on scheme
    const themeColors: Record<string, string> = {
        'blue': 'bg-blue-600',
        'green': 'bg-emerald-600',
        'purple': 'bg-indigo-600',
        'orange': 'bg-orange-600',
        'dark': 'bg-gray-900',
        'pink': 'bg-pink-600',
        'brown': 'bg-amber-800',
        'red': 'bg-red-600',
        'yellow': 'bg-yellow-500',
        'maroon': 'bg-rose-900',
        'black': 'bg-black',
        'gold': 'bg-amber-600',
        'auto': 'bg-blue-600'
    }
    const color = themeColors[colorScheme] || themeColors.blue

    // Generate a mini-schematic based on the style
    const renderSchematic = () => {
        switch (style) {
            case 'A': // Split / Grid
                return (
                    <div className="flex gap-1.5 h-full w-full">
                        <div className="w-1/2 bg-gray-50 rounded p-1 space-y-1 overflow-hidden">
                            <div className={`h-1.5 w-full ${color} opacity-40 rounded-full`} />
                            <div className="h-1 w-3/4 bg-gray-200 rounded-full" />
                            <div className="h-1 w-2/3 bg-gray-100 rounded-full" />
                            <div className={`h-2 w-1/2 ${color} opacity-80 rounded-sm mt-1`} />
                        </div>
                        <div className="w-1/2 bg-gray-100/50 rounded flex items-center justify-center p-1">
                            <Box className="w-4 h-4 text-gray-300" strokeWidth={1} />
                        </div>
                    </div>
                )
            case 'B': // Full / Minimal
                return (
                    <div className="relative h-full w-full bg-gray-50 rounded overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-gray-400 to-transparent" />
                        <div className="z-10 flex flex-col items-center gap-1 w-full p-2">
                            <div className={`h-1.5 w-1/2 ${color} opacity-90 rounded-full`} />
                            <div className="h-1 w-2/3 bg-gray-300 rounded-full" />
                            <div className={`h-2.5 w-1/3 ${color} rounded-sm mt-1`} />
                        </div>
                    </div>
                )
            case 'C': // Carousel / Cards
                return (
                    <div className="h-full w-full flex flex-col gap-1.5 p-1 bg-gray-50 rounded">
                        <div className="flex gap-1 flex-1">
                            <div className="w-1/3 bg-gray-100 rounded-sm" />
                            <div className={`w-1/3 ${color} opacity-20 border border-gray-200 rounded-sm`} />
                            <div className="w-1/3 bg-gray-100 rounded-sm" />
                        </div>
                        <div className="flex justify-center gap-1 pb-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                        </div>
                    </div>
                )
            case 'D': // Dark / List
                return (
                    <div className="h-full w-full bg-gray-900 rounded p-2 flex flex-col gap-1.5">
                        <div className={`h-1.5 w-1/2 ${color} opacity-50 rounded-full`} />
                        <div className="flex gap-2 items-center">
                           <div className="w-2 h-2 rounded-full border border-gray-700 shrink-0" />
                           <div className="h-1 w-full bg-gray-700 rounded-full" />
                        </div>
                        <div className="flex gap-2 items-center">
                           <div className={`w-2 h-2 rounded-full border ${color} opacity-40 shrink-0`} />
                           <div className="h-1 w-3/4 bg-gray-700 rounded-full" />
                        </div>
                    </div>
                )
            case 'E': // Mosaic / Fluid
                return (
                    <div className="grid grid-cols-3 grid-rows-2 gap-1 h-full w-full p-1 bg-gray-50 rounded">
                        <div className={`col-span-2 bg-gray-100 rounded-sm border border-gray-100`} />
                        <div className={`${color} opacity-40 rounded-sm`} />
                        <div className="bg-gray-100 rounded-sm" />
                        <div className={`col-span-2 ${color} opacity-10 border border-gray-200 rounded-sm`} />
                    </div>
                )
            case 'G': // First Class / Fine Dining
                return (
                    <div className="h-full w-full bg-[#050505] rounded overflow-hidden flex flex-col items-center justify-center p-2 relative border border-amber-900/40">
                        <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-amber-500/50" />
                        <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-amber-500/50" />
                        <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-amber-500/50" />
                        <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-amber-500/50" />
                        <div className="z-10 flex flex-col items-center gap-1.5 w-full">
                            <div className="w-6 h-[0.5px] bg-amber-500/30" />
                            <div className={`h-1 w-3/4 bg-white opacity-90 rounded-full`} />
                            <div className="h-0.5 w-1/2 bg-white/30 rounded-full" />
                            <div className={`h-1.5 w-1/3 bg-amber-500/80 rounded-sm mt-0.5`} />
                            <div className="w-6 h-[0.5px] bg-amber-500/30" />
                        </div>
                    </div>
                )
            default: return <div className="bg-gray-50 h-full w-full rounded" />
        }
    }

    return (
        <div className="w-full h-24 mb-1.5 bg-white border border-gray-100 rounded-lg p-1.5 shadow-sm group-hover:border-blue-200 group-hover:shadow transition-all group-hover:scale-[1.02] duration-200 overflow-hidden ring-offset-2 group-active:scale-[0.98]">
            {renderSchematic()}
        </div>
    )
}

interface ContentEditorProps {
    initialCustomizations?: Partial<EditorCustomizations>
    onUpdate: (customizations: EditorCustomizations) => void
    disabled?: boolean
}

export default function ContentEditor({ initialCustomizations, onUpdate, disabled }: ContentEditorProps) {
    const [customizations, setCustomizations] = useState<EditorCustomizations>({
        heroStyle: initialCustomizations?.heroStyle || 'A',
        aboutStyle: initialCustomizations?.aboutStyle || 'A',
        servicesStyle: initialCustomizations?.servicesStyle || 'A',
        galleryStyle: initialCustomizations?.galleryStyle || initialCustomizations?.featuredStyle || 'A',
        contactStyle: initialCustomizations?.contactStyle || initialCustomizations?.footerStyle || 'A',
        colorScheme: initialCustomizations?.colorSchemeId || 'auto',
        colorSchemeId: initialCustomizations?.colorSchemeId || 'auto',
        fontPairing: initialCustomizations?.fontPairingId || 'modern',
        fontPairingId: initialCustomizations?.fontPairingId || 'modern'
    })

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['layout']))
    const [hasChanges, setHasChanges] = useState(false)

    const updateField = (field: keyof EditorCustomizations, value: string) => {
        setCustomizations(prev => {
            const next = { ...prev, [field]: value }
            // Sync IDs
            if (field === 'colorScheme') next.colorSchemeId = value
            if (field === 'fontPairing') next.fontPairingId = value
            return next
        })
        setHasChanges(true)
    }

    const handleSave = () => {
        onUpdate(customizations)
        setHasChanges(false)
    }

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev)
            if (newSet.has(section)) {
                newSet.delete(section)
            } else {
                newSet.add(section)
            }
            return newSet
        })
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Content Editor
                </h3>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* Layout Section */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                        onClick={() => toggleSection('layout')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                        <div className="flex items-center gap-2 font-medium text-gray-700">
                            <Layers className="w-4 h-4" />
                            <span>Section Styles</span>
                        </div>
                        {expandedSections.has('layout') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {expandedSections.has('layout') && (
                        <div className="p-4 space-y-6 bg-white">
                            {[
                                { id: 'heroStyle', label: 'Hero Section', sub: 'Top Banner' },
                                { id: 'aboutStyle', label: 'About Section', sub: 'Story & Mission' },
                                { id: 'servicesStyle', label: 'Services Section', sub: 'What We Do' },
                                { id: 'galleryStyle', label: 'Gallery Section', sub: 'Visual Portfolio' },
                                { id: 'contactStyle', label: 'Contact Section', sub: 'Conversion Point' },
                            ].map((section) => (
                                <div key={section.id} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-[0.15em]">
                                            {section.label}
                                        </label>
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">
                                            {section.sub}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        {(Object.entries(STYLE_METADATA[section.id])).map(([key, meta]) => (
                                            <button
                                                key={key}
                                                onClick={() => updateField(section.id as any, key)}
                                                className={`
                                                    group relative flex flex-col p-2.5 rounded-2xl border transition-all text-left
                                                    ${customizations[section.id as keyof EditorCustomizations] === key 
                                                        ? 'bg-blue-50/50 border-blue-200 ring-2 ring-blue-50 ring-offset-0' 
                                                        : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'}
                                                `}
                                            >
                                                <StylePreviewBadge style={key} type={section.id} colorScheme={customizations.colorSchemeId} />
                                                <div className="flex-1 min-w-0 px-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[10px] font-black uppercase tracking-tight ${customizations[section.id as keyof EditorCustomizations] === key ? 'text-blue-700' : 'text-gray-900'}`}>
                                                            {meta.label}
                                                        </span>
                                                        {customizations[section.id as keyof EditorCustomizations] === key && (
                                                            <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                                                                <Check size={7} className="text-white" strokeWidth={4} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 font-bold leading-tight mt-0.5 line-clamp-1 uppercase">
                                                        Style {key}
                                                    </p>
                                                </div>
                                                
                                                {/* Selection Overlay */}
                                                {customizations[section.id as keyof EditorCustomizations] === key && (
                                                    <motion.div 
                                                        layoutId={`selected-${section.id}`}
                                                        className="absolute inset-0 border-2 border-blue-500 rounded-2xl pointer-events-none z-20"
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="h-px bg-gray-50 !mt-6" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Appearance Section */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                        onClick={() => toggleSection('appearance')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                        <div className="flex items-center gap-2 font-medium text-gray-700">
                            <Palette className="w-4 h-4" />
                            <span>Appearance</span>
                        </div>
                        {expandedSections.has('appearance') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {expandedSections.has('appearance') && (
                        <div className="p-4 space-y-4 bg-white">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Palette className="w-4 h-4" />
                                    Color Scheme
                                </label>
                                <select
                                    value={customizations.colorSchemeId}
                                    onChange={(e) => updateField('colorScheme', e.target.value)}
                                    disabled={disabled}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
                                >
                                    <option value="auto">Auto (from photos)</option>
                                    <option value="blue">Blue Professional</option>
                                    <option value="green">Green Fresh</option>
                                    <option value="purple">Purple Creative</option>
                                    <option value="orange">Orange Energetic</option>
                                    <option value="dark">Dark Elegant</option>
                                    <option value="pink">Pink Vibrant</option>
                                    <option value="brown">Brown Natural</option>
                                    <option value="red">Red Intense</option>
                                    <option value="yellow">Yellow Bright</option>
                                    <option value="maroon">Maroon Rich</option>
                                    <option value="black">Black Monochrome</option>
                                    <option value="gold">Gold Premium</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Type className="w-4 h-4" />
                                    Typography
                                </label>
                                <select
                                    value={customizations.fontPairingId}
                                    onChange={(e) => updateField('fontPairing', e.target.value)}
                                    disabled={disabled}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
                                >
                                    <option value="modern">Modern (Default)</option>
                                    <option value="classic">Classic Serif</option>
                                    <option value="elegant">Elegant Display</option>
                                    <option value="bold">Bold & Loud</option>
                                    <option value="minimal">Minimal Sans</option>
                                    <option value="professional">Professional Sans</option>
                                    <option value="creative">Creative Bold</option>
                                    <option value="tech">Tech Mono</option>
                                    <option value="friendly">Friendly Rounded</option>
                                    <option value="luxury">Luxury Serif</option>
                                    <option value="gourmet">Gourmet Elegant</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
                <button
                    onClick={handleSave}
                    disabled={disabled || !hasChanges}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-white transition-colors
                        ${disabled || !hasChanges
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-[#1F2933] hover:bg-gray-800'
                        }`}
                >
                    <Save className="w-4 h-4" />
                    Save Changes
                </button>
            </div>
        </div>
    )
}
