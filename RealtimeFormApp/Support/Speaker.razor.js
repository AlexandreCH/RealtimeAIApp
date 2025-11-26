export async function start() {
    // Initialize AudioContext directly - no mic permission needed
    const audioCtx = new AudioContext({ sampleRate: 24000 });
    
    // Ensure context is running (handles autoplay policies)
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
    
    const pendingSources = [];
    let currentPlaybackEndTime = 0;
    
    // Buffer management constants
    const MAX_QUEUE_SIZE = 50; // ~5 seconds at 10 chunks/sec
    const MAX_QUEUE_DURATION = 10; // seconds

    return {
        enqueue(data) {
            // Validate input data
            if (!data || !data.buffer) {
                console.warn('Invalid audio data received, skipping');
                return;
            }

            // Check queue size limit
            if (pendingSources.length >= MAX_QUEUE_SIZE) {
                console.warn('Audio queue full, dropping oldest buffer');
                const oldest = pendingSources.shift();
                try {
                    oldest.stop();
                } catch (e) {
                    // Already stopped or finished
                }
            }
            
            // Check duration limit
            const queueDuration = currentPlaybackEndTime - audioCtx.currentTime;
            if (queueDuration > MAX_QUEUE_DURATION) {
                console.warn('Audio queue duration exceeded, dropping frame');
                return;
            }
            
            try {
                const bufferSource = toAudioBufferSource(audioCtx, data);
                pendingSources.push(bufferSource);
                
                bufferSource.onended = () => {
                    const index = pendingSources.indexOf(bufferSource);
                    if (index > -1) {
                        pendingSources.splice(index, 1);
                    }
                };
                
                currentPlaybackEndTime = Math.max(currentPlaybackEndTime, audioCtx.currentTime + 0.1);
                bufferSource.start(currentPlaybackEndTime);
                currentPlaybackEndTime += bufferSource.buffer.duration;
            } catch (error) {
                console.error('Error enqueueing audio:', error);
            }
        },

        clear() {
            pendingSources.forEach(source => {
                try {
                    source.stop();
                } catch (e) {
                    // Source may have already finished
                }
            });
            pendingSources.length = 0;
            currentPlaybackEndTime = 0;
        }
    };
}

function toAudioBufferSource(audioCtx, data) {
    // We get int16, but need float32
    // Optimized: avoid unnecessary slice, use direct buffer access
    const int16Samples = new Int16Array(
        data.buffer, 
        data.byteOffset, 
        data.byteLength / 2
    );
    const numSamples = int16Samples.length;
    const float32Samples = new Float32Array(numSamples);
    
    // Optimized conversion with cached divisor
    const divisor = 0x7FFF;
    for (let i = 0; i < numSamples; i++) {
        float32Samples[i] = int16Samples[i] / divisor;
    }
    
    const audioBuffer = audioCtx.createBuffer(
        1, // mono
        numSamples,
        audioCtx.sampleRate
    );

    audioBuffer.copyToChannel(float32Samples, 0, 0);

    const bufferSource = audioCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(audioCtx.destination);
    return bufferSource;
}
