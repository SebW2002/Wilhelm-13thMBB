/* ═══════════════════════════════════════════════════════════════
   NEUROSCIENCE POSTER SITE – Main JavaScript
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ── Tab Switching ──
    initTabs();

    // ── Poster Viewer (Zoom) ──
    initPosterViewer();

    // ── Demo Video Player ──
    initVideoPlayer();

    // ── MATLAB Source Code Display ──
    initMatlabSourceDisplay();

    // ── Citation Tabs & Copy ──
    initCitations();
});


/* ═══════════════════════════════════════════════════════════════
   1. TAB SWITCHING
   ═══════════════════════════════════════════════════════════════ */
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');

            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            document.getElementById(`tab-${target}`).classList.add('active');
        });
    });
}


/* ═══════════════════════════════════════════════════════════════
   2. POSTER VIEWER (Zoom + Download)
   ═══════════════════════════════════════════════════════════════ */
function initPosterViewer() {
    const canvas = document.getElementById('poster-canvas');
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const zoomReset = document.getElementById('zoom-reset');
    const zoomLevelEl = document.getElementById('zoom-level');
    const viewport = document.getElementById('poster-viewport');

    let currentZoom = 1;
    const ZOOM_STEP = 0.15;
    const MIN_ZOOM = 0.3;
    const MAX_ZOOM = 4;

    function updateZoom() {
        canvas.style.transform = `scale(${currentZoom})`;
        canvas.style.width = currentZoom > 1 ? `${100 * currentZoom}%` : '100%';
        canvas.style.height = currentZoom > 1 ? `${100 * currentZoom}%` : '100%';
        zoomLevelEl.textContent = Math.round(currentZoom * 100) + '%';
    }

    zoomIn.addEventListener('click', () => {
        currentZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
        updateZoom();
    });

    zoomOut.addEventListener('click', () => {
        currentZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
        updateZoom();
    });

    zoomReset.addEventListener('click', () => {
        currentZoom = 1;
        updateZoom();
        viewport.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });

    // Mouse wheel zoom
    viewport.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                currentZoom = Math.min(currentZoom + ZOOM_STEP * 0.5, MAX_ZOOM);
            } else {
                currentZoom = Math.max(currentZoom - ZOOM_STEP * 0.5, MIN_ZOOM);
            }
            updateZoom();
        }
    }, { passive: false });
}


/* ═══════════════════════════════════════════════════════════════
   3. DEMO VIDEO PLAYER
   ═══════════════════════════════════════════════════════════════ */

