'use client'

import { useState } from 'react'
import { Palette, Type, Layers, Box, ChevronDown, ChevronUp, Save } from 'lucide-react'

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
                        <div className="p-4 space-y-4 bg-white">
                            {/* Hero Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    Hero Section
                                    <span className="text-xs text-gray-400 font-normal ml-auto">Top Banner</span>
                                </label>
                                <select
                                    value={customizations.heroStyle}
                                    onChange={(e) => updateField('heroStyle', e.target.value)}
                                    disabled={disabled}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
                                >
                                    <option value="A">Split Dark Modern (Default)</option>
                                    <option value="B">Fullscreen Background</option>
                                    <option value="C">Centered Carousel</option>
                                    <option value="D">Services List Dark</option>
                                    <option value="E">Visual Narrative (Modern)</option>
                                </select>
                            </div>

                            {/* About Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    About Section
                                    <span className="text-xs text-gray-400 font-normal ml-auto">About Us</span>
                                </label>
                                <select
                                    value={customizations.aboutStyle}
                                    onChange={(e) => updateField('aboutStyle', e.target.value)}
                                    disabled={disabled}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
                                >
                                    <option value="A">Gallery Split (Default)</option>
                                    <option value="B">Minimal Italic</option>
                                    <option value="C">Tags Card</option>
                                    <option value="D">Quote with Logo Carousel</option>
                                    <option value="E">Immersive DNA (Modern)</option>
                                </select>
                            </div>

                            {/* Services Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    Services Section
                                    <span className="text-xs text-gray-400 font-normal ml-auto">What We Do</span>
                                </label>
                                <select
                                    value={customizations.servicesStyle}
                                    onChange={(e) => updateField('servicesStyle', e.target.value)}
                                    disabled={disabled}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
                                >
                                    <option value="A">Accordion with Image (Default)</option>
                                    <option value="B">Minimal Numbered Grid</option>
                                    <option value="C">Card Grid</option>
                                    <option value="D">Stats Grid with Quote</option>
                                    <option value="E">Capabilites Mosaic (Modern)</option>
                                </select>
                            </div>

                            {/* Gallery Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    Gallery Section
                                    <span className="text-xs text-gray-400 font-normal ml-auto">Portfolio</span>
                                </label>
                                <select
                                    value={customizations.galleryStyle}
                                    onChange={(e) => updateField('galleryStyle', e.target.value)}
                                    disabled={disabled}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
                                >
                                    <option value="A">Scroll Reveal Cards (Default)</option>
                                    <option value="B">Portfolio Stack</option>
                                    <option value="C">Image Grid</option>
                                    <option value="D">Staggered Masonry</option>
                                    <option value="E">Fluid Mosaic (Modern)</option>
                                </select>
                            </div>

                            {/* Contact Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    Contact Section
                                    <span className="text-xs text-gray-400 font-normal ml-auto">Get in Touch</span>
                                </label>
                                <select
                                    value={customizations.contactStyle}
                                    onChange={(e) => updateField('contactStyle', e.target.value)}
                                    disabled={disabled}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
                                >
                                    <option value="A">Contact Grid Dark (Default)</option>
                                    <option value="B">Craft Style Light</option>
                                    <option value="C">Bold CTA</option>
                                    <option value="D">Dark Marquee Photos</option>
                                    <option value="E">Interactive Tile Glass (Modern)</option>
                                </select>
                            </div>
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
