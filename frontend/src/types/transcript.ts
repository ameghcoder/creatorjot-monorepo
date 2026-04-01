// Transcript domain types — mirrored from packages/shared/src/types.ts
// Keep in sync with the shared package when RichContext shape changes.

export interface ConcreteDetails {
    quotes: string[]
    stats: string[]
    examples: string[]
}

export interface PostAngle {
    sequence: number
    timestamp_start: number
    score: number
    tone: string
    category: string
    hook: string
    core_insight: string
    concrete_details: ConcreteDetails
}

export interface RichContext {
    video_summary: string
    post_angles: PostAngle[]
}
