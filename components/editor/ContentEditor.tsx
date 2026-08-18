'use client'

import { useState } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import EditableText from './EditableText'

interface Service {
    name: string
    description: string
}

interface WebsiteContent {
    business_name: string
    tagline: string
    about: string
    services: Service[]
    contact?: {
        phone?: string
        email?: string
        address?: string
    }
}

interface ContentEditorProps {
    initialContent: WebsiteContent
    submissionId: string
    onSave: (content: WebsiteContent) => Promise<void>
}

export default function ContentEditor({
    initialContent,
    submissionId,
    onSave
}: ContentEditorProps) {
    const [content, setContent] = useState<WebsiteContent>(initialContent)
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    const updateField = (field: keyof WebsiteContent, value: any) => {
        setContent(prev => ({ ...prev, [field]: value }))
        setHasChanges(true)
    }

    const updateService = (index: number, field: keyof Service, value: string) => {
        setContent(prev => ({
            ...prev,
            // Both shapes: legacy bare array, and the nested { items[] } the AI
            // extraction emits. Reading only the array left `.map` undefined.
            services: (Array.isArray(prev.services) ? prev.services : ((prev.services as any)?.items ?? [])).map((service: any, i: number) =>
                i === index ? { ...service, [field]: value } : service
            )
        }))
        setHasChanges(true)
    }

    const updateContact = (field: string, value: string) => {
        setContent(prev => ({
            ...prev,
            contact: { ...prev.contact, [field]: value }
        }))
        setHasChanges(true)
    }

    const handleSave = async () => {
        setIsSaving(true)
        const saveToast = toast.loading('Saving changes...')

        try {
            await onSave(content)
            setHasChanges(false)
            toast.success('Changes saved successfully!', { id: saveToast })
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Failed to save changes', { id: saveToast })
        } finally {
            setIsSaving(false)
        }
    }

    const handleReset = () => {
        if (confirm('Reset all changes?')) {
            setContent(initialContent)
            setHasChanges(false)
            toast.info('Changes reset')
        }
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Content Editor</h3>
                    <p className="text-sm text-gray-500">Click on any text to edit</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        disabled={!hasChanges || isSaving}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Business Info */}
            <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Business Information</h4>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Name
                    </label>
                    <EditableText
                        value={content.business_name}
                        onChange={(value) => updateField('business_name', value)}
                        className="text-2xl font-bold"
                        maxLength={100}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tagline
                    </label>
                    <EditableText
                        value={content.tagline}
                        onChange={(value) => updateField('tagline', value)}
                        className="text-lg"
                        maxLength={200}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        About
                    </label>
                    <EditableText
                        value={content.about}
                        onChange={(value) => updateField('about', value)}
                        className="text-base"
                        multiline
                        maxLength={500}
                    />
                </div>
            </div>

            {/* Services */}
            <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Services / Products</h4>
                {(Array.isArray(content.services) ? content.services : ((content.services as any)?.items ?? [])).map((service: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Service {index + 1} - Name
                            </label>
                            <EditableText
                                value={service.name}
                                onChange={(value) => updateService(index, 'name', value)}
                                className="font-semibold"
                                maxLength={100}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <EditableText
                                value={service.description}
                                onChange={(value) => updateService(index, 'description', value)}
                                className="text-sm"
                                multiline
                                maxLength={300}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Contact Information</h4>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                    </label>
                    <EditableText
                        value={content.contact?.phone || ''}
                        onChange={(value) => updateContact('phone', value)}
                        placeholder="Enter phone number"
                        maxLength={50}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                    </label>
                    <EditableText
                        value={content.contact?.email || ''}
                        onChange={(value) => updateContact('email', value)}
                        placeholder="Enter email address"
                        maxLength={100}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                    </label>
                    <EditableText
                        value={content.contact?.address || ''}
                        onChange={(value) => updateContact('address', value)}
                        placeholder="Enter business address"
                        multiline
                        maxLength={200}
                    />
                </div>
            </div>

            {/* Save Indicator */}
            {hasChanges && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    ⚠️ You have unsaved changes. Click "Save Changes" to apply them.
                </div>
            )}
        </div>
    )
}
