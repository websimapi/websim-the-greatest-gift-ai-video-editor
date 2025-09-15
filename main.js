import VideoRecorder from './video-recorder.js';
import VideoEditor from './video-editor.js';
import AIFeatures from './ai-features.js';

class VideoEditorApp {
    constructor() {
        this.recorder = new VideoRecorder();
        this.editor = new VideoEditor();
        this.ai = new AIFeatures();
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupEventListeners();
    }

    bindEvents() {
        // Recording controls
        document.getElementById('startRecording').addEventListener('click', () => {
            this.startRecording();
        });

        document.getElementById('stopRecording').addEventListener('click', () => {
            this.stopRecording();
        });

        // Preview controls
        document.getElementById('playPause').addEventListener('click', () => {
            this.editor.togglePlayback();
        });

        // Timeline controls
        document.getElementById('addTrack').addEventListener('click', () => {
            this.editor.addTrack();
        });

        document.getElementById('cutTool').addEventListener('click', () => {
            this.editor.selectTool('cut');
        });

        document.getElementById('splitTool').addEventListener('click', () => {
            this.editor.selectTool('split');
        });

        document.getElementById('deleteTool').addEventListener('click', () => {
            this.editor.selectTool('delete');
        });

        // AI features
        document.getElementById('generateTTS').addEventListener('click', () => {
            this.generateTTS();
        });

        document.getElementById('analyzeFrame').addEventListener('click', () => {
            this.analyzeFrame();
        });

        document.getElementById('enhanceFrame').addEventListener('click', () => {
            this.enhanceFrame();
        });

        // Export
        document.getElementById('exportVideo').addEventListener('click', () => {
            this.exportVideo();
        });
    }

    setupEventListeners() {
        // Listen for recording events
        this.recorder.on('recordingStarted', () => {
            document.getElementById('startRecording').disabled = true;
            document.getElementById('stopRecording').disabled = false;
            document.getElementById('recordingStatus').textContent = 'Recording...';
        });

        this.recorder.on('recordingStopped', (videoBlob) => {
            document.getElementById('startRecording').disabled = false;
            document.getElementById('stopRecording').disabled = true;
            document.getElementById('recordingStatus').textContent = 'Recording complete';
            
            // Add video to timeline
            this.editor.addVideoClip(videoBlob);
        });

        // Listen for editor events
        this.editor.on('timeUpdate', (currentTime, duration) => {
            this.updateTimeDisplay(currentTime, duration);
            this.updatePlayhead(currentTime, duration);
        });

        this.editor.on('clipAdded', () => {
            this.updateTimeline();
        });
    }

    async startRecording() {
        const includeAudio = document.getElementById('includeAudio').checked;
        try {
            await this.recorder.startRecording(includeAudio);
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Failed to start recording. Please make sure you grant screen capture permissions.');
        }
    }

    stopRecording() {
        this.recorder.stopRecording();
    }

    updateTimeDisplay(currentTime, duration) {
        const current = this.formatTime(currentTime);
        const total = this.formatTime(duration);
        document.getElementById('timeDisplay').textContent = `${current} / ${total}`;
    }

    updatePlayhead(currentTime, duration) {
        const playhead = document.getElementById('playhead');
        if (duration > 0) {
            const percentage = (currentTime / duration) * 100;
            playhead.style.left = `${percentage}%`;
            playhead.classList.add('visible');
        } else {
            playhead.classList.remove('visible');
        }
    }

    updateTimeline() {
        this.editor.renderTimeline();
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    async generateTTS() {
        const text = document.getElementById('ttsText').value;
        const voice = document.getElementById('ttsVoice').value;
        
        if (!text.trim()) {
            alert('Please enter text to convert to speech');
            return;
        }

        try {
            const audioBlob = await this.ai.generateTTS(text, voice);
            this.editor.addAudioClip(audioBlob);
        } catch (error) {
            console.error('TTS generation failed:', error);
            alert('Failed to generate speech. Please try again.');
        }
    }

    async analyzeFrame() {
        try {
            const frameData = this.editor.getCurrentFrameData();
            const analysis = await this.ai.analyzeFrame(frameData);
            document.getElementById('analysisResult').textContent = analysis;
        } catch (error) {
            console.error('Frame analysis failed:', error);
            document.getElementById('analysisResult').textContent = 'Analysis failed. Please try again.';
        }
    }

    async enhanceFrame() {
        const prompt = document.getElementById('analysisPrompt').value;
        
        if (!prompt.trim()) {
            alert('Please describe what you want to add to the frame');
            return;
        }

        try {
            const frameData = this.editor.getCurrentFrameData();
            const enhancedFrame = await this.ai.enhanceFrame(frameData, prompt);
            this.editor.addImageOverlay(enhancedFrame);
        } catch (error) {
            console.error('Frame enhancement failed:', error);
            alert('Failed to enhance frame. Please try again.');
        }
    }

    async exportVideo() {
        const quality = document.getElementById('exportQuality').value;
        const progressContainer = document.getElementById('exportProgress');
        
        progressContainer.innerHTML = `
            <div>Exporting video...</div>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
        `;

        try {
            await this.editor.exportVideo(quality, (progress) => {
                document.getElementById('progressFill').style.width = `${progress}%`;
            });
            
            progressContainer.innerHTML = 'Export complete! Video downloaded.';
        } catch (error) {
            console.error('Export failed:', error);
            progressContainer.innerHTML = 'Export failed. Please try again.';
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new VideoEditorApp();
});

