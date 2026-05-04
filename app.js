document.addEventListener('DOMContentLoaded', () => {
    // =============================================
    // 动态高度修正：iOS PWA 的终极解法
    // window.innerHeight 是浏览器给出的真实可用高度
    // 直接用它来设定 #app 的像素高度，完全绕开 CSS 视口计算
    // =============================================
    const app = document.getElementById('app');

    function setAppHeight() {
        app.style.height = window.innerHeight + 'px';
    }

    setAppHeight();
    window.addEventListener('resize', setAppHeight);

    // =============================================
    // 底部导航逻辑
    // =============================================
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        });
    });

    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        const savedLanguage = localStorage.getItem('uiLanguage') || 'zh';
        languageSelect.value = savedLanguage;
        document.documentElement.lang = savedLanguage === 'zh' ? 'zh-CN' : 'en';
        languageSelect.addEventListener('change', event => {
            localStorage.setItem('uiLanguage', event.target.value);
            document.documentElement.lang = event.target.value === 'zh' ? 'zh-CN' : 'en';
        });
    }

    // =============================================
    // 音频引擎交互
    // =============================================
    const homeLoadBtn = document.getElementById('home-load-btn');
    const homeLoadArea = document.getElementById('home-load-area');

    async function handleAudioLoad() {
        // iOS 必须在点击事件中 resume
        window.audioEngine.resume();
        
        if (homeLoadBtn) {
            homeLoadBtn.style.opacity = '0.5';
            homeLoadBtn.style.pointerEvents = 'none';
            homeLoadBtn.textContent = '加载中...';
        }

        const success = await window.audioEngine.loadSprite('./audio/sprite.json', './audio/sprite.mp3');
        
        if (success) {
            // 加载成功后隐藏首页的加载区域
            if (homeLoadArea) {
                homeLoadArea.style.display = 'none';
            }
        } else {
            if (homeLoadBtn) {
                homeLoadBtn.style.opacity = '1';
                homeLoadBtn.style.pointerEvents = 'auto';
                homeLoadBtn.textContent = '重新加载';
            }
        }
    }

    if (homeLoadBtn) homeLoadBtn.addEventListener('click', handleAudioLoad);

    // =============================================
    // 核心播放逻辑 (NORMAL MODE)
    // =============================================
    const playBtn = document.getElementById('main-play-btn');
    const plapIntervalSelect = document.getElementById('plap-interval');
    
    const roleA = {
        voice: document.getElementById('role-a-voice'),
        ratio: document.getElementById('role-a-ratio'),
        counter: 0,
        nextTrigger: 2
    };

    const roleB = {
        voice: document.getElementById('role-b-voice'),
        ratio: document.getElementById('role-b-ratio'),
        counter: 0,
        nextTrigger: 3
    };

    let isPlaying = false;
    let timer = null;

    function stopNormalPlayback() {
        if (!isPlaying) return;

        isPlaying = false;
        clearTimeout(timer);
        if (playBtn) {
            playBtn.classList.remove('playing');
            playBtn.innerHTML = '<span class="play-symbol">▶</span>';
        }
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getNextTrigger(ratioValue) {
        if (ratioValue === 'random-1-3') return getRandomInt(1, 3);
        if (ratioValue === 'random-4-6') return getRandomInt(4, 6);
        return parseInt(ratioValue);
    }

    function playLoop() {
        if (!isPlaying) return;

        // 1. 播放随机 Plap (使用 'plap' 轨道)
        const plapIndex = getRandomInt(1, 23);
        window.audioEngine.playSound(`plap_${plapIndex}`, 'plap');

        // 2. 检查角色 A (使用 'roleA' 轨道)
        if (roleA.voice.value !== 'none' && roleA.ratio.value !== 'none') {
            roleA.counter++;
            if (roleA.counter >= roleA.nextTrigger) {
                const vType = roleA.voice.value;
                const maxCounts = [0, 15, 20, 23, 20, 13, 20, 19];
                const soundIndex = getRandomInt(1, maxCounts[parseInt(vType)]);
                window.audioEngine.playSound(`${vType}_${soundIndex}`, 'roleA');
                
                roleA.counter = 0;
                roleA.nextTrigger = getNextTrigger(roleA.ratio.value);
            }
        }

        // 3. 检查角色 B (使用 'roleB' 轨道)
        if (roleB.voice.value !== 'none' && roleB.ratio.value !== 'none') {
            roleB.counter++;
            if (roleB.counter >= roleB.nextTrigger) {
                const vType = roleB.voice.value;
                const maxCounts = [0, 15, 20, 23, 20, 13, 20, 19];
                const soundIndex = getRandomInt(1, maxCounts[parseInt(vType)]);
                window.audioEngine.playSound(`${vType}_${soundIndex}`, 'roleB');
                
                roleB.counter = 0;
                roleB.nextTrigger = getNextTrigger(roleB.ratio.value);
            }
        }

        // 4. 安排下一次循环
        const interval = parseInt(plapIntervalSelect.value);
        timer = setTimeout(playLoop, interval);
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (!window.audioEngine.isLoaded) {
                alert('请先加载音频');
                return;
            }

            window.audioEngine.resume();

            if (!isPlaying) {
                stopLoopPlayback();
                stopFlowPlayback();
                isPlaying = true;
                playBtn.classList.add('playing');
                playBtn.innerHTML = '<span class="play-symbol">■</span>';
                // 初始化触发器
                roleA.nextTrigger = getNextTrigger(roleA.ratio.value);
                roleB.nextTrigger = getNextTrigger(roleB.ratio.value);
                playLoop();
            } else {
                stopNormalPlayback();
            }
        });
    }

    // =============================================
    // 循环播放逻辑 (LOOP MODE)
    // =============================================
    const loopSegmentCount = document.getElementById('loop-segment-count');
    const segmentsContainer = document.getElementById('loop-segments-container');
    const loopPlayBtn = document.getElementById('loop-play-btn');

    function createSegmentCards() {
        const count = parseInt(loopSegmentCount.value);
        segmentsContainer.innerHTML = '';
        
        // 默认配置数据 (仅在 3 Segments 时应用)
        const defaults = [
            { dur: 18, interval: "900", ratioA: "random-1-3", ratioB: "random-1-3" },
            { dur: 12, interval: "600", ratioA: "random-1-3", ratioB: "random-1-3" },
            { dur: 3,  interval: "200", ratioA: "random-4-6", ratioB: "random-4-6" }
        ];
        
        for (let i = 1; i <= count; i++) {
            const def = (count === 3) ? defaults[i-1] : { dur: 5, interval: "300", ratioA: "2", ratioB: "3" };
            
            const card = document.createElement('div');
            card.className = 'card segment-card';
            card.innerHTML = `
                <h2 class="card-title">[ 片段 ${i} ]</h2>
                <div class="control-group">
                    <label>时长</label>
                    <div class="stepper">
                        <div class="stepper-val"><span class="dur-val">${def.dur}</span>s</div>
                        <div class="stepper-controls">
                            <button class="step-btn minus">-</button>
                            <button class="step-btn plus">+</button>
                        </div>
                    </div>
                </div>
                <div class="control-group">
                    <label>Plap 频率</label>
                    <select class="seg-plap-interval">
                        <option value="50" ${def.interval === "50" ? "selected" : ""}>0.05s</option>
                        <option value="100" ${def.interval === "100" ? "selected" : ""}>0.1s</option>
                        <option value="150" ${def.interval === "150" ? "selected" : ""}>0.15s</option>
                        <option value="200" ${def.interval === "200" ? "selected" : ""}>0.2s</option>
                        <option value="300" ${def.interval === "300" ? "selected" : ""}>0.3s</option>
                        <option value="600" ${def.interval === "600" ? "selected" : ""}>0.6s</option>
                        <option value="900" ${def.interval === "900" ? "selected" : ""}>0.9s</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Role A 比例</label>
                    <select class="seg-role-a-ratio">
                        <option value="none" ${def.ratioA === "none" ? "selected" : ""}>无声音</option>
                        <option value="1" ${def.ratioA === "1" ? "selected" : ""}>每 1 次</option>
                        <option value="2" ${def.ratioA === "2" ? "selected" : ""}>每 2 次</option>
                        <option value="3" ${def.ratioA === "3" ? "selected" : ""}>每 3 次</option>
                        <option value="4" ${def.ratioA === "4" ? "selected" : ""}>每 4 次</option>
                        <option value="5" ${def.ratioA === "5" ? "selected" : ""}>每 5 次</option>
                        <option value="6" ${def.ratioA === "6" ? "selected" : ""}>每 6 次</option>
                        <option value="random-1-3" ${def.ratioA === "random-1-3" ? "selected" : ""}>随机 1-3</option>
                        <option value="random-4-6" ${def.ratioA === "random-4-6" ? "selected" : ""}>随机 4-6</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Role B 比例</label>
                    <select class="seg-role-b-ratio">
                        <option value="none" ${def.ratioB === "none" ? "selected" : ""}>无声音</option>
                        <option value="1" ${def.ratioB === "1" ? "selected" : ""}>每 1 次</option>
                        <option value="2" ${def.ratioB === "2" ? "selected" : ""}>每 2 次</option>
                        <option value="3" ${def.ratioB === "3" ? "selected" : ""}>每 3 次</option>
                        <option value="4" ${def.ratioB === "4" ? "selected" : ""}>每 4 次</option>
                        <option value="5" ${def.ratioB === "5" ? "selected" : ""}>每 5 次</option>
                        <option value="6" ${def.ratioB === "6" ? "selected" : ""}>每 6 次</option>
                        <option value="random-1-3" ${def.ratioB === "random-1-3" ? "selected" : ""}>随机 1-3</option>
                        <option value="random-4-6" ${def.ratioB === "random-4-6" ? "selected" : ""}>随机 4-6</option>
                    </select>
                </div>
            `;
            
            // 绑定步进器逻辑 (包含长按连加/减)
            const minusBtn = card.querySelector('.minus');
            const plusBtn = card.querySelector('.plus');
            const valSpan = card.querySelector('.dur-val');

            function updateVal(delta) {
                let current = parseInt(valSpan.textContent);
                let next = current + delta;
                if (next >= 2 && next <= 20) {
                    valSpan.textContent = next;
                    return true;
                }
                return false;
            }

            function setupStepperBtn(btn, delta) {
                let pressTimer = null;
                let repeatTimer = null;

                const start = (e) => {
                    e.preventDefault();
                    updateVal(delta); // 先执行一次点击

                    // 500ms 后开启快速连发
                    pressTimer = setTimeout(() => {
                        repeatTimer = setInterval(() => {
                            if (!updateVal(delta)) stop(); // 到达边界停止
                        }, 100);
                    }, 500);
                };

                const stop = () => {
                    clearTimeout(pressTimer);
                    clearInterval(repeatTimer);
                };

                btn.addEventListener('mousedown', start);
                btn.addEventListener('touchstart', start, { passive: false });
                window.addEventListener('mouseup', stop);
                window.addEventListener('touchend', stop);
                btn.addEventListener('mouseleave', stop);
            }

            setupStepperBtn(minusBtn, -1);
            setupStepperBtn(plusBtn, 1);
            
            segmentsContainer.appendChild(card);
        }
    }

    if (loopSegmentCount) {
        loopSegmentCount.addEventListener('change', createSegmentCards);
        createSegmentCards(); // 初始化
    }

    let isLoopPlaying = false;
    let loopTimer = null;
    let currentSegIndex = 0;
    let segStartTime = 0;
    let loopCounters = { a: 0, b: 0, nextA: 2, nextB: 3 };

    function stopLoopPlayback() {
        if (!isLoopPlaying) return;

        isLoopPlaying = false;
        clearTimeout(loopTimer);
        if (loopPlayBtn) {
            loopPlayBtn.classList.remove('playing');
            loopPlayBtn.innerHTML = '<span class="play-symbol">▶</span>';
        }
        document.querySelectorAll('.segment-card').forEach(c => c.style.borderColor = 'var(--border-color)');
    }

    function runLoopStep() {
        if (!isLoopPlaying) return;

        const segments = document.querySelectorAll('.segment-card');
        const currentSeg = segments[currentSegIndex];
        if (!currentSeg) return;
        
        // 获取当前片段的配置 (从步进器的文字中读取)
        const duration = parseInt(currentSeg.querySelector('.dur-val').textContent);
        const interval = parseInt(currentSeg.querySelector('.seg-plap-interval').value);
        const ratioA = currentSeg.querySelector('.seg-role-a-ratio').value;
        const ratioB = currentSeg.querySelector('.seg-role-b-ratio').value;
        const voiceA = document.getElementById('loop-role-a-voice').value;
        const voiceB = document.getElementById('loop-role-b-voice').value;

        // 1. 检查是否需要切换片段
        if (Date.now() - segStartTime >= duration * 1000) {
            currentSegIndex = (currentSegIndex + 1) % segments.length;
            segStartTime = Date.now();
            // 切换片段时视觉反馈
            document.querySelectorAll('.segment-card').forEach(c => c.style.borderColor = 'var(--border-color)');
            segments[currentSegIndex].style.borderColor = 'var(--accent-color)';
            segments[currentSegIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            return runLoopStep(); 
        }

        // 2. 播放 Plap
        window.audioEngine.playSound(`plap_${getRandomInt(1, 23)}`, 'plap');

        // 3. 角色 A
        if (voiceA !== 'none' && ratioA !== 'none') {
            loopCounters.a++;
            if (loopCounters.a >= loopCounters.nextA) {
                const maxCounts = [0, 15, 20, 23, 20, 13, 20, 19];
                window.audioEngine.playSound(`${voiceA}_${getRandomInt(1, maxCounts[parseInt(voiceA)])}`, 'roleA');
                loopCounters.a = 0;
                loopCounters.nextA = getNextTrigger(ratioA);
            }
        }

        // 4. 角色 B
        if (voiceB !== 'none' && ratioB !== 'none') {
            loopCounters.b++;
            if (loopCounters.b >= loopCounters.nextB) {
                const maxCounts = [0, 15, 20, 23, 20, 13, 20, 19];
                window.audioEngine.playSound(`${voiceB}_${getRandomInt(1, maxCounts[parseInt(voiceB)])}`, 'roleB');
                loopCounters.b = 0;
                loopCounters.nextB = getNextTrigger(ratioB);
            }
        }

        loopTimer = setTimeout(runLoopStep, interval);
    }

    if (loopPlayBtn) {
        loopPlayBtn.addEventListener('click', () => {
            if (!window.audioEngine.isLoaded) {
                alert('请先加载音频');
                return;
            }

            window.audioEngine.resume();

            if (!isLoopPlaying) {
                stopNormalPlayback();
                stopFlowPlayback();
                isLoopPlaying = true;
                loopPlayBtn.classList.add('playing');
                loopPlayBtn.innerHTML = '<span class="play-symbol">■</span>';
                currentSegIndex = 0;
                segStartTime = Date.now();
                loopCounters = { a: 0, b: 0, nextA: 1, nextB: 1 };
                runLoopStep();
            } else {
                stopLoopPlayback();
            }
        });
    }

    // =============================================
    // 顺滑播放逻辑 (FLOW MODE)
    // =============================================
    const flowDuration = document.getElementById('flow-duration');
    const flowRoleAVoice = document.getElementById('flow-role-a-voice');
    const flowRoleBVoice = document.getElementById('flow-role-b-voice');
    const flowRoleAOverlap = document.getElementById('flow-role-a-overlap');
    const flowRoleBOverlap = document.getElementById('flow-role-b-overlap');
    const flowPlayBtn = document.getElementById('flow-play-btn');
    const flowMinNodes = 2;
    const flowMaxNodes = 20;
    const flowMaxRoleCounts = [0, 15, 20, 23, 20, 13, 20, 19];

    const flowCurves = [
        createFlowCurve({
            name: 'Plap Frequency',
            editor: document.getElementById('flow-editor'),
            progressLine: document.getElementById('flow-progress-line'),
            path: document.getElementById('flow-path'),
            pointsLayer: document.getElementById('flow-points-layer'),
            axisEnd: document.getElementById('flow-axis-end'),
            readout: document.getElementById('flow-readout'),
            minusBtn: document.getElementById('flow-node-minus'),
            plusBtn: document.getElementById('flow-node-plus'),
            countLabel: document.getElementById('flow-node-count-label'),
            defaultPoints: [
                { x: 0, y: 0.50 },
                { x: 0.29, y: 0.15 },
                { x: 0.41, y: 0.90 },
                { x: 0.54, y: 1.00 },
                { x: 0.67, y: 0.145 },
                { x: 0.79, y: 0.14 },
                { x: 1, y: 0.50 }
            ],
            yToValue: y => Math.round(50 + y * (1500 - 50)),
            formatValue: value => (value / 1000).toFixed(2) + 's 间隔'
        }),
        createFlowCurve({
            name: 'Plap Volume',
            editor: document.getElementById('flow-editor'),
            path: document.getElementById('plap-volume-path'),
            pointsLayer: document.getElementById('plap-volume-points-layer'),
            readout: document.getElementById('plap-volume-readout'),
            minusBtn: document.getElementById('plap-volume-node-minus'),
            plusBtn: document.getElementById('plap-volume-node-plus'),
            countLabel: document.getElementById('plap-volume-node-count-label'),
            pointClass: 'flow-point-green',
            defaultPoints: [
                { x: 0, y: 0.11 },
                { x: 0.11, y: 0.78 },
                { x: 0.21, y: 0.78 },
                { x: 0.29, y: 0.00 },
                { x: 0.50, y: 0.76 },
                { x: 0.63, y: 0.00 },
                { x: 0.70, y: 0.48 },
                { x: 0.85, y: 0.50 },
                { x: 0.9425, y: 0.75 },
                { x: 1, y: 0.11 }
            ],
            defaultY: () => 0.5,
            yToValue: y => Math.round((1 - y) * 200) / 100,
            formatValue: value => Math.round(value * 100) + '% 音量'
        }),
        createFlowCurve({
            name: 'Role A Ratio',
            editor: document.getElementById('role-a-ratio-editor'),
            progressLine: document.getElementById('role-a-ratio-progress-line'),
            path: document.getElementById('role-a-ratio-path'),
            pointsLayer: document.getElementById('role-a-ratio-points-layer'),
            axisEnd: document.getElementById('role-a-ratio-axis-end'),
            readout: document.getElementById('role-a-ratio-readout'),
            minusBtn: document.getElementById('role-a-ratio-node-minus'),
            plusBtn: document.getElementById('role-a-ratio-node-plus'),
            countLabel: document.getElementById('role-a-ratio-node-count-label'),
            defaultPoints: [
                { x: 0, y: 0.08 },
                { x: 0.335, y: 0.00 },
                { x: 0.67, y: 0.25 },
                { x: 1, y: 0.08 }
            ],
            yToValue: y => Math.round(1 + y * 5),
            formatValue: value => `每 ${value} 次 plap`
        }),
        createFlowCurve({
            name: 'Role A Same Audio Chance',
            editor: document.getElementById('role-a-ratio-editor'),
            path: document.getElementById('role-a-same-path'),
            pointsLayer: document.getElementById('role-a-same-points-layer'),
            readout: document.getElementById('role-a-same-readout'),
            minusBtn: document.getElementById('role-a-same-node-minus'),
            plusBtn: document.getElementById('role-a-same-node-plus'),
            countLabel: document.getElementById('role-a-same-node-count-label'),
            pointClass: 'flow-point-yellow',
            defaultPoints: [
                { x: 0, y: 1.00 },
                { x: 0.36, y: 0.15 },
                { x: 0.50, y: 1.00 },
                { x: 0.61, y: 1.00 },
                { x: 0.72, y: 0.23 },
                { x: 0.89, y: 0.23 },
                { x: 1, y: 1.00 }
            ],
            yToValue: y => Math.round((1 - y) * 100),
            formatValue: value => value + '% 相同音频'
        }),
        createFlowCurve({
            name: 'Role A Volume',
            editor: document.getElementById('role-a-ratio-editor'),
            path: document.getElementById('role-a-volume-path'),
            pointsLayer: document.getElementById('role-a-volume-points-layer'),
            readout: document.getElementById('role-a-volume-readout'),
            minusBtn: document.getElementById('role-a-volume-node-minus'),
            plusBtn: document.getElementById('role-a-volume-node-plus'),
            countLabel: document.getElementById('role-a-volume-node-count-label'),
            pointClass: 'flow-point-green',
            syncAverageSourceIndexes: [0, 1],
            syncAverageSampleXs: [0, 0.26, 0.35, 0.45, 0.65, 0.73, 0.91, 0.96, 1],
            yToValue: y => Math.round((1 - y) * 200) / 100,
            formatValue: value => Math.round(value * 100) + '% 音量'
        }),
        createFlowCurve({
            name: 'Role B Ratio',
            editor: document.getElementById('role-b-ratio-editor'),
            progressLine: document.getElementById('role-b-ratio-progress-line'),
            path: document.getElementById('role-b-ratio-path'),
            pointsLayer: document.getElementById('role-b-ratio-points-layer'),
            axisEnd: document.getElementById('role-b-ratio-axis-end'),
            readout: document.getElementById('role-b-ratio-readout'),
            minusBtn: document.getElementById('role-b-ratio-node-minus'),
            plusBtn: document.getElementById('role-b-ratio-node-plus'),
            countLabel: document.getElementById('role-b-ratio-node-count-label'),
            defaultPoints: [
                { x: 0, y: 0.08 },
                { x: 0.335, y: 0.00 },
                { x: 0.67, y: 0.25 },
                { x: 1, y: 0.08 }
            ],
            yToValue: y => Math.round(1 + y * 5),
            formatValue: value => `每 ${value} 次 plap`
        }),
        createFlowCurve({
            name: 'Role B Same Audio Chance',
            editor: document.getElementById('role-b-ratio-editor'),
            path: document.getElementById('role-b-same-path'),
            pointsLayer: document.getElementById('role-b-same-points-layer'),
            readout: document.getElementById('role-b-same-readout'),
            minusBtn: document.getElementById('role-b-same-node-minus'),
            plusBtn: document.getElementById('role-b-same-node-plus'),
            countLabel: document.getElementById('role-b-same-node-count-label'),
            pointClass: 'flow-point-yellow',
            defaultPoints: [
                { x: 0, y: 1.00 },
                { x: 0.36, y: 0.15 },
                { x: 0.50, y: 1.00 },
                { x: 0.61, y: 1.00 },
                { x: 0.72, y: 0.23 },
                { x: 0.89, y: 0.23 },
                { x: 1, y: 1.00 }
            ],
            yToValue: y => Math.round((1 - y) * 100),
            formatValue: value => value + '% 相同音频'
        }),
        createFlowCurve({
            name: 'Role B Volume',
            editor: document.getElementById('role-b-ratio-editor'),
            path: document.getElementById('role-b-volume-path'),
            pointsLayer: document.getElementById('role-b-volume-points-layer'),
            readout: document.getElementById('role-b-volume-readout'),
            minusBtn: document.getElementById('role-b-volume-node-minus'),
            plusBtn: document.getElementById('role-b-volume-node-plus'),
            countLabel: document.getElementById('role-b-volume-node-count-label'),
            pointClass: 'flow-point-green',
            syncAverageSourceIndexes: [0, 1],
            syncAverageSampleXs: [0, 0.26, 0.35, 0.45, 0.65, 0.73, 0.91, 0.96, 1],
            yToValue: y => Math.round((1 - y) * 200) / 100,
            formatValue: value => Math.round(value * 100) + '% 音量'
        })
    ];

    let isFlowPlaying = false;
    let flowTimer = null;
    let flowProgressTimer = null;
    let flowStartTime = 0;
    const flowRoles = [
        {
            key: 'A',
            track: 'roleA',
            voiceSelect: flowRoleAVoice,
            overlapToggle: flowRoleAOverlap,
            ratioCurve: flowCurves[2],
            sameCurve: flowCurves[3],
            volumeCurve: flowCurves[4],
            counter: 0,
            busy: false,
            busyTimer: null,
            lastSound: null
        },
        {
            key: 'B',
            track: 'roleB',
            voiceSelect: flowRoleBVoice,
            overlapToggle: flowRoleBOverlap,
            ratioCurve: flowCurves[5],
            sameCurve: flowCurves[6],
            volumeCurve: flowCurves[7],
            counter: 0,
            busy: false,
            busyTimer: null,
            lastSound: null
        }
    ];

    function createSmoothPath(points) {
        if (points.length === 0) return '';
        if (points.length === 1) return `M ${points[0].x * 100} ${points[0].y * 100}`;

        const scaled = points.map(point => ({ x: point.x * 100, y: point.y * 100 }));
        let path = `M ${scaled[0].x} ${scaled[0].y}`;

        for (let i = 0; i < scaled.length - 1; i++) {
            const p0 = scaled[Math.max(i - 1, 0)];
            const p1 = scaled[i];
            const p2 = scaled[i + 1];
            const p3 = scaled[Math.min(i + 2, scaled.length - 1)];
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        return path;
    }

    function createFlowCurve(config) {
        const curve = {
            ...config,
            points: [],
            nodeTotal: config.defaultPoints?.length || 4
        };

        curve.sortPoints = () => {
            curve.points.sort((a, b) => a.x - b.x);
        };

        curve.markManual = () => {
            curve.isSynced = false;
        };

        curve.syncEdgeY = y => {
            if (curve.points.length < 2) return;
            curve.points[0].y = y;
            curve.points[curve.points.length - 1].y = y;
        };

        curve.lockEdges = () => {
            if (curve.points.length < 2) return;
            curve.points[0].x = 0;
            curve.points[curve.points.length - 1].x = 1;
            curve.syncEdgeY(curve.points[0].y);
        };

        curve.getValueAt = progress => {
            return curve.yToValue(curve.getYAt(progress));
        };

        curve.getYAt = progress => {
            curve.sortPoints();
            if (curve.points.length === 0) return 0.5;
            if (progress <= curve.points[0].x) return curve.points[0].y;
            for (let i = 0; i < curve.points.length - 1; i++) {
                const current = curve.points[i];
                const next = curve.points[i + 1];
                if (progress <= next.x) {
                    const span = next.x - current.x || 1;
                    const local = (progress - current.x) / span;
                    const eased = local * local * (3 - 2 * local);
                    return current.y + (next.y - current.y) * eased;
                }
            }

            return curve.points[curve.points.length - 1].y;
        };

        curve.updateReadout = index => {
            if (!curve.readout || !curve.points[index]) return;
            const duration = parseInt(flowDuration.value);
            const point = curve.points[index];
            curve.readout.textContent = `节点 ${index + 1}: ${(point.x * duration).toFixed(1)}s / ${curve.formatValue(curve.yToValue(point.y))}`;
        };

        curve.render = (activeIndex = 0) => {
            if (!curve.editor || !curve.pointsLayer || !curve.path) return;

            curve.pointsLayer.innerHTML = '';
            curve.sortPoints();
            curve.lockEdges();
            curve.path.setAttribute('d', createSmoothPath(curve.points));

            curve.points.forEach((point, index) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'flow-point';
                if (curve.pointClass) {
                    dot.classList.add(curve.pointClass);
                }
                dot.style.left = (point.x * 100) + '%';
                dot.style.top = (point.y * 100) + '%';
                dot.setAttribute('aria-label', `${curve.name} 节点 ${index + 1}`);
                dot.addEventListener('pointerdown', event => startFlowDrag(event, curve, point));
                curve.pointsLayer.appendChild(dot);
            });

            if (curve.axisEnd) {
                curve.axisEnd.textContent = flowDuration.value + 's';
            }
            if (curve.countLabel) {
                curve.countLabel.textContent = String(curve.points.length);
            }
            if (curve.minusBtn) {
                curve.minusBtn.disabled = curve.points.length <= flowMinNodes;
            }
            if (curve.plusBtn) {
                curve.plusBtn.disabled = curve.points.length >= flowMaxNodes;
            }
            curve.updateReadout(Math.min(activeIndex, curve.points.length - 1));
        };

        curve.copyFrom = sourceCurve => {
            curve.points = sourceCurve.points.map(point => ({ ...point }));
            curve.nodeTotal = curve.points.length;
            curve.render();
        };

        curve.copyAverageFrom = sourceCurves => {
            const xValues = curve.syncAverageSampleXs || [...new Set(sourceCurves.flatMap(source => source.points.map(point => Number(point.x.toFixed(4)))))].sort((a, b) => a - b);
            curve.points = xValues.map(x => ({
                x,
                y: sourceCurves.reduce((sum, source) => sum + source.getYAt(x), 0) / sourceCurves.length
            }));
            curve.nodeTotal = curve.points.length;
            curve.render();
        };

        curve.reset = () => {
            if (typeof curve.syncSourceIndex === 'number') {
                const sourceCurve = flowCurves[curve.syncSourceIndex];
                if (sourceCurve) {
                    curve.isSynced = true;
                    curve.copyFrom(sourceCurve);
                    return;
                }
            }
            if (curve.syncAverageSourceIndexes) {
                const sourceCurves = curve.syncAverageSourceIndexes.map(index => flowCurves[index]).filter(Boolean);
                if (sourceCurves.length > 0) {
                    curve.isSynced = true;
                    curve.copyAverageFrom(sourceCurves);
                    return;
                }
            }

            if (curve.defaultPoints) {
                curve.points = curve.defaultPoints.map(point => ({ ...point }));
                curve.nodeTotal = curve.points.length;
                curve.lockEdges();
                curve.render();
                return;
            }

            curve.points = [];
            for (let i = 0; i < curve.nodeTotal; i++) {
                const x = i / (curve.nodeTotal - 1);
                const y = curve.defaultY
                    ? curve.defaultY(i, curve.nodeTotal)
                    : 0.5 - Math.sin((i / (curve.nodeTotal - 1)) * Math.PI * 2) * 0.22;
                curve.points.push({ x, y: Math.min(0.9, Math.max(0.1, y)) });
            }

            curve.lockEdges();
            curve.render();
        };

        curve.addNode = () => {
            if (curve.points.length >= flowMaxNodes) return;

            curve.sortPoints();
            const beforeLast = curve.points[curve.points.length - 2];
            const last = curve.points[curve.points.length - 1];
            const point = {
                x: (beforeLast.x + last.x) / 2,
                y: (beforeLast.y + last.y) / 2
            };
            curve.points.splice(curve.points.length - 1, 0, point);
            curve.nodeTotal = curve.points.length;
            curve.render(curve.points.indexOf(point));
            curve.markManual();
            syncDependentFlowCurves(curve);
        };

        curve.removeNode = () => {
            if (curve.points.length <= flowMinNodes) return;

            curve.points.splice(curve.points.length - 2, 1);
            curve.nodeTotal = curve.points.length;
            curve.render(curve.points.length - 1);
            curve.markManual();
            syncDependentFlowCurves(curve);
        };

        if (curve.minusBtn) {
            curve.minusBtn.addEventListener('click', curve.removeNode);
        }
        if (curve.plusBtn) {
            curve.plusBtn.addEventListener('click', curve.addNode);
        }
        if (curve.progressLine) {
            curve.progressLine.addEventListener('pointerdown', event => startFlowProgressDrag(event, curve.editor));
        }

        return curve;
    }

    function startFlowDrag(event, curve, point) {
        event.preventDefault();
        const target = event.currentTarget;

        const move = moveEvent => {
            const rect = curve.editor.getBoundingClientRect();
            const x = (moveEvent.clientX - rect.left) / rect.width;
            const y = (moveEvent.clientY - rect.top) / rect.height;
            const clampedY = Math.min(1, Math.max(0, y));
            const pointIndex = curve.points.indexOf(point);

            if (pointIndex === 0 || pointIndex === curve.points.length - 1) {
                curve.syncEdgeY(clampedY);
            } else {
                point.x = Math.min(1, Math.max(0, x));
                point.y = clampedY;
            }
            curve.render(curve.points.indexOf(point));
            curve.markManual();
            syncDependentFlowCurves(curve);
        };

        const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
        };

        target.focus();
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
    }

    function syncDependentFlowCurves(sourceCurve) {
        const sourceIndex = flowCurves.indexOf(sourceCurve);
        flowCurves.forEach(curve => {
            if (curve.syncSourceIndex !== sourceIndex || curve.isSynced === false) return;
            curve.copyFrom(sourceCurve);
        });
        flowCurves.forEach(curve => {
            if (!curve.syncAverageSourceIndexes || curve.isSynced === false) return;
            if (!curve.syncAverageSourceIndexes.includes(sourceIndex)) return;
            const sourceCurves = curve.syncAverageSourceIndexes.map(index => flowCurves[index]).filter(Boolean);
            curve.copyAverageFrom(sourceCurves);
        });
    }

    function setFlowProgress(progress) {
        const durationMs = parseInt(flowDuration.value) * 1000;
        flowStartTime = Date.now() - progress * durationMs;
        updateFlowProgressLine();
    }

    function startFlowProgressDrag(event, editor) {
        event.preventDefault();

        const move = moveEvent => {
            const rect = editor.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left) / rect.width));
            setFlowProgress(progress);
        };

        const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
        };

        move(event);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
    }

    function stopFlowPlayback() {
        if (!isFlowPlaying) return;

        isFlowPlaying = false;
        clearTimeout(flowTimer);
        flowRoles.forEach(role => {
            clearTimeout(role.busyTimer);
            role.busy = false;
            role.lastSound = null;
        });
        cancelAnimationFrame(flowProgressTimer);
        flowProgressTimer = null;
        flowCurves.forEach(curve => {
            if (!curve.progressLine) return;
            curve.progressLine.classList.remove('active');
            curve.progressLine.style.transform = 'translateX(0)';
        });
        window.audioEngine.setVolume('plap', parseFloat(document.getElementById('vol-plap')?.value || '1'));
        window.audioEngine.setVolume('roleA', parseFloat(document.getElementById('vol-role-a')?.value || '1'));
        window.audioEngine.setVolume('roleB', parseFloat(document.getElementById('vol-role-b')?.value || '1'));
        if (flowPlayBtn) {
            flowPlayBtn.classList.remove('playing');
            flowPlayBtn.innerHTML = '<span class="play-symbol">▶</span>';
        }
    }

    function updateFlowProgressLine() {
        if (!isFlowPlaying) return;

        const durationMs = parseInt(flowDuration.value) * 1000;
        const cycleElapsed = (Date.now() - flowStartTime) % durationMs;
        const progress = cycleElapsed / durationMs;
        flowCurves.forEach(curve => {
            if (!curve.progressLine || !curve.editor) return;
            curve.progressLine.style.transform = `translateX(${progress * curve.editor.clientWidth}px)`;
        });
        flowProgressTimer = requestAnimationFrame(updateFlowProgressLine);
    }

    function runFlowStep() {
        if (!isFlowPlaying) return;

        const durationMs = parseInt(flowDuration.value) * 1000;
        const cycleElapsed = (Date.now() - flowStartTime) % durationMs;
        const progress = cycleElapsed / durationMs;
        const interval = flowCurves[0].getValueAt(progress);
        const plapVolume = flowCurves[1].getValueAt(progress);

        window.audioEngine.setVolume('plap', plapVolume);
        flowRoles.forEach(role => {
            window.audioEngine.setVolume(role.track, role.volumeCurve.getValueAt(progress));
        });

        if (interval < 1500) {
            window.audioEngine.playSound(`plap_${getRandomInt(1, 23)}`, 'plap');
            flowRoles.forEach(role => {
                if (!role.voiceSelect || role.voiceSelect.value === 'none') return;

                role.counter++;
                if (role.counter >= role.ratioCurve.getValueAt(progress)) {
                    playFlowRole(role, role.sameCurve.getValueAt(progress));
                    role.counter = 0;
                }
            });
        }

        flowTimer = setTimeout(runFlowStep, interval);
    }

    function playFlowRole(role, sameChance) {
        if (!role.voiceSelect || role.voiceSelect.value === 'none') {
            return;
        }
        if (role.overlapToggle?.checked && role.busy) {
            return;
        }

        const voice = role.voiceSelect.value;
        const maxCount = flowMaxRoleCounts[parseInt(voice)];
        if (!maxCount) return;

        let soundName = null;

        if (role.lastSound?.startsWith(voice + '_') && Math.random() * 100 < sameChance) {
            soundName = role.lastSound;
        } else {
            let soundIndex = getRandomInt(1, maxCount);
            if (role.lastSound?.startsWith(voice + '_') && maxCount > 1) {
                let guard = 0;
                while (`${voice}_${soundIndex}` === role.lastSound && guard < 10) {
                    soundIndex = getRandomInt(1, maxCount);
                    guard++;
                }
            }
            soundName = `${voice}_${soundIndex}`;
        }

        const sound = window.audioEngine.spriteData?.spritemap?.[soundName];
        const durationMs = sound ? Math.ceil((sound.end - sound.start) * 1000) : 1000;

        window.audioEngine.playSound(soundName, role.track);
        role.lastSound = soundName;

        if (role.overlapToggle?.checked) {
            role.busy = true;
            clearTimeout(role.busyTimer);
            role.busyTimer = setTimeout(() => {
                role.busy = false;
            }, durationMs);
        }
    }

    if (flowDuration) {
        flowDuration.addEventListener('change', () => flowCurves.forEach(curve => curve.render()));
    }
    if (flowPlayBtn) {
        flowPlayBtn.addEventListener('click', () => {
            if (!window.audioEngine.isLoaded) {
                alert('请先加载音频');
                return;
            }

            window.audioEngine.resume();

            if (!isFlowPlaying) {
                stopNormalPlayback();
                stopLoopPlayback();
                isFlowPlaying = true;
                flowStartTime = Date.now();
                flowRoles.forEach(role => {
                    role.counter = 0;
                    role.busy = false;
                    role.lastSound = null;
                    clearTimeout(role.busyTimer);
                });
                flowPlayBtn.classList.add('playing');
                flowPlayBtn.innerHTML = '<span class="play-symbol">■</span>';
                flowCurves.forEach(curve => {
                    if (!curve.progressLine) return;
                    curve.progressLine.classList.add('active');
                    curve.progressLine.style.transform = 'translateX(0)';
                });
                updateFlowProgressLine();
                runFlowStep();
            } else {
                stopFlowPlayback();
            }
        });
    }
    flowCurves.forEach(curve => curve.reset());

    // =============================================
    // 音量调节逻辑
    // =============================================
    const volPlap = document.getElementById('vol-plap');
    const volRoleA = document.getElementById('vol-role-a');
    const volRoleB = document.getElementById('vol-role-b');

    if (volPlap) {
        volPlap.addEventListener('input', (e) => {
            window.audioEngine.setVolume('plap', parseFloat(e.target.value));
        });
    }
    if (volRoleA) {
        volRoleA.addEventListener('input', (e) => {
            window.audioEngine.setVolume('roleA', parseFloat(e.target.value));
        });
    }
    if (volRoleB) {
        volRoleB.addEventListener('input', (e) => {
            window.audioEngine.setVolume('roleB', parseFloat(e.target.value));
        });
    }

    // PWA Service Worker 注册
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.log('SW failed:', err));
        });
    }
});
