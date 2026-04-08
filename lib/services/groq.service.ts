import Groq, { toFile } from "groq-sdk"
import fs from "fs"
import os from "os"
import path from "path"
import { chunkMediaFile, getFileExtension } from './media-chunker'

// Lazy-load Groq client to avoid build-time errors
let groqInstance: Groq | null = null

function getGroqClient(): Groq {
    if (!groqInstance) {
        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) {
            throw new Error('GROQ_API_KEY environment variable is not set')
        }
        groqInstance = new Groq({ apiKey })
    }
    return groqInstance
}

/**
 * Write buffer to a temp file and return the path.
 * Groq SDK works best with fs.createReadStream() in Node.js.
 */
function writeTempFile(buffer: ArrayBuffer | Uint8Array, filename: string): string {
    const tmpDir = os.tmpdir()
    const tmpPath = path.join(tmpDir, `groq-${Date.now()}-${filename}`)
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    fs.writeFileSync(tmpPath, data)
    return tmpPath
}

/**
 * Clean up temp file, ignoring errors.
 */
function cleanupTempFile(filePath: string): void {
    try { fs.unlinkSync(filePath) } catch { /* ignore */ }
}

export const groqService = {
    /**
     * Transcribe audio buffer to text using Whisper via temp file + stream.
     * Retries up to 3 times on transient connection errors.
     */
    async transcribeBuffer(buffer: ArrayBuffer, filename: string, retries = 3): Promise<string> {
        const tmpPath = writeTempFile(buffer, filename)
        try {
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const groq = getGroqClient()
                    // Use toFile() to explicitly set filename (Groq validates extension)
                    const fileData = await toFile(fs.createReadStream(tmpPath), filename)
                    const transcription = await groq.audio.transcriptions.create({
                        file: fileData,
                        model: "whisper-large-v3",
                        response_format: "json",
                    })
                    return transcription.text
                } catch (error: any) {
                    const isTransient = error?.code === 'ECONNRESET' ||
                        error?.cause?.code === 'ECONNRESET' ||
                        error?.message?.includes('Connection error')
                    if (isTransient && attempt < retries) {
                        console.warn(`Groq connection error (attempt ${attempt}/${retries}), retrying in ${attempt * 3}s...`)
                        await new Promise(r => setTimeout(r, attempt * 3000))
                        continue
                    }
                    console.error('Groq transcription error:', error)
                    throw new Error(error?.message || 'Failed to transcribe audio')
                }
            }
            throw new Error('Failed to transcribe audio after retries')
        } finally {
            cleanupTempFile(tmpPath)
        }
    },

    /**
     * Transcribe audio File object (legacy interface, used by small files).
     */
    async transcribeAudio(audioFile: File): Promise<string> {
        const buffer = await audioFile.arrayBuffer()
        return this.transcribeBuffer(buffer, audioFile.name)
    },

    /**
     * Transcribe audio from URL.
     * For files over 25MB, chunks into valid segments and transcribes each.
     * Uses temp files + fs.createReadStream for reliable Groq uploads.
     */
    async transcribeAudioFromUrl(audioUrl: string): Promise<string> {
        const MAX_FILE_SIZE = 22 * 1024 * 1024 // 22MB threshold for chunking (aligned with chunk size)

        try {
            const startTime = Date.now()
            const response = await fetch(audioUrl)
            const arrayBuffer = await response.arrayBuffer()
            const contentType = response.headers.get('content-type') || 'audio/mpeg'
            const ext = getFileExtension(contentType)
            const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(1)

            console.log(`[GROQ] Starting transcription: ${sizeMB}MB file (${contentType})`)

            // Small file — send directly via temp file
            if (arrayBuffer.byteLength <= MAX_FILE_SIZE) {
                console.log(`[GROQ] File size ${sizeMB}MB ≤ ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB threshold, sending directly`)
                return await this.transcribeBuffer(arrayBuffer, `audio.${ext}`)
            }

            // Large file — chunk, then release original buffer before transcribing
            console.log(`[GROQ] File size ${sizeMB}MB > ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB threshold, chunking...`)
            const chunks = chunkMediaFile(arrayBuffer, contentType)

            // MP4 video → extracted as audio-only MP4 → use .m4a extension
            const chunkExt = contentType.includes('video') ? 'm4a' : ext

            // Write all chunks to temp files FIRST, then release the large buffer
            const tmpPaths: string[] = []
            for (let i = 0; i < chunks.length; i++) {
                const tmpPath = writeTempFile(chunks[i], `chunk_${i}.${chunkExt}`)
                tmpPaths.push(tmpPath)
            }

            // Release references to the large original buffer and chunks
            // @ts-ignore - intentional nullification for GC
            chunks.length = 0

            // Force GC hint (won't guarantee collection but helps)
            if (global.gc) global.gc()

            console.log(`[GROQ] Wrote ${tmpPaths.length} chunks to temp files, starting transcription...`)

            const transcripts: string[] = []
            try {
                for (let i = 0; i < tmpPaths.length; i++) {
                    const stat = fs.statSync(tmpPaths[i])
                    const chunkSizeMB = (stat.size / 1024 / 1024).toFixed(1)
                    console.log(`[GROQ] Processing chunk ${i + 1}/${tmpPaths.length} (${chunkSizeMB}MB)`)

                    let transcribed = false
                    for (let attempt = 1; attempt <= 5; attempt++) {
                        try {
                            const groq = getGroqClient()
                            const chunkFilename = `chunk_${i}.${chunkExt}`
                            const fileData = await toFile(fs.createReadStream(tmpPaths[i]), chunkFilename)
                            const transcription = await groq.audio.transcriptions.create({
                                file: fileData,
                                model: "whisper-large-v3",
                                response_format: "json",
                            })
                            if (transcription.text?.trim()) {
                                transcripts.push(transcription.text.trim())
                            }
                            console.log(`[GROQ] ✓ Chunk ${i + 1} transcribed successfully`)
                            transcribed = true
                            break
                        } catch (error: any) {
                            const isTransient = error?.cause?.code === 'ECONNRESET' ||
                                error?.message?.includes('Connection error')
                            const is413 = error?.status === 413 || error?.message?.includes('413') || error?.message?.includes('Entity Too Large')
                            
                            if (is413) {
                                // 413 might be temporary rate limiting or actual size issue
                                if (attempt < 5) {
                                    // Retry with exponential backoff (8s, 16s, 32s, 64s)
                                    const backoffMs = Math.pow(2, attempt + 2) * 1000
                                    console.warn(`[GROQ] Chunk ${i + 1} size error (413), retry ${attempt}/5 after ${backoffMs}ms...`)
                                    await new Promise(r => setTimeout(r, backoffMs))
                                    continue
                                } else {
                                    console.error(`[GROQ] Chunk ${i + 1} (${chunkSizeMB}MB) permanently failed: File too large for Groq`)
                                    throw new Error(`Chunk ${i + 1} (${chunkSizeMB}MB) exceeds Groq size limit even after retries. Try uploading a shorter video or re-encoding at lower bitrate.`)
                                }
                            }
                            
                            if (isTransient && attempt < 5) {
                                const backoffMs = attempt * 3000
                                console.warn(`[GROQ] Chunk ${i + 1} connection error (attempt ${attempt}/5), retrying in ${backoffMs}ms...`)
                                await new Promise(r => setTimeout(r, backoffMs))
                                continue
                            }
                            throw error
                        }
                    }
                    
                    if (!transcribed) {
                        throw new Error(`Failed to transcribe chunk ${i + 1} after all retries`)
                    }
                }
            } finally {
                // Clean up all temp files
                tmpPaths.forEach(cleanupTempFile)
            }

            const fullTranscript = transcripts.join(' ')
            const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
            console.log(`[GROQ] ✓ Transcription complete: ${tmpPaths.length} chunks processed in ${elapsedSec}s, ${fullTranscript.length} chars output`)
            return fullTranscript
        } catch (error: any) {
            console.error('Groq transcription from URL error:', error)
            throw new Error(error.message || 'Failed to transcribe audio from URL')
        }
    },

    /**
     * Extract structured business content from transcript using Claude via Groq
     */
    async extractBusinessContent(transcript: string): Promise<BusinessContent> {
        try {
            const prompt = `You are a business content analyst. Extract structured information from this business interview transcript.

TRANSCRIPT:
${transcript}

Extract the following information in JSON format:
{
  "tagline": "A short, catchy tagline for the business (max 10 words)",
  "about": "A compelling 2-3 sentence description of the business",
  "services": ["Service 1", "Service 2", "Service 3"],
  "contact": {
    "phone": "Phone number if mentioned",
    "email": "Email if mentioned",
    "address": "Physical address if mentioned"
  },
  "highlights": ["Key highlight 1", "Key highlight 2", "Key highlight 3"]
}

IMPORTANT:
- If information is not mentioned, use reasonable defaults or leave empty
- Make the tagline creative and memorable
- Services should be clear and specific
- Highlights should emphasize unique selling points
- Return ONLY valid JSON, no additional text`

            const groq = getGroqClient()
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                model: "llama-3.3-70b-versatile", // Using Claude-like model via Groq
                temperature: 0.7,
                max_tokens: 2000,
            })

            const content = completion.choices[0]?.message?.content || '{}'

            // Parse JSON response
            const parsed = JSON.parse(content)
            return parsed as BusinessContent
        } catch (error) {
            console.error('Groq content extraction error:', error)
            throw new Error('Failed to extract business content')
        }
    },

    /**
     * Generate website HTML from business content
     */
    async generateWebsite(businessContent: BusinessContent, businessInfo: BusinessInfo): Promise<string> {
        try {
            const prompt = `You are a professional web designer. Create a beautiful, modern, single-page website for this business.

BUSINESS INFORMATION:
Name: ${businessInfo.name}
Type: ${businessInfo.type}
Tagline: ${businessContent.tagline}
About: ${businessContent.about}
Services: ${businessContent.services.join(', ')}
Contact: ${JSON.stringify(businessContent.contact)}
Highlights: ${businessContent.highlights.join(', ')}

Create a complete HTML page with:
1. Modern, responsive design using Tailwind CSS (via CDN)
2. Professional color scheme matching the business type
3. Hero section with business name and tagline
4. About section
5. Services section with cards
6. Highlights/Features section
7. Contact section
8. Smooth animations and transitions
9. Mobile-friendly layout

Return ONLY the complete HTML code, starting with <!DOCTYPE html>`

            const groq = getGroqClient()
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.8,
                max_tokens: 4000,
            })

            const html = completion.choices[0]?.message?.content || ''
            return html
        } catch (error) {
            console.error('Groq website generation error:', error)
            throw new Error('Failed to generate website')
        }
    },
}

// Types
export interface BusinessContent {
    tagline: string
    about: string
    services: string[]
    contact: {
        phone?: string
        email?: string
        address?: string
    }
    highlights: string[]
}

export interface BusinessInfo {
    name: string
    type: string
    owner: string
    location: string
}
