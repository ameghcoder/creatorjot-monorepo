import { logger } from "../lib/logger.js";


const YOUTUBE_URL_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractVideoId(url: string): string | null {
  // Try regex match first (handles full URLs)
  const match = url.match(YOUTUBE_URL_REGEX);
  if (match && match[1]) {
    return match[1];
  }

  const rawIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (rawIdRegex.test(url)) {
    return url;
  }

  logger.warn("Failed to extract YouTube video ID", { url });
  return null;
}

export async function thumbnailCheckerById(videoId: string): Promise<boolean> {
  try {

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    
    const response = await fetch(thumbnailUrl, { method: "HEAD" });

    const exists = response.ok;

    logger.debug("Thumbnail check result", { videoId, exists });
    return exists;
  } catch (error) {
    logger.error("Thumbnail check failed", { videoId, error });
    return false;
  }
}
