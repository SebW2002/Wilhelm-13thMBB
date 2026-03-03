/* ═══════════════════════════════════════════════════════════════
   MOT (Multiple Object Tracking) – Canvas Simulation
   Reproduces DemoWork.m visually in the browser.
   ═══════════════════════════════════════════════════════════════ */

window.initMOTSimulation = function () {

    // ── DOM ──
    var canvas    = document.getElementById('mot-canvas');
    if (!canvas) return;
    var ctx       = canvas.getContext('2d');
    var box       = document.getElementById('mot-canvas-container');
    var overlay   = document.getElementById('mot-idle-overlay');
    var statusEl  = document.getElementById('mot-status-label');
    var progEl    = document.getElementById('mot-progress-fill');
    var trialEl   = document.getElementById('mot-trial-label');
    var wrap      = document.getElementById('mot-viewer-wrapper');

    // ── Buttons ──
    document.getElementById('mot-start').onclick   = start;
    document.getElementById('mot-stop').onclick    = stop;
    document.getElementById('mot-replay').onclick  = replay;
    document.getElementById('mot-small').onclick   = function(){ setFS(false); };
    document.getElementById('mot-fullscreen').onclick = function(){ setFS(!fs); };

    // ═══ CONFIG ═══
    var TARGETS     = [0,1,4,5];
    var N           = 8;
    var PER_SIDE    = 4;
    var TRIALS      = 3;
    var COL_BUF     = 1.5;
    var STEPS       = 5;

    // Timing (s)
    var TI=3, TR=0.5, TF=1, TC=1.5, TA=4, TRAMP=0.5, TRESP=1.5, TFB=1.5, TE=2;

    // Spatial conditions (rect center dist from canvas center, as fraction of W)
    var DISTS = [0.14, 0.26, 0.38];

    // ═══ STATE ═══
    var W=0, H=0, running=false, fs=false;
    var phase='idle', t0=0, trial=0;
    var objs=[], frozen=[], probes=[], ans=[];
    var raf=null, lt=0;

    // ═══ SIZING ═══
    function resize() {
        var r = box.getBoundingClientRect();
        var dpr = window.devicePixelRatio || 1;
        W = r.width; H = r.height;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', function(){ resize(); if(!running) idle(); });
    resize();

    // ═══ PIXEL HELPERS ═══
    function R()  { return 0.032 * H; }            // circle radius
    function SP() { return 0.12 * H; }             // speed (px/s)
    function CX() { return W/2; }
    function CY() { return H/2; }
    function FA() { return 0.025 * H; }            // fix arm
    function FT() { return Math.max(2, 0.007*H); } // fix thick
    function OW() { return Math.max(2, 0.011*H); } // outline width
    function PW() { return Math.max(2, 0.006*H); } // probe width
    function CL() { return 0.024 * H; }            // cross length
    function CW() { return Math.max(1, 0.005*H); } // cross width
    function FS() { return Math.max(14, Math.round(0.042*H)); } // font size
    function RW() { return 0.24 * W; }             // rect width
    function RH() { return 0.65 * H; }             // rect height

    function getR(c) {
        var d = DISTS[c] * W;
        var rw = RW(), rh = RH(), cx = CX(), cy = CY();
        return {
            L: { x: cx-d-rw/2, y: cy-rh/2, w: rw, h: rh },
            R: { x: cx+d-rw/2, y: cy-rh/2, w: rw, h: rh }
        };
    }

    // ═══ DRAWING ═══
    function clr() { ctx.fillStyle='rgb(100,100,100)'; ctx.fillRect(0,0,W,H); }

    function rcts(c) {
        var r = getR(c);
        ctx.fillStyle = 'rgb(192,192,192)';
        ctx.fillRect(r.L.x, r.L.y, r.L.w, r.L.h);
        ctx.fillRect(r.R.x, r.R.y, r.R.w, r.R.h);
    }

    function fix() {
        ctx.fillStyle = '#000';
        ctx.fillRect(CX()-FA()/2, CY()-FT()/2, FA(), FT());
        ctx.fillRect(CX()-FT()/2, CY()-FA()/2, FT(), FA());
    }

    function dObj(o) {
        ctx.beginPath(); ctx.arc(o.px, o.py, o.r, 0, Math.PI*2);
        ctx.fillStyle = 'rgb(200,80,80)'; ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(o.px, o.py, CL()/2, CW()/2, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(o.px, o.py, CW()/2, CL()/2, 0, 0, Math.PI*2); ctx.fill();
    }

    function dTgt(o) {
        var ow = OW();
        ctx.beginPath(); ctx.arc(o.px, o.py, o.r+1+ow, 0, Math.PI*2);
        ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.arc(o.px, o.py, o.r+1, 0, Math.PI*2);
        ctx.fillStyle = 'rgb(192,192,192)'; ctx.fill();
        dObj(o);
        ctx.font = 'bold '+FS()+'px Arial';
        ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('X', o.px, o.py);
    }

    function dProbe(o) {
        dObj(o);
        ctx.beginPath(); ctx.arc(o.px, o.py, o.r, 0, Math.PI*2);
        ctx.strokeStyle = '#000'; ctx.lineWidth = PW(); ctx.stroke();
        ctx.font = 'bold '+FS()+'px Arial';
        ctx.fillStyle = '#000'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('?', o.px, o.py);
    }

    function dSym(o, s) {
        dObj(o);
        ctx.font = 'bold '+FS()+'px Arial';
        ctx.fillStyle = '#000'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(s, o.px, o.py);
    }

    function dFB(o, ok, s) {
        ctx.beginPath(); ctx.arc(o.px, o.py, o.r, 0, Math.PI*2);
        ctx.fillStyle = ok ? 'rgb(0,255,0)' : 'rgb(139,0,0)'; ctx.fill();
        ctx.font = 'bold '+FS()+'px Arial';
        ctx.fillStyle = '#000'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(s, o.px, o.py);
    }

    function dText(t, col, sz) {
        sz = sz || Math.round(H*0.03);
        ctx.font = sz+'px Arial'; ctx.fillStyle = col||'#fff';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        var ls = t.split('\n'), lh = sz*1.5;
        var y0 = CY() - ((ls.length-1)*lh)/2;
        for (var i=0; i<ls.length; i++) ctx.fillText(ls[i], CX(), y0+i*lh);
    }

    function idle() {
        clr();
        var r = getR(1);
        ctx.globalAlpha = 0.15; ctx.fillStyle = 'rgb(192,192,192)';
        ctx.fillRect(r.L.x, r.L.y, r.L.w, r.L.h);
        ctx.fillRect(r.R.x, r.R.y, r.R.w, r.R.h);
        ctx.globalAlpha = 1;
    }

    // ═══ PHYSICS ═══
    function place(c) {
        var radius = R();
        var rc = getR(c);
        objs = [];
        var sides = [rc.L, rc.R];
        for (var s = 0; s < 2; s++) {
            var rect = sides[s];
            var buf = radius * 2.5;
            for (var k = 0; k < PER_SIDE; k++) {
                var placed = false;
                for (var a = 0; a < 1000 && !placed; a++) {
                    var px = rect.x + buf + Math.random()*(rect.w - 2*buf);
                    var py = rect.y + buf + Math.random()*(rect.h - 2*buf);
                    var ok = true;
                    for (var j = 0; j < objs.length; j++) {
                        var dx = px - objs[j].px, dy = py - objs[j].py;
                        if (dx*dx+dy*dy < (radius*2+radius*0.6)*(radius*2+radius*0.6)) { ok=false; break; }
                    }
                    if (ok) {
                        var ang = Math.random()*Math.PI*2;
                        var spd = SP()/60;
                        objs.push({px:px,py:py,vx:spd*Math.cos(ang),vy:spd*Math.sin(ang),r:radius});
                        placed = true;
                    }
                }
                if (!placed) objs.push({px:rect.x+rect.w/2, py:rect.y+rect.h/2, vx:0, vy:0, r:radius});
            }
        }
    }

    function phys(dt, sm) {
        var tspd = SP() * dt * sm;
        var rc = getR(trial);
        for (var st = 0; st < STEPS; st++) {
            for (var i = 0; i < N; i++) {
                var o = objs[i];
                var cur = Math.sqrt(o.vx*o.vx+o.vy*o.vy);
                if (cur > 0) { var f=tspd/cur; o.vx*=f; o.vy*=f; }
                else if (tspd > 0) { var a2=Math.random()*Math.PI*2; o.vx=tspd*Math.cos(a2); o.vy=tspd*Math.sin(a2); }
                o.px += o.vx/STEPS; o.py += o.vy/STEPS;
            }
            for (var i2 = 0; i2 < N; i2++) {
                for (var j = i2+1; j < N; j++) {
                    if ((i2<4) !== (j<4)) continue;
                    var dx = objs[i2].px-objs[j].px, dy = objs[i2].py-objs[j].py;
                    var dSq = dx*dx+dy*dy;
                    var minD = objs[i2].r*2*COL_BUF;
                    if (dSq < minD*minD && dSq > 0) {
                        var d = Math.sqrt(dSq), nx=dx/d, ny=dy/d;
                        var v1=objs[i2].vx*nx+objs[i2].vy*ny, v2=objs[j].vx*nx+objs[j].vy*ny;
                        objs[i2].vx-=(v1-v2)*nx; objs[i2].vy-=(v1-v2)*ny;
                        objs[j].vx-=(v2-v1)*nx; objs[j].vy-=(v2-v1)*ny;
                        var ov=minD-d;
                        objs[i2].px+=nx*ov/2; objs[i2].py+=ny*ov/2;
                        objs[j].px-=nx*ov/2; objs[j].py-=ny*ov/2;
                    }
                }
            }
            for (var i3 = 0; i3 < N; i3++) {
                var oo = objs[i3];
                var rect = i3 < 4 ? rc.L : rc.R;
                if (oo.px-oo.r < rect.x)         { oo.px=rect.x+oo.r;         oo.vx=Math.abs(oo.vx); }
                if (oo.px+oo.r > rect.x+rect.w)  { oo.px=rect.x+rect.w-oo.r;  oo.vx=-Math.abs(oo.vx); }
                if (oo.py-oo.r < rect.y)          { oo.py=rect.y+oo.r;          oo.vy=Math.abs(oo.vy); }
                if (oo.py+oo.r > rect.y+rect.h)  { oo.py=rect.y+rect.h-oo.r;  oo.vy=-Math.abs(oo.vy); }
            }
        }
    }

    // ═══ PHASE MACHINE ═══
    function setP(p) { phase=p; t0=performance.now(); }
    function el()    { return (performance.now()-t0)/1000; }

    function beginTr() {
        if (trialEl) trialEl.textContent = 'Trial '+(trial+1)+' / '+TRIALS;
        place(trial);
        setP('ready');
    }

    function prepResp() {
        frozen = objs.map(function(o){return {px:o.px,py:o.py,vx:o.vx,vy:o.vy,r:o.r};});
        var pL = Math.floor(Math.random()*4);
        var pR = Math.floor(Math.random()*4)+4;
        probes = Math.random()>0.5 ? [pL,pR] : [pR,pL];
        ans = [Math.random()>0.5?'Target':'Distractor', Math.random()>0.5?'Target':'Distractor'];
    }

    // ═══ FRAME ═══
    function frame(ts) {
        if (!running) return;
        var dt = Math.min((ts-lt)/1000, 0.05);
        lt = ts;
        var r2 = box.getBoundingClientRect();
        if (Math.abs(r2.width-W)>1||Math.abs(r2.height-H)>1) resize();
        var e = el();

        if (phase==='intro') {
            ctx.fillStyle='rgb(128,128,128)'; ctx.fillRect(0,0,W,H);
            dText('Due to the differences in technical configurations, I have decided\nto remove the flickering from the objects. Nonetheless, you will be able to get\nthe idea behind. Otherwise, please feel free to approach me at the conference.','#fff');
            sS('Intro');
            if (e>=TI) beginTr();
        }
        else if (phase==='ready') {
            clr(); rcts(trial); fix();
            sS('Get Ready');
            if (e>=TR) setP('fix');
        }
        else if (phase==='fix') {
            clr(); rcts(trial); fix();
            for(var i=0;i<N;i++) dObj(objs[i]);
            sS('Fixation');
            if (e>=TF) setP('cue');
        }
        else if (phase==='cue') {
            clr(); rcts(trial); fix();
            for(var i=0;i<N;i++) TARGETS.indexOf(i)!==-1 ? dTgt(objs[i]) : dObj(objs[i]);
            sS('Cue – Memorize targets (X)');
            if (e>=TC) setP('anim');
        }
        else if (phase==='anim') {
            var sm = e<TRAMP ? e/TRAMP : 1;
            phys(dt, sm);
            clr(); rcts(trial); fix();
            for(var i=0;i<N;i++) dObj(objs[i]);
            sS('Tracking…');
            sP((trial/TRIALS + (e/TA)/TRIALS)*100);
            if (e>=TA) { prepResp(); setP('resp1'); }
        }
        else if (phase==='resp1') {
            clr(); rcts(trial); fix();
            for(var i=0;i<N;i++) dObj(frozen[i]);
            dProbe(frozen[probes[0]]);
            sS('Response – Probe 1');
            if (e>=TRESP) setP('resp2');
        }
        else if (phase==='resp2') {
            clr(); rcts(trial); fix();
            for(var i=0;i<N;i++) dObj(frozen[i]);
            dSym(frozen[probes[0]], ans[0]==='Target'?'T':'D');
            dProbe(frozen[probes[1]]);
            sS('Response – Probe 2');
            if (e>=TRESP) {
                ans=[Math.random()>0.5?'Target':'Distractor', Math.random()>0.5?'Target':'Distractor'];
                setP('feedback');
            }
        }
        else if (phase==='feedback') {
            clr(); rcts(trial); fix();
            for(var i=0;i<N;i++) {
                var pi=probes.indexOf(i);
                if (pi!==-1) {
                    var isTgt = TARGETS.indexOf(i)!==-1;
                    var ok = (isTgt&&ans[pi]==='Target')||(!isTgt&&ans[pi]==='Distractor');
                    dFB(frozen[i], ok, ans[pi]==='Target'?'T':'D');
                } else dObj(frozen[i]);
            }
            sS('Feedback');
            if (e>=TFB) { trial++; if(trial<TRIALS) beginTr(); else setP('end'); }
        }
        else if (phase==='end') {
            clr(); dText('End of Demo','#fff',Math.round(H*0.055));
            sS('Complete'); sP(100);
            if (e>=TE) { running=false; return; }
        }

        raf = requestAnimationFrame(frame);
    }

    // ═══ CONTROLS ═══
    function start() {
        if (running) return;
        running = true;
        if (overlay) overlay.style.display = 'none';
        resize(); trial=0;
        setP('intro');
        lt = performance.now();
        raf = requestAnimationFrame(frame);
    }
    function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        sS('Stopped');
    }
    function replay() {
        stop();
        if (overlay) overlay.style.display = 'flex';
        sS('Ready'); sP(0);
        if (trialEl) trialEl.textContent = '';
        resize(); idle();
    }
    function setFS(on) {
        fs = on;
        if (on) {
            wrap.classList.add('mot-is-fullscreen');
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', esc);
        } else {
            wrap.classList.remove('mot-is-fullscreen');
            document.body.style.overflow = '';
            document.removeEventListener('keydown', esc);
        }
        setTimeout(function(){ resize(); if(!running) idle(); }, 60);
    }
    function esc(e) { if(e.key==='Escape') setFS(false); }
    function sS(t) { if(statusEl) statusEl.textContent=t; }
    function sP(p) { if(progEl) progEl.style.width=p+'%'; }

    idle();
};
