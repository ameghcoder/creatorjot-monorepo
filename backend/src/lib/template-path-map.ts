import { fileURLToPath } from "url"
import { join, dirname } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Paths are resolved relative to this file (backend/src/lib/)
// so they work regardless of the process working directory.
export const TEMPLATES_MAP = {
    EMAIL_GEN_COMPLETE: join(__dirname, "../templates/generation-done.html"),
}