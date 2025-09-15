class VideoRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.eventListeners = {};
    }

    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    async startRecording(includeAudio = true) {
        try {
            // Request screen capture
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: includeAudio
            });

            // If we want system audio as well
            let audioStream = null;
            if (includeAudio) {
                try {
                    audioStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false
                        }
                    });
                } catch (error) {
                    console.warn('Could not capture microphone audio:', error);
                }
            }

            // Combine streams
            const tracks = [...displayStream.getTracks()];
            if (audioStream) {
                tracks.push(...audioStream.getAudioTracks());
            }

            this.stream = new MediaStream(tracks);

            // Set up MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9,opus'
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    console.log('Data chunk received:', event.data.size, 'bytes');
                }
            };

            this.mediaRecorder.onstop = () => {
                console.log('MediaRecorder stopped, creating blob from', this.recordedChunks.length, 'chunks');
                const blob = new Blob(this.recordedChunks, {
                    type: 'video/webm'
                });
                this.emit('recordingStopped', blob);
                this.cleanup();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                this.emit('recordingError', event.error);
                this.cleanup();
            };

            // Handle stream ending (user stops sharing)
            displayStream.getVideoTracks()[0].onended = () => {
                this.stopRecording();
            };

            this.mediaRecorder.start(1000); // Collect data every second
            this.emit('recordingStarted');

        } catch (error) {
            console.error('Error starting recording:', error);
            throw error;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            console.log('Stopping recording, state:', this.mediaRecorder.state);
            this.mediaRecorder.stop();
            
            // Add timeout fallback in case stop event doesn't fire
            setTimeout(() => {
                if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                    console.warn('MediaRecorder stop timeout, forcing cleanup');
                    this.emit('recordingStopped', new Blob(this.recordedChunks, { type: 'video/webm' }));
                    this.cleanup();
                }
            }, 5000);
        } else {
            console.warn('MediaRecorder not active, cannot stop');
            this.emit('recordingStopped', new Blob([], { type: 'video/webm' }));
        }
    }

    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
    }
}

export default VideoRecorder;