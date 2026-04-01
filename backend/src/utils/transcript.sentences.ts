interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

const transcriptToSegments = (transcript: TranscriptSegment[]): TranscriptSegment[] => {
  if (!transcript || transcript.length === 0) return [];

  const sentences: TranscriptSegment[] = [];
  let currentSentence = '';
  let sentenceStart = transcript[0].start;
  let sentenceDuration = 0;

  for (const segment of transcript) {
    currentSentence += (currentSentence ? ' ' : '') + segment.text;
    sentenceDuration += segment.duration;

    // Check if sentence ends with period, question mark, or exclamation
    if (/[.!?]$/.test(segment.text.trim())) {
      sentences.push({
        text: currentSentence.trim(),
        start: sentenceStart,
        duration: sentenceDuration
      });
      
      // Reset for next sentence
      currentSentence = '';
      sentenceDuration = 0;
      const nextIndex = transcript.indexOf(segment) + 1;
      if (nextIndex < transcript.length) {
        sentenceStart = transcript[nextIndex].start;
      }
    }
  }

  // Handle any remaining text that didn't end with punctuation
  if (currentSentence.trim()) {
    sentences.push({
      text: currentSentence.trim(),
      start: sentenceStart,
      duration: sentenceDuration
    });
  }

  return sentences;
};

const transcriptToCheckpoints = (
  transcript: TranscriptSegment[], 
  checkpointCount: number = 15
): TranscriptSegment[] => {
  if (!transcript || transcript.length === 0) return [];
  if (checkpointCount <= 0) checkpointCount = 1;

  const totalSegments = transcript.length;
  const segmentsPerCheckpoint = Math.ceil(totalSegments / checkpointCount);
  const checkpoints: TranscriptSegment[] = [];

  for (let i = 0; i < totalSegments; i += segmentsPerCheckpoint) {
    const chunk = transcript.slice(i, i + segmentsPerCheckpoint);
    
    const mergedText = chunk.map(seg => seg.text).join(' ');
    const checkpointStart = chunk[0].start;
    const checkpointDuration = chunk.reduce((sum, seg) => sum + seg.duration, 0);

    checkpoints.push({
      text: mergedText,
      start: checkpointStart,
      duration: checkpointDuration
    });
  }

  return checkpoints;
};

export {
  transcriptToCheckpoints,
  transcriptToSegments,
  type TranscriptSegment
};