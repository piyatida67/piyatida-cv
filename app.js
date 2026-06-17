// Live Sensor & Notification Dashboard System
// Designed for Piyatida SaeJeam's CV

class SensorDashboard {
    constructor() {
        // UI Elements
        this.gaugeFill = document.getElementById('gauge-fill');
        this.gaugeValue = document.getElementById('gauge-value');
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');
        this.consoleLogs = document.getElementById('console-logs');
        this.toastContainer = document.getElementById('toast-container');
        this.btnSimulate = document.getElementById('btn-simulate');
        this.btnTrigger = document.getElementById('btn-trigger');
        this.btnClear = document.getElementById('btn-clear');
        this.audioToggle = document.getElementById('audio-toggle');
        
        // Simulation States
        this.isSimulating = false;
        this.timer = null;
        this.audioCtx = null;
        this.isAudioEnabled = false;

        // Sensor Config
        this.sensorLocations = [
            'โซนหน้ามหาวิทยาลัย (Main Gate)',
            'หน้าอาคารคณะเทคโนโลยีอุตสาหกรรม (Faculty of Industrial Tech)',
            'หอพักนักศึกษา (Student Dormitories)',
            'สำนักวิทยบริการและเทคโนโลยีสารสนเทศ (Library Zone)',
            'อาคารปฏิบัติการวิศวกรรม (Engineering Lab Building)'
        ];

        this.init();
    }

    init() {
        // Bind event listeners
        this.btnSimulate.addEventListener('click', () => this.toggleSimulation());
        this.btnTrigger.addEventListener('click', () => this.manualTrigger());
        this.btnClear.addEventListener('click', () => this.clearLogs());
        this.audioToggle.addEventListener('change', (e) => {
            this.isAudioEnabled = e.target.checked;
            if (this.isAudioEnabled && !this.audioCtx) {
                // Initialize Web Audio Context on user interaction
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
        });

        // Set initial gauge state
        this.updateGauge(0);
        this.log('SYSTEM', 'Dashboard initialized. Ready for sensor events.', 'info');
    }

    // Sound Generator using Web Audio API (no external files needed)
    playNotificationSound(type) {
        if (!this.isAudioEnabled || !this.audioCtx) return;
        
        try {
            // Resume if suspended
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            const now = this.audioCtx.currentTime;

            if (type === 'danger') {
                // Alarm sound: dual high pitch beeps
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                
                osc.start(now);
                osc.stop(now + 0.15);

                // Second beep
                setTimeout(() => {
                    if (!this.isAudioEnabled) return;
                    const osc2 = this.audioCtx.createOscillator();
                    const gain2 = this.audioCtx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(this.audioCtx.destination);
                    osc2.type = 'sawtooth';
                    osc2.frequency.setValueAtTime(880, now + 0.2);
                    osc2.frequency.exponentialRampToValueAtTime(440, now + 0.35);
                    gain2.gain.setValueAtTime(0.15, now + 0.2);
                    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                    osc2.start(now + 0.2);
                    osc2.stop(now + 0.35);
                }, 180);
            } else if (type === 'warning') {
                // Warning sound: medium double-beep
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(587.33, now); // D5
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                
                osc.start(now);
                osc.stop(now + 0.12);
            } else {
                // Info/Normal sound: short pleasant blip
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1046.50, now); // C6
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                
                osc.start(now);
                osc.stop(now + 0.1);
            }
        } catch (e) {
            console.error('Audio playback failed', e);
        }
    }

    toggleSimulation() {
        if (this.isSimulating) {
            this.stopSimulation();
        } else {
            this.startSimulation();
        }
    }

    startSimulation() {
        this.isSimulating = true;
        this.statusDot.classList.add('active');
        this.statusText.textContent = 'SIMULATOR ON';
        this.statusText.style.color = 'var(--accent-emerald)';
        this.btnSimulate.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg> หยุดจำลอง';
        this.btnSimulate.classList.remove('btn-secondary');
        this.btnSimulate.classList.add('btn-primary');
        
        this.log('SIMULATOR', 'Auto-simulation started. Sensor reading intervals: 3-6s.', 'info');
        this.scheduleNextSensorEvent();
    }

    stopSimulation() {
        this.isSimulating = false;
        this.statusDot.classList.remove('active');
        this.statusText.textContent = 'STANDBY';
        this.statusText.style.color = 'var(--text-secondary)';
        this.btnSimulate.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg> จำลองออโต้';
        this.btnSimulate.classList.remove('btn-primary');
        this.btnSimulate.classList.add('btn-secondary');
        
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        
        this.updateGauge(0);
        this.log('SIMULATOR', 'Auto-simulation stopped.', 'info');
    }

    scheduleNextSensorEvent() {
        if (!this.isSimulating) return;
        
        const randomInterval = Math.floor(Math.random() * 3000) + 3000; // 3 to 6 seconds
        this.timer = setTimeout(() => {
            this.triggerRandomEvent();
            this.scheduleNextSensorEvent();
        }, randomInterval);
    }

