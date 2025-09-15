class VideoEditor {
    constructor() {
        this.tracks = [];
        this.currentTime = 0;
        this.duration = 0;
        this.isPlaying = false;
        this.selectedTool = null;
        this.selectedClip = null;
        this.eventListeners = {};
        
        this.video = document.getElementById('videoPreview');
        this.setupVideoEvents();
    }

    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, ...args) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(...args));
        }
    }

    setupVideoEvents() {
        this.video.addEventListener('timeupdate', () => {
            this.currentTime = this.video.currentTime;
            this.emit('timeUpdate', this.currentTime, this.duration);
        });

        this.video.addEventListener('loadedmetadata', () => {
            this.duration = this.video.duration;
            this.emit('timeUpdate', this.currentTime, this.duration);
        });
    }

    addVideoClip(videoBlob) {
        const url = URL.createObjectURL(videoBlob);
        
        // Create video element to get metadata
        const tempVideo = document.createElement('video');
        tempVideo.src = url;
        
        tempVideo.addEventListener('loadedmetadata', () => {
            const clip = {
                id: Date.now(),
                type: 'video',
                url: url,
                blob: videoBlob,
                duration: tempVideo.duration,
                startTime: 0,
                endTime: tempVideo.duration,
                track: 0
            };

            // Add to first track or create new track
            if (this.tracks.length === 0) {
                this.addTrack();
            }
            
            this.tracks[0].clips.push(clip);
            
            // Set as preview video
            this.video.src = url;
            this.duration = tempVideo.duration;
            
            this.emit('clipAdded', clip);
        });
    }

    addAudioClip(audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
            const clip = {
                id: Date.now(),
                type: 'audio',
                url: url,
                blob: audioBlob,
                duration: audio.duration,
                startTime: this.currentTime,
                endTime: this.currentTime + audio.duration,
                track: this.tracks.length > 1 ? 1 : this.addTrack() - 1
            };

            this.tracks[clip.track].clips.push(clip);
            this.emit('clipAdded', clip);
        });
    }

    addImageOverlay(imageBlob) {
        const url = URL.createObjectURL(imageBlob);
        
        const clip = {
            id: Date.now(),
            type: 'image',
            url: url,
            blob: imageBlob,
            duration: 5, // Default 5 seconds
            startTime: this.currentTime,
            endTime: this.currentTime + 5,
            track: this.tracks.length > 2 ? 2 : this.addTrack() - 1
        };

        this.tracks[clip.track].clips.push(clip);
        this.emit('clipAdded', clip);
    }

    addTrack() {
        const track = {
            id: this.tracks.length,
            type: this.tracks.length === 0 ? 'video' : this.tracks.length === 1 ? 'audio' : 'overlay',
            clips: []
        };
        
        this.tracks.push(track);
        return this.tracks.length;
    }

    selectTool(tool) {
        this.selectedTool = tool;
        
        // Update UI
        document.querySelectorAll('.btn.tool').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(tool + 'Tool').classList.add('active');
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.video.pause();
            this.isPlaying = false;
        } else {
            this.video.play();
            this.isPlaying = true;
        }
    }

    getCurrentFrameData() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        
        ctx.drawImage(this.video, 0, 0);
        
        return canvas.toDataURL('image/jpeg', 0.8);
    }

    renderTimeline() {
        const container = document.getElementById('timelineTracks');
        container.innerHTML = '';

        this.tracks.forEach((track, index) => {
            const trackElement = document.createElement('div');
            trackElement.className = 'track';
            trackElement.innerHTML = `
                <div class="track-header">Track ${index + 1} (${track.type})</div>
            `;

            track.clips.forEach(clip => {
                const clipElement = document.createElement('div');
                clipElement.className = 'video-clip';
                clipElement.textContent = `${clip.type} (${this.formatDuration(clip.duration)})`;
                clipElement.style.left = `${(clip.startTime / this.duration) * 100}%`;
                clipElement.style.width = `${((clip.endTime - clip.startTime) / this.duration) * 100}%`;
                
                clipElement.addEventListener('click', () => {
                    this.selectClip(clip);
                });

                trackElement.appendChild(clipElement);
            });

            container.appendChild(trackElement);
        });

        this.renderTimeRuler();
    }

    renderTimeRuler() {
        const ruler = document.getElementById('timeRuler');
        ruler.innerHTML = '';

        if (this.duration > 0) {
            const intervals = Math.ceil(this.duration / 10);
            for (let i = 0; i <= intervals; i++) {
                const time = i * 10;
                if (time <= this.duration) {
                    const marker = document.createElement('div');
                    marker.style.position = 'absolute';
                    marker.style.left = `${(time / this.duration) * 100}%`;
                    marker.style.fontSize = '0.7rem';
                    marker.style.color = '#888';
                    marker.textContent = this.formatDuration(time);
                    ruler.appendChild(marker);
                }
            }
        }
    }

    selectClip(clip) {
        // Remove previous selection
        document.querySelectorAll('.video-clip.selected').forEach(el => {
            el.classList.remove('selected');
        });

        this.selectedClip = clip;
        
        // Add selection to UI
        event.target.classList.add('selected');
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    async exportVideo(quality, progressCallback) {
        // This is a simplified export - in a real implementation,
        // you'd use FFmpeg.js or similar for actual video processing
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set resolution based on quality
        const resolutions = {
            '720p': { width: 1280, height: 720 },
            '1080p': { width: 1920, height: 1080 },
            '4K': { width: 3840, height: 2160 }
        };
        
        const { width, height } = resolutions[quality];
        canvas.width = width;
        canvas.height = height;

        // Simulate export progress
        for (let i = 0; i <= 100; i += 10) {
            progressCallback(i);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Create download link
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video_${quality}_${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'video/webm');
    }
}

export default VideoEditor;

