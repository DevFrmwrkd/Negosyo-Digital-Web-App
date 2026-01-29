'use client'

import { useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'

interface WebsitePreviewProps {
    htmlContent: string
    isRegenerating: boolean
}

export default function WebsitePreview({
    htmlContent,
    isRegenerating,
}: WebsitePreviewProps) {
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            {/* Header Controls */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">Preview</h3>

                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('desktop')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'desktop'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            title="Desktop View"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('mobile')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'mobile'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            title="Mobile View"
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Iframe Container */}
            <div className="flex-1 bg-gray-100 p-8 overflow-y-auto relative">
                {isRegenerating && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="text-sm font-medium text-gray-600">Regenerating preview...</span>
                        </div>
                    </div>
                )}

                <div className={`mx-auto bg-white shadow-xl transition-all duration-300 origin-top ${viewMode === 'desktop' ? 'w-full max-w-[1200px] aspect-[16/9]' : 'w-[375px] h-[812px] border-[10px] border-gray-800 rounded-[30px]'
                    }`}>
                    <iframe
                        id="website-preview"
                        srcDoc={htmlContent}
                        className={`w-full h-full ${viewMode === 'mobile' ? 'rounded-[20px]' : ''}`}
                        title="Website Preview"
                        sandbox="allow-same-origin allow-scripts"
                    />
                </div>
            </div>
        </div>
    )
}