function initVideoPlayer() {
    const video   = document.getElementById('demo-video');
    const wrapper = document.getElementById('demo-video-wrapper');
    if (!video || !wrapper) return;

    const timeEl    = document.getElementById('vid-time');
    const progBar   = document.getElementById('vid-progress-bar');
    const progFill  = document.getElementById('vid-progress-fill');
    const startBtn  = document.getElementById('vid-start');
    const stopBtn   = document.getElementById('vid-stop');
    const replayBtn = document.getElementById('vid-replay');
    const smallBtn  = document.getElementById('vid-small');
    const fsBtn     = document.getElementById('vid-fullscreen');

    let isFullscreen = false;

    // Format seconds → "M:SS"
    function fmt(s) {
        if (isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    // Update time display + progress bar
    function updateTime() {
        if (timeEl) timeEl.textContent = fmt(video.currentTime) + ' / ' + fmt(video.duration);
        if (progFill && video.duration) {
            progFill.style.width = (video.currentTime / video.duration * 100) + '%';
        }
    }

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateTime);

    // ── Start / Play ──
    startBtn.addEventListener('click', function () {
        video.play();
    });

    // ── Stop / Pause ──
    stopBtn.addEventListener('click', function () {
        video.pause();
    });

    // ── Replay ──
    replayBtn.addEventListener('click', function () {
        video.currentTime = 0;
        video.play();
    });

    // ── Progress bar click to seek ──
    if (progBar) {
        progBar.addEventListener('click', function (e) {
            const rect = progBar.getBoundingClientRect();
            const pct  = (e.clientX - rect.left) / rect.width;
            if (video.duration) {
                video.currentTime = pct * video.duration;
            }
        });
    }

    // ── Small window ──
    smallBtn.addEventListener('click', function () {
        exitFullscreen();
    });

    // ── Fullscreen toggle ──
    fsBtn.addEventListener('click', function () {
        if (isFullscreen) exitFullscreen();
        else enterFullscreen();
    });

    function enterFullscreen() {
        isFullscreen = true;
        wrapper.classList.add('vid-is-fullscreen');
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', escHandler);
    }

    function exitFullscreen() {
        isFullscreen = false;
        wrapper.classList.remove('vid-is-fullscreen');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', escHandler);
    }

    function escHandler(e) {
        if (e.key === 'Escape') exitFullscreen();
    }

    // Swap start/stop button label based on video state
    video.addEventListener('play', function () {
        startBtn.style.display = 'none';
        stopBtn.style.display = '';
    });

    video.addEventListener('pause', function () {
        startBtn.style.display = '';
        stopBtn.style.display = 'none';
    });

    video.addEventListener('ended', function () {
        startBtn.style.display = '';
        stopBtn.style.display = 'none';
    });

    // Initial state
    stopBtn.style.display = 'none';
}


/* ═══════════════════════════════════════════════════════════════
   4. MATLAB SOURCE CODE DISPLAY (collapsible)
   ═══════════════════════════════════════════════════════════════ */

function initMatlabSourceDisplay() {
    const pre = document.getElementById('matlab-source-code');
    if (!pre) return;

    // Simple syntax highlighting for MATLAB
    function highlight(code) {
        let html = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Process line by line for comments
        html = html.split('\n').map(line => {
            const commentIdx = line.indexOf('%');
            if (commentIdx !== -1) {
                const before = line.substring(0, commentIdx);
                const comment = line.substring(commentIdx);
                return highlightNonComment(before) + `<span class="cmt">${comment}</span>`;
            }
            return highlightNonComment(line);
        }).join('\n');

        return html;
    }

    function highlightNonComment(text) {
        text = text.replace(/'([^']*)'/g, `<span class="str">'$1'</span>`);
        text = text.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');

        const keywords = ['function', 'end', 'for', 'while', 'if', 'else', 'elseif', 'try', 'catch', 'return', 'break', 'continue'];
        keywords.forEach(kw => {
            text = text.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="kw">$1</span>');
        });

        const fns = ['Screen', 'PsychImaging', 'PsychDefaultSetup', 'DrawFormattedText', 'WaitSecs', 'GetSecs',
            'Priority', 'MaxPriority', 'RectCenter', 'RectWidth', 'RectHeight', 'sca', 'struct', 'repmat',
            'round', 'rand', 'randi', 'sqrt', 'cos', 'sin', 'tan', 'deg2rad', 'max', 'length', 'error',
            'find', 'ismember', 'strcmp', 'onCleanup', 'rethrow'];
        fns.forEach(fn => {
            text = text.replace(new RegExp(`\\b(${fn})\\b`, 'g'), '<span class="fn">$1</span>');
        });

        return text;
    }

    // Render MATLAB source with syntax highlighting
    pre.innerHTML = highlight(MATLAB_SOURCE);
}

