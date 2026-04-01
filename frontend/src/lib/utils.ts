import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGeneratedContent(content: string): string {
    if (!content) return ''
    try {
        const parsed = JSON.parse(content)
        // Wrapped string: "\"hello world\""
        if (typeof parsed === 'string') {
            return parsed.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
        }
        // JSON object — use the value of the first key
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const firstKey = Object.keys(parsed)[0]
            if (firstKey !== undefined) {
                const val = parsed[firstKey]
                const str = typeof val === 'string' ? val : JSON.stringify(val)
                return str.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
            }
        }
    } catch {
        // Not JSON — fall through
    }

    return content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}