    triggerRandomEvent() {
        // Generate random speed: 30 km/h to 110 km/h
        const speed = Math.floor(Math.random() * 81) + 30;
        const location = this.sensorLocations[Math.floor(Math.random() * this.sensorLocations.length)];
        this.processSensorReading(speed, location);
    }

    manualTrigger() {
        // High speed violation trigger for demo purposes
        const speed = Math.floor(Math.random() * 31) + 85; // 85 to 115 km/h
        const location = this.sensorLocations[Math.floor(Math.random() * this.sensorLocations.length)];
        this.log('USER', 'Manual alert trigger initiated.', 'info');
        this.processSensorReading(speed, location);
    }

    processSensorReading(speed, location) {
        this.updateGauge(speed);
        
        let toastTitle = '';
        let toastDesc = '';
        let type = 'info';
        
        if (speed > 80) {
            type = 'danger';
            toastTitle = '⚠️ ตรวจพบการใช้ความเร็วเกินกำหนด!';
            toastDesc = `ตรวจจับความเร็วได้ ${speed} กม./ชม. ณ ${location}`;
            this.log('ALERT', `🚨 SPEED VIOLATION: ${speed} km/h detected at ${location}`, 'danger');
        } else if (speed > 60) {
            type = 'warning';
            toastTitle = '⚡ คำเตือน: ความเร็วสูงผิดปกติ';
            toastDesc = `ตรวจจับความเร็วได้ ${speed} กม./ชม. ณ ${location}`;
            this.log('WARNING', `⚠️ High speed: ${speed} km/h detected at ${location}`, 'warn');
        } else {
            type = 'info';
            toastTitle = '✅ การทำงานปกติ (Normal Traffic)';
            toastDesc = `ความเร็วรถ ${speed} กม./ชม. ณ ${location} อยู่ในเกณฑ์ควบคุม`;
            this.log('SENSOR', `Normal speed: ${speed} km/h at ${location}`, 'info');
        }

        this.showToast(toastTitle, toastDesc, type);
    }

    updateGauge(speed) {
        // Normalize speed 0-120 km/h to 0-100%
        const maxSpeed = 120;
        const percent = Math.min((speed / maxSpeed), 1);
        
        // CSS semi-circle gauge rotation mapping:
        // Angle starts at -45deg (0 km/h) and sweeps 180 degrees to 135deg (120 km/h)
        const rotationAngle = -45 + (percent * 180);
        this.gaugeFill.style.transform = `rotate(${rotationAngle}deg)`;
        
        // Update value text
        this.gaugeValue.textContent = speed;
        
        // Change color based on speed threshold
        if (speed > 80) {
            this.gaugeFill.style.borderBottomColor = 'var(--accent-rose)';
            this.gaugeFill.style.borderLeftColor = 'var(--accent-rose)';
        } else if (speed > 60) {
            this.gaugeFill.style.borderBottomColor = 'var(--accent-warning)';
            this.gaugeFill.style.borderLeftColor = 'var(--accent-warning)';
        } else {
            this.gaugeFill.style.borderBottomColor = 'var(--accent-cyan)';
            this.gaugeFill.style.borderLeftColor = 'var(--accent-cyan)';
        }
    }

    showToast(title, description, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconSvg = '';
        if (type === 'danger') {
            // Danger icon
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        } else if (type === 'warning') {
            // Warning icon
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
        } else {
            // Check icon
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        }

        toast.innerHTML = `
            <div class="toast-icon">
                ${iconSvg}
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-desc">${description}</div>
            </div>
        `;

        this.toastContainer.appendChild(toast);
        this.playNotificationSound(type);

        // Slide out and remove toast after 4s
        setTimeout(() => {
            toast.classList.add('removing');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 4000);
    }

    log(sender, message, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.className = 'console-line';
        
        let msgClass = '';
        if (type === 'warn') msgClass = 'console-msg-warn';
        else if (type === 'danger') msgClass = 'console-msg-danger';
        else if (type === 'info') msgClass = 'console-msg-info';

        line.innerHTML = `
            <span class="console-time">[${time}]</span>
            <span class="${msgClass}">[${sender}] ${message}</span>
        `;

        this.consoleLogs.appendChild(line);
        
        // Auto scroll console
        this.consoleLogs.scrollTop = this.consoleLogs.scrollHeight;
        
        // Limit console rows
        while (this.consoleLogs.children.length > 50) {
            this.consoleLogs.removeChild(this.consoleLogs.firstChild);
        }
    }

    clearLogs() {
        this.consoleLogs.innerHTML = '';
        this.log('SYSTEM', 'Console logs cleared.', 'info');
        this.showToast('🧹 เคลียร์บันทึกข้อมูลสำเร็จ', 'ประวัติการทำงานของเซ็นเซอร์ถูกลบแล้ว', 'info');
    }
}

// Instantiate dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.sensorDashboard = new SensorDashboard();
});