// Trimmed MATLAB source for display
const MATLAB_SOURCE = `% =========================================================================
% MOT Demo-Version (Konferenz)
% Date: 12.09.2025
% Version: Demo 1.0
% =========================================================================
function DemoWork()
  
% --- 0. Initialisierung ---
  sca;
  close all;
  clearvars;
  PsychDefaultSetup(2);
  
  % --- 1. Konfiguration ---
  cfg = struct();
  
  cfg.screen.bgColor = [100/255 100/255 100/255]; 
  cfg.screen.fgColor = [192/255 192/255 192/255]; 
  cfg.screen.viewingDistanceMm = 600;
  cfg.screen.physicalWidthMm   = 614.9;
 
  cfg.timing.staticFixationDur = 1.0; 
  cfg.timing.cueDur = 1.5; 
  cfg.timing.animationDur = 4.0; 
  cfg.timing.feedbackDur = 1.5;
  cfg.timing.getReadyDur = 0.5;
  cfg.timing.autoResponseWait = 3.0;
  
  cfg.objects.numCircles = 8; 
  cfg.objects.stepsPerFrame = 5;
  cfg.objects.collisionBufferFactor = 1.5; 
  
  cfg.fixation.lineThicknessPix = 6;
  cfg.fixation.color = [0 0 0];
  cfg.colors.probeOutline = [0 0 0];
  cfg.colors.circle = [200/255 80/255 80/255];
  cfg.colors.targetOutline = [0 0 0];
  cfg.colors.feedbackCorrect = [0 1 0];
  cfg.colors.feedbackIncorrect = [139/255 0 0];
  cfg.visuals.targetOutlineWidth = 11;
  cfg.visuals.probeOutlineWidth = 6;
  cfg.visuals.symbolFontSize = 55;
  cfg.visuals.targetFontSize = 60;
  cfg.visuals.symbolColor = [0 0 0];
  
  cfg.exp.numTrials = 3; 
  cfg.exp.maxPlacementAttempts = 1000;
  cfg.exp.numPositionConditions = 3;

  cleanupObj = onCleanup(@() sca);
  
    try
        % --- 2. Setup von Psychtoolbox ---
        Screen('Preference', 'SkipSyncTests', 1);
        Screen('Preference', 'SuppressAllWarnings', 1);
        Screen('Preference', 'VisualDebugLevel', 0);
        
        screenNumber = max(Screen('Screens'));
        [window, windowRect] = PsychImaging('OpenWindow', screenNumber, cfg.screen.bgColor);
        Priority(MaxPriority(window));
        
        [cfg.screen.widthPix, cfg.screen.heightPix] = Screen('WindowSize', window);
        [cfg.screen.xCenter, cfg.screen.yCenter] = RectCenter(windowRect);
        cfg.screen.ifi = Screen('GetFlipInterval', window);
        
        Screen('TextFont', window, 'Arial');
        Screen('TextSize', window, 44);
        
        cfg.screen.pixelPerMm = cfg.screen.widthPix / cfg.screen.physicalWidthMm;
        cfg = calculateDerivedParameters(cfg, window);
        
        constantDiameterDva = 3.5;
        constantRadiusDva = constantDiameterDva / 2;
        constantRadiusMm = tan(deg2rad(constantRadiusDva)) * cfg.screen.viewingDistanceMm;
        cfg.objects.constantRadiusPix = constantRadiusMm * cfg.screen.pixelPerMm;
        
        targetSpeedDvaPerSec = 4.0;
        targetSpeedMmPerSec = 2 * cfg.screen.viewingDistanceMm * tan(deg2rad(targetSpeedDvaPerSec) / 2);
        targetSpeedPixPerSec = targetSpeedMmPerSec * cfg.screen.pixelPerMm;
        cfg.objects.constantSpeedPixPerFrame = targetSpeedPixPerSec * cfg.screen.ifi;
  
        % --- 3. Intro Slide ---
        introText = ['Due to the differences in technical configurations, ...'];
        Screen('FillRect', window, [128 128 128]/255);
        DrawFormattedText(window, introText, 'center', 'center', [1 1 1], 400);
        Screen('Flip', window);
        WaitSecs(5);

        % --- 4. Vorbereitung der Stimuli ---
        [demoObjectsLeft, success_l] = initializeObjects(cfg, cfg.areas.conditions(2).leftRect);
        [demoObjectsRight, success_r] = initializeObjects(cfg, cfg.areas.conditions(2).rightRect);
        
        if ~success_l || ~success_r
            error('Konnte Demo-Objekte nicht platzieren.');
        end
        
        targetIndices = [1, 2, 5, 6];
        
        % --- 5. Hauptschleife (3 Trials) ---
        for trialNum = 1:3
            condIdx = trialNum; 
            currentRects = cfg.areas.conditions(condIdx);
            current_objects.left = demoObjectsLeft;
            current_objects.right = demoObjectsRight;
            
            % Shift objects for spatial condition
            ref_center_x_left = cfg.areas.conditions(2).leftRect(1) + ...
                RectWidth(cfg.areas.conditions(2).leftRect) / 2;
            target_center_x_left = currentRects.leftRect(1) + ...
                RectWidth(currentRects.leftRect) / 2;
            x_shift = target_center_x_left - ref_center_x_left;
            
            if x_shift ~= 0
              for i = 1:length(current_objects.left)
                current_objects.left(i).px = current_objects.left(i).px + x_shift;
              end
              for i = 1:length(current_objects.right)
                current_objects.right(i).px = current_objects.right(i).px - x_shift;
              end
            end
            
            run_demo_trial(window, cfg, current_objects, currentRects, targetIndices);
        end
        
        DrawFormattedText(window, 'End of Demo', 'center', 'center', [1 1 1]);
        Screen('Flip', window);
        WaitSecs(2);
        sca;

    catch ME
        sca;
        rethrow(ME);
    end
end`;



/* ═══════════════════════════════════════════════════════════════
   4. CITATION TABS & COPY
   ═══════════════════════════════════════════════════════════════ */
function initCitations() {
    const citeTabs = document.querySelectorAll('.cite-tab');
    const citeBlocks = document.querySelectorAll('.cite-block');

    citeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-cite');

            citeTabs.forEach(t => t.classList.remove('active'));
            citeBlocks.forEach(b => b.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`cite-${target}`).classList.add('active');
        });
    });

    // Copy buttons
    document.querySelectorAll('.copy-cite-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const block = document.getElementById(targetId);
            const text = block.querySelector('p').textContent;

            navigator.clipboard.writeText(text).then(() => {
                const orig = btn.innerHTML;
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
                btn.style.color = '#5BC099';
                btn.style.borderColor = '#5BC099';
                setTimeout(() => {
                    btn.innerHTML = orig;
                    btn.style.color = '';
                    btn.style.borderColor = '';
                }, 1500);
            });
        });
    });
}
