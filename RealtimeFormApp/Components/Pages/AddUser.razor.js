export async function start(componentInstance) {
    // Validate component instance
    if (!componentInstance || typeof componentInstance.invokeMethodAsync !== 'function') {
        console.error('Invalid component instance provided to microphone module');
        return null;
    }

    try {
        // Fixed: Match sample rate with AudioContext (24kHz instead of 16kHz)
        const micStream = await navigator.mediaDevices.getUserMedia({ 
            video: false, 
            audio: { sampleRate: 24000 } 
        });
        processMicrophoneData(micStream, componentInstance);
        return micStream;
    } catch (ex) {
        // Improved error handling with user-friendly messages
        let userMessage = 'Unable to access microphone. ';
        
        if (ex.name === 'NotAllowedError') {
            userMessage += 'Please grant microphone permission in your browser.';
        } else if (ex.name === 'NotFoundError') {
            userMessage += 'No microphone found. Please connect a microphone.';
        } else if (ex.name === 'NotReadableError') {
            userMessage += 'Microphone is in use by another application.';
        } else if (ex.name === 'OverconstrainedError') {
            userMessage += 'Your microphone does not support the required settings.';
        } else {
            userMessage += 'Please check your device settings and try again.';
        }
        
        // Log technical details for debugging
        console.error('Microphone error:', ex);
        
        // Send user-friendly message to Blazor component
        try {
            await componentInstance.invokeMethodAsync('OnMicrophoneError', userMessage);
        } catch (blazorEx) {
            // Fallback if Blazor method doesn't exist yet
            console.error('Could not notify component of error:', blazorEx);
            alert(userMessage);
        }
        
        return null;
    }
}

export function setMute(micStream, mute) {
    if (micStream) {
        micStream.isMuted = mute;
    }
}

async function processMicrophoneData(micStream, componentInstance) {
    const audioCtx = new AudioContext({ sampleRate: 24000 });
    const micStreamSource = audioCtx.createMediaStreamSource(micStream);

    // Create worklet blob URL
    const workletBlobUrl = URL.createObjectURL(new Blob([`
        registerProcessor('micProcessor', class extends AudioWorkletProcessor {
            constructor() { 
                super(); 
            }
            process(input, output, parameters) {
                this.port.postMessage(input[0]);
                return true;
            }
        });
        `],
        { type: 'application/javascript' }));
    
    try {
        await audioCtx.audioWorklet.addModule(workletBlobUrl);
    } finally {
        // Fixed: Clean up blob URL after module is loaded to prevent memory leak
        URL.revokeObjectURL(workletBlobUrl);
    }
    
    const workletNode = new AudioWorkletNode(audioCtx, 'micProcessor', {});
    micStreamSource.connect(workletNode);
    
    workletNode.port.onmessage = async (e) => {
        if (micStream.isMuted) {
            return;
        }

        // Validate audio data
        if (!e.data || !e.data[0]) {
            return;
        }

        // We get float32, but need int16
        const float32Samples = e.data[0];
        const numSamples = float32Samples.length;
        const int16Samples = new Int16Array(numSamples);
        
        // Optimized conversion with bounds checking
        const multiplier = 0x7FFF;
        for (let i = 0; i < numSamples; i++) {
            // Clamp values to prevent overflow
            const sample = Math.max(-1, Math.min(1, float32Samples[i]));
            int16Samples[i] = sample * multiplier;
        }
        
        try {
            await componentInstance.invokeMethodAsync('ReceiveAudioDataAsync', new Uint8Array(int16Samples.buffer));
        } catch (error) {
            console.error('Error sending audio data to component:', error);
        }
    };

    try {
        await componentInstance.invokeMethodAsync('OnMicConnectedAsync');
    } catch (error) {
        console.error('Error notifying component of mic connection:', error);
    }
}
