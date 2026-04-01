import { logger } from "../../lib/logger.js";
import { API_ENDPOINT } from "../../utils/api.endpoint.js";
import { env } from "../../utils/env.js";
import { extractCatchMsg } from "../../utils/extractError.js";
import saveTranscriptToStorage from "../storage/storage.saveTranscriptFile.js";
import { saveTranscript } from "../db/db.transcript.js";
import type { SupportedLang } from "../../types/index.js";
import transcriptCleaner from "../../utils/transcript.cleanup.js";

export interface TranscriptChunk {
    text: string;
    start: number;
    duration: number;
}

export default async function fetchTranscriptFromAPI(yt_id: string): Promise<{
    transcript: TranscriptChunk[],
    transcript_as_string: string;
    lang: string,
    title: string,
    duration: number,
    transcript_id: string,
    yt_id: string
} | null> {
    logger.info("Fetching Transcript from API: Start...", { yt_id });

    try{
        const reqHeaders = new Headers();

        // Add a API Key as a Bearer Token
        reqHeaders.set("Authorization", `Bearer ${env.TRANSCRIPT_COM_API}`);

        // Fetch call options
        const options = {
            headers: reqHeaders
        }

        const apiEndpoint = API_ENDPOINT.TRANSCRIPT_API.replace("{YT_ID}", yt_id)
        const resp = await fetch(apiEndpoint, options);

        if(!resp.ok){
            const failedResp = await resp.json()
            throw new Error(failedResp.detail || `Something went wrong. HTTP: ${resp.status}`)
        }

        const data = await resp.json();
        // before saving to storage, we need to do a transcript cleanup - to remove the unwated buzz words and 
        const transcript: TranscriptChunk[] = transcriptCleaner(data.transcript);


        const language: SupportedLang = data.language;
        const title: string = data.title;
        
        // Calculate total duration from last chunk
        const lastChunk = transcript[transcript.length - 1];
        const total_duration = lastChunk.start + lastChunk.duration;

        const text_only_arr = transcript.map((chunk: TranscriptChunk) => {
            return chunk.text
        })

        // ── Save transcript to storage and database ─────────
        logger.info("Saving transcript to storage and database", { yt_id });

        // Step 1: Save to Supabase Storage
        const storageResult = await saveTranscriptToStorage(
            transcript,
            yt_id,
            language,
            total_duration
        );

        if (!storageResult) {
            logger.error("Failed to save transcript to storage", { yt_id });
            throw new Error("Failed to save transcript to storage");
        }

        logger.debug("Transcript saved to storage", {
            yt_id,
            path: storageResult.path,
        });

        // Step 2: Extract relative path (bucket/path format)
        // storageResult.path = "dQw4w9WgXcQ_en_1709539200000.json"
        // We want: "transcript/dQw4w9WgXcQ_en_1709539200000.json"
        const relativeUrl = `transcript/${storageResult.path}`;

        // Step 3: Save to database
        const transcriptId = await saveTranscript({
            yt_id,
            url: relativeUrl,
            lang: language as SupportedLang,
            duration: total_duration,
            transcript_source: "api",
        });

        if (!transcriptId) {
            logger.error("Failed to save transcript to database", { yt_id });
            throw new Error("Failed to save transcript to database");
        }

        logger.info("Transcript saved successfully", {
            yt_id,
            transcriptId,
            storageUrl: relativeUrl,
        });

        return {
            yt_id,
            transcript_id: transcriptId,
            transcript: transcript,
            transcript_as_string: text_only_arr.join(" "),
            lang: language,
            title: title,
            duration: total_duration
        }
    } catch(err){
        logger.error(`Failed to Fetch Transcript: End. Id: ${yt_id} Reason: ${extractCatchMsg(err)}`);
        return null;
    }
}