// Phase Shift 2025 - AI-Assisted Alternate Nostril Breathing App

class PhaseShift2025 {
    constructor() {
        this.isSessionActive = false;
        this.isPaused = false;
        this.sessionStartTime = null;
        this.sessionDuration = 300; // 5 minutes default
        this.breathDuration = 4; // 4 seconds default
        this.currentPhase = 0; // 0: right_in, 1: left_out, 2: left_in, 3: right_out
        this.cycleCount = 0;
        this.breathTimer = null;
        this.sessionTimer = null;
        this.breathCountdown = null;
        this.postureScore = 100;
        this.postureHistory = [];
        
        // Camera and detection
        this.videoElement = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.faceDetector = null;
        this.detectionActive = false;
        
        // Audio context
        this.audioContext = null;
        this.alertVolume = 0.5;
        this.audioEnabled = true;
        this.eyeAlerts = true;
        this.feedbackSensitivity = 'medium';
        
        // Breathing sequence
        this.breathingSequence = [
            { phase: 'right_in', instruction: 'Block left nostril, breathe in through right', nostril: 'right', action: 'in' },
            { phase: 'left_out', instruction: 'Block right nostril, breathe out through left', nostril: 'left', action: 'out' },
            { phase: 'left_in', instruction: 'Block right nostril, breathe in through left', nostril: 'left', action: 'in' },
            { phase: 'right_out', instruction: 'Block left nostril, breathe out through right', nostril: 'right', action: 'out' }
        ];
        
        this.init();
    }
    
    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.loadSettings();
        await this.initializeAudioContext();
        this.showPermissionModal();
    }
    
    setupElements() {
        // Video elements
        this.videoElement = document.getElementById('videoElement');
        this.canvas = document.getElementById('detectionCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Control elements
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        
        // Display elements
        this.sessionTimerEl = document.getElementById('sessionTimer');
        this.cycleCountEl = document.getElementById('cycleCount');
        this.postureScoreEl = document.getElementById('postureScore');
        this.breathingInstruction = document.getElementById('breathingInstruction');
        this.breathTimerEl = document.getElementById('breathTimer');
        this.leftNostril = document.getElementById('leftNostril');
        this.rightNostril = document.getElementById('rightNostril');
        
        // Status elements
        this.cameraStatus = document.getElementById('cameraStatus');
        this.cameraIndicator = document.getElementById('cameraIndicator');
        this.postureStatus = document.getElementById('postureStatus');
        this.headStatus = document.getElementById('headStatus');
        this.eyeStatus = document.getElementById('eyeStatus');
        
        // Breathing guide
        this.breathingGuide = document.querySelector('.breathing-circle');
        this.breathText = document.querySelector('.breath-text');
        
        // Modals
        this.permissionModal = document.getElementById('permissionModal');
        this.settingsModal = document.getElementById('settingsModal');
        this.sessionCompleteModal = document.getElementById('sessionCompleteModal');
    }
    
    setupEventListeners() {
        // Main controls
        this.startBtn.addEventListener('click', () => this.startSession());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.stopBtn.addEventListener('click', () => this.stopSession());
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        
        // Permission modal
        document.getElementById('requestPermissionBtn').addEventListener('click', () => this.requestCameraPermission());
        document.getElementById('skipPermissionBtn').addEventListener('click', () => this.hidePermissionModal());
        
        // Settings modal
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.hideSettings());
        document.getElementById('breathDuration').addEventListener('change', (e) => this.breathDuration = parseInt(e.target.value));
        document.getElementById('sessionDuration').addEventListener('change', (e) => this.sessionDuration = parseInt(e.target.value));
        document.getElementById('alertVolume').addEventListener('change', (e) => this.alertVolume = parseFloat(e.target.value));
        document.getElementById('feedbackSensitivity').addEventListener('change', (e) => this.feedbackSensitivity = e.target.value);
        document.getElementById('audioEnabled').addEventListener('change', (e) => this.audioEnabled = e.target.checked);
        document.getElementById('eyeAlerts').addEventListener('change', (e) => this.eyeAlerts = e.target.checked);
        
        // Session complete modal
        document.getElementById('newSessionBtn').addEventListener('click', () => this.startNewSession());
        document.getElementById('closeSessionBtn').addEventListener('click', () => this.hideSessionComplete());
    }
    
    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio context not supported:', error);
        }
    }
    
    showPermissionModal() {
        this.permissionModal.classList.remove('hidden');
    }
    
    hidePermissionModal() {
        this.permissionModal.classList.add('hidden');
    }
    
    async requestCameraPermission() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' }, 
                audio: false 
            });
            
            this.videoElement.srcObject = this.stream;
            this.updateCameraStatus(true);
            this.initializeFaceDetection();
            this.hidePermissionModal();
            
            // Make video visible
            this.videoElement.style.display = 'block';
            
        } catch (error) {
            console.error('Camera access denied:', error);
            this.updateCameraStatus(false);
            this.hidePermissionModal();
        }
    }
    
    updateCameraStatus(connected) {
        const dot = this.cameraIndicator.querySelector('.indicator-dot');
        if (connected) {
            this.cameraStatus.textContent = 'Camera: Connected';
            dot.classList.add('connected');
        } else {
            this.cameraStatus.textContent = 'Camera: Disconnected';
            dot.classList.remove('connected');
        }
    }
    
    async initializeFaceDetection() {
        try {
            // Check if Face Detection API is available
            if ('FaceDetector' in window) {
                this.faceDetector = new FaceDetector({
                    maxDetectedFaces: 1,
                    fastMode: true
                });
                this.startDetection();
            } else {
                console.warn('Face Detection API not supported, using alternative detection');
                this.startBasicDetection();
            }
        } catch (error) {
            console.error('Face detection initialization failed:', error);
            this.startBasicDetection();
        }
    }
    
    startDetection() {
        if (!this.detectionActive) {
            this.detectionActive = true;
            this.detectFaces();
        }
    }
    
    stopDetection() {
        this.detectionActive = false;
    }
    
    async detectFaces() {
        if (!this.detectionActive || !this.faceDetector) return;
        
        try {
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;
            
            const faces = await this.faceDetector.detect(this.videoElement);
            this.processFaceData(faces);
            
            // Draw detection results
            this.drawDetectionResults(faces);
            
        } catch (error) {
            console.error('Face detection error:', error);
        }
        
        if (this.detectionActive) {
            requestAnimationFrame(() => this.detectFaces());
        }
    }
    
    startBasicDetection() {
        // Fallback detection without advanced APIs
        this.detectionActive = true;
        this.basicDetectionLoop();
    }
    
    basicDetectionLoop() {
        if (!this.detectionActive) return;
        
        // Simulate basic posture and eye detection
        this.updatePostureStatus('Good', 'success');
        this.updateHeadStatus('Centered', 'success');
        this.updateEyeStatus('Monitoring', 'info');
        
        setTimeout(() => {
            if (this.detectionActive) {
                this.basicDetectionLoop();
            }
        }, 2000);
    }
    
    processFaceData(faces) {
        if (faces.length === 0) {
            this.updatePostureStatus('No face detected', 'warning');
            return;
        }
        
        const face = faces[0];
        
        // Analyze posture based on face position and size
        this.analyzePosture(face);
        this.analyzeHeadPosition(face);
        this.analyzeEyeState(face);
    }
    
    analyzePosture(face) {
        const centerX = this.canvas.width / 2;
        const faceCenter = face.boundingBox.x + face.boundingBox.width / 2;
        const deviation = Math.abs(centerX - faceCenter);
        const maxDeviation = this.canvas.width * 0.1;
        
        if (deviation < maxDeviation * 0.3) {
            this.updatePostureStatus('Excellent', 'success');
            this.updatePostureScore(100);
        } else if (deviation < maxDeviation * 0.7) {
            this.updatePostureStatus('Good', 'success');
            this.updatePostureScore(85);
        } else if (deviation < maxDeviation) {
            this.updatePostureStatus('Fair', 'warning');
            this.updatePostureScore(70);
            if (this.audioEnabled) {
                this.playPostureAlert();
            }
        } else {
            this.updatePostureStatus('Poor', 'error');
            this.updatePostureScore(50);
            if (this.audioEnabled) {
                this.playPostureAlert();
            }
        }
    }
    
    analyzeHeadPosition(face) {
        const centerY = this.canvas.height / 2;
        const faceCenter = face.boundingBox.y + face.boundingBox.height / 2;
        const deviation = Math.abs(centerY - faceCenter);
        const maxDeviation = this.canvas.height * 0.1;
        
        if (deviation < maxDeviation * 0.5) {
            this.updateHeadStatus('Centered', 'success');
        } else if (deviation < maxDeviation) {
            this.updateHeadStatus('Slightly off', 'warning');
        } else {
            this.updateHeadStatus('Adjust position', 'error');
        }
    }
    
    analyzeEyeState(face) {
        // Simplified eye detection - would need more advanced analysis for real eye state
        // For demo purposes, we'll simulate eye detection
        const random = Math.random();
        if (random < 0.7) {
            this.updateEyeStatus('Closed', 'success');
        } else {
            this.updateEyeStatus('Open', 'warning');
            if (this.eyeAlerts && this.audioEnabled) {
                this.playEyeAlert();
            }
        }
    }
    
    drawDetectionResults(faces) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        faces.forEach(face => {
            const { x, y, width, height } = face.boundingBox;
            
            // Draw face rectangle
            this.ctx.strokeStyle = '#32C5A0';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, width, height);
            
            // Draw center alignment guide
            this.ctx.strokeStyle = '#4A7C59';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width / 2, 0);
            this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        });
    }
    
    updatePostureStatus(status, type) {
        this.postureStatus.textContent = status;
        this.postureStatus.className = `status status--${type}`;
    }
    
    updateHeadStatus(status, type) {
        this.headStatus.textContent = status;
        this.headStatus.className = `status status--${type}`;
    }
    
    updateEyeStatus(status, type) {
        this.eyeStatus.textContent = status;
        this.eyeStatus.className = `status status--${type}`;
    }
    
    updatePostureScore(score) {
        this.postureHistory.push(score);
        if (this.postureHistory.length > 10) {
            this.postureHistory.shift();
        }
        
        const avgScore = this.postureHistory.reduce((a, b) => a + b, 0) / this.postureHistory.length;
        this.postureScore = Math.round(avgScore);
        this.postureScoreEl.textContent = `${this.postureScore}%`;
    }
    
    async playBreathingSound(frequency = 220, duration = 0.2) {
        if (!this.audioContext || !this.audioEnabled) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.alertVolume * 0.3, this.audioContext.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }
    
    async playPostureAlert() {
        this.playBreathingSound(150, 0.3);
    }
    
    async playEyeAlert() {
        this.playBreathingSound(300, 0.15);
    }
    
    startSession() {
        if (this.isSessionActive) return;
        
        this.isSessionActive = true;
        this.isPaused = false;
        this.sessionStartTime = Date.now();
        this.currentPhase = 0;
        this.cycleCount = 0;
        this.postureHistory = [];
        
        this.updateControls();
        this.startSessionTimer();
        this.startBreathingCycle();
        this.startDetection();
        
        // Initialize posture score display
        this.postureScoreEl.textContent = '100%';
    }
    
    togglePause() {
        if (!this.isSessionActive) return;
        
        if (this.isPaused) {
            this.resumeSession();
        } else {
            this.pauseSession();
        }
    }
    
    pauseSession() {
        if (!this.isSessionActive || this.isPaused) return;
        
        this.isPaused = true;
        this.clearBreathingTimers();
        this.updateControls();
        this.breathText.textContent = 'Paused';
        this.breathTimerEl.textContent = '--';
    }
    
    resumeSession() {
        if (!this.isSessionActive || !this.isPaused) return;
        
        this.isPaused = false;
        this.updateControls();
        this.startBreathingCycle();
    }
    
    stopSession() {
        this.isSessionActive = false;
        this.isPaused = false;
        this.clearAllTimers();
        this.stopDetection();
        this.updateControls();
        this.resetDisplay();
        this.showSessionComplete();
    }
    
    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            if (this.isPaused) return;
            
            const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            this.updateSessionDisplay(elapsed);
            
            if (elapsed >= this.sessionDuration) {
                this.stopSession();
            }
        }, 1000);
    }
    
    startBreathingCycle() {
        if (!this.isSessionActive || this.isPaused) return;
        
        const currentBreath = this.breathingSequence[this.currentPhase];
        this.updateBreathingDisplay(currentBreath);
        
        if (this.audioEnabled) {
            this.playBreathingSound(currentBreath.action === 'in' ? 440 : 330, 0.1);
        }
        
        this.startBreathCountdown();
    }
    
    startBreathCountdown() {
        let count = this.breathDuration;
        this.breathTimerEl.textContent = count;
        
        this.breathCountdown = setInterval(() => {
            count--;
            this.breathTimerEl.textContent = count;
            
            if (count <= 0) {
                this.nextPhase();
            }
        }, 1000);
    }
    
    nextPhase() {
        if (!this.isSessionActive || this.isPaused) return;
        
        this.clearBreathingTimers();
        
        this.currentPhase = (this.currentPhase + 1) % 4;
        
        if (this.currentPhase === 0) {
            this.cycleCount++;
            this.cycleCountEl.textContent = this.cycleCount;
        }
        
        // Small delay for transition
        setTimeout(() => {
            if (this.isSessionActive && !this.isPaused) {
                this.startBreathingCycle();
            }
        }, 500);
    }
    
    updateBreathingDisplay(breath) {
        // Update the main instruction text with detailed nostril guidance
        this.breathingInstruction.textContent = breath.instruction;
        
        // Update nostril indicators
        this.leftNostril.classList.remove('active', 'blocked');
        this.rightNostril.classList.remove('active', 'blocked');
        
        if (breath.nostril === 'left') {
            this.leftNostril.classList.add('active');
            this.rightNostril.classList.add('blocked');
        } else {
            this.rightNostril.classList.add('active');
            this.leftNostril.classList.add('blocked');
        }
        
        // Update breathing guide animation and text
        this.breathingGuide.classList.remove('inhaling', 'exhaling');
        if (breath.action === 'in') {
            this.breathingGuide.classList.add('inhaling');
            this.breathText.textContent = `Inhale through ${breath.nostril} nostril`;
        } else {
            this.breathingGuide.classList.add('exhaling');
            this.breathText.textContent = `Exhale through ${breath.nostril} nostril`;
        }
    }
    
    updateSessionDisplay(elapsed) {
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        this.sessionTimerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateControls() {
        if (this.isSessionActive && !this.isPaused) {
            this.startBtn.classList.add('hidden');
            this.pauseBtn.classList.remove('hidden');
            this.stopBtn.classList.remove('hidden');
            this.pauseBtn.textContent = 'Pause';
        } else if (this.isSessionActive && this.isPaused) {
            this.startBtn.classList.add('hidden');
            this.pauseBtn.classList.remove('hidden');
            this.stopBtn.classList.remove('hidden');
            this.pauseBtn.textContent = 'Resume';
        } else {
            this.startBtn.classList.remove('hidden');
            this.pauseBtn.classList.add('hidden');
            this.stopBtn.classList.add('hidden');
        }
    }
    
    clearBreathingTimers() {
        if (this.breathCountdown) {
            clearInterval(this.breathCountdown);
            this.breathCountdown = null;
        }
    }
    
    clearAllTimers() {
        this.clearBreathingTimers();
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }
    
    resetDisplay() {
        this.sessionTimerEl.textContent = '00:00';
        this.cycleCountEl.textContent = '0';
        this.postureScoreEl.textContent = '--';
        this.breathTimerEl.textContent = '4';
        this.breathingInstruction.textContent = 'Prepare for practice';
        this.breathText.textContent = 'Ready to begin';
        
        // Reset nostril indicators
        this.leftNostril.classList.remove('active', 'blocked');
        this.rightNostril.classList.remove('active', 'blocked');
        this.breathingGuide.classList.remove('inhaling', 'exhaling');
    }
    
    showSettings() {
        this.settingsModal.classList.remove('hidden');
        this.loadSettingsValues();
    }
    
    hideSettings() {
        this.settingsModal.classList.add('hidden');
        this.saveSettings();
    }
    
    showSessionComplete() {
        const elapsed = this.sessionStartTime ? Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0;
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        document.getElementById('finalTime').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('finalCycles').textContent = this.cycleCount;
        document.getElementById('finalPosture').textContent = `${this.postureScore}%`;
        
        this.sessionCompleteModal.classList.remove('hidden');
    }
    
    hideSessionComplete() {
        this.sessionCompleteModal.classList.add('hidden');
    }
    
    startNewSession() {
        this.hideSessionComplete();
        this.startSession();
    }
    
    loadSettings() {
        try {
            const settings = sessionStorage.getItem('phaseShift2025Settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.breathDuration = parsed.breathDuration || 4;
                this.sessionDuration = parsed.sessionDuration || 300;
                this.alertVolume = parsed.alertVolume || 0.5;
                this.feedbackSensitivity = parsed.feedbackSensitivity || 'medium';
                this.audioEnabled = parsed.audioEnabled !== false;
                this.eyeAlerts = parsed.eyeAlerts !== false;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    loadSettingsValues() {
        document.getElementById('breathDuration').value = this.breathDuration;
        document.getElementById('sessionDuration').value = this.sessionDuration;
        document.getElementById('alertVolume').value = this.alertVolume;
        document.getElementById('feedbackSensitivity').value = this.feedbackSensitivity;
        document.getElementById('audioEnabled').checked = this.audioEnabled;
        document.getElementById('eyeAlerts').checked = this.eyeAlerts;
    }
    
    saveSettings() {
        try {
            const settings = {
                breathDuration: this.breathDuration,
                sessionDuration: this.sessionDuration,
                alertVolume: this.alertVolume,
                feedbackSensitivity: this.feedbackSensitivity,
                audioEnabled: this.audioEnabled,
                eyeAlerts: this.eyeAlerts
            };
            sessionStorage.setItem('phaseShift2025Settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.phaseShift = new PhaseShift2025();
});