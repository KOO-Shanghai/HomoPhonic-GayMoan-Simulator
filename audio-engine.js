class AudioEngine {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.buffer = null;
        this.spriteData = null;
        this.isLoaded = false;

        // 初始化音量控制节点 (分轨道)
        this.gains = {
            plap: this.context.createGain(),
            roleA: this.context.createGain(),
            roleB: this.context.createGain()
        };

        // 连接到主输出
        Object.values(this.gains).forEach(gain => gain.connect(this.context.destination));
    }

    async loadSprite(jsonPath, audioPath) {
        try {
            console.log('Loading sprite metadata...');
            const response = await fetch(jsonPath);
            this.spriteData = await response.json();

            console.log('Loading sprite audio data...');
            const audioResponse = await fetch(audioPath);
            const arrayBuffer = await audioResponse.arrayBuffer();

            console.log('Decoding audio data...');
            this.buffer = await this.context.decodeAudioData(arrayBuffer);
            
            this.isLoaded = true;
            console.log('Audio Engine ready.');
            return true;
        } catch (error) {
            console.error('Failed to load audio sprite:', error);
            return false;
        }
    }

    playSound(name, track = 'plap') {
        if (!this.isLoaded || !this.spriteData.spritemap[name]) {
            console.warn(`Sound "${name}" not found or engine not loaded.`);
            return;
        }

        const data = this.spriteData.spritemap[name];
        const source = this.context.createBufferSource();
        source.buffer = this.buffer;

        // 根据轨道连接到对应的 GainNode
        const targetGain = this.gains[track] || this.gains.plap;
        source.connect(targetGain);

        // audiosprite uses seconds, Web Audio API start(when, offset, duration)
        const start = data.start;
        const duration = data.end - data.start;
        
        source.start(0, start, duration);
    }

    setVolume(track, value) {
        if (this.gains[track]) {
            // value: 0 to 1
            this.gains[track].gain.setTargetAtTime(value, this.context.currentTime, 0.01);
        }
    }

    // 用于 iOS 解锁 AudioContext
    resume() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }
}

// 导出全局实例
window.audioEngine = new AudioEngine();
