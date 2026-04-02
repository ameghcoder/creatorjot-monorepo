import { readFileSync } from "fs"

export function load(filePath: string): string {
    return readFileSync(filePath, 'utf-8')
}

export function fill(html: string, vars: Record<string, string>): string {
    return html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const val = vars[key] ?? ''
        return val
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    })
}