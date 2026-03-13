// ============================================
// Dustwalker - Input Handler
// ============================================

class InputHandler {
    constructor(canvas, renderer) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.mouse = { x: 0, y: 0, gridX: 0, gridY: 0, down: false };
        this.keys = {};
        this.callbacks = {};
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0, camX: 0, camY: 0 };
        this.enabled = true;

        this.setupListeners();
    }

    setupListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.emit('rightclick', this.mouse);
        });
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        // Touch events
        this.touchState = {
            startX: 0, startY: 0,
            lastX: 0, lastY: 0,
            startTime: 0,
            moved: false,
            pinchStartDist: 0,
            pinchStartZoom: 1,
            numTouches: 0,
        };

        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });

        // Keyboard
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('resize', () => this.renderer.resize());
    }

    onMouseMove(e) {
        if (!this.enabled) return;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;

        const grid = this.renderer.screenToWorld(e.clientX, e.clientY);
        this.mouse.gridX = grid.x;
        this.mouse.gridY = grid.y;

        if (this.isDragging) {
            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;
            this.renderer.camera.x = this.dragStart.camX - dx / this.renderer.camera.zoom;
            this.renderer.camera.y = this.dragStart.camY - dy / this.renderer.camera.zoom;
        }

        this.emit('mousemove', this.mouse);
    }

    onMouseDown(e) {
        if (!this.enabled) return;
        this.mouse.down = true;

        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            this.isDragging = true;
            this.dragStart = {
                x: e.clientX, y: e.clientY,
                camX: this.renderer.camera.x,
                camY: this.renderer.camera.y
            };
        }
    }

    onMouseUp(e) {
        this.mouse.down = false;
        this.isDragging = false;
    }

    onClick(e) {
        if (!this.enabled) return;
        if (this.isDragging) return;

        const grid = this.renderer.screenToWorld(e.clientX, e.clientY);
        this.emit('click', { x: e.clientX, y: e.clientY, gridX: grid.x, gridY: grid.y });
    }

    onWheel(e) {
        if (!this.enabled) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.renderer.camera.zoom = Utils.clamp(this.renderer.camera.zoom + delta, 0.5, 2.5);
        this.emit('zoom', this.renderer.camera.zoom);
    }

    onKeyDown(e) {
        if (!this.enabled) return;
        // Don't capture keys when typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        this.keys[e.key.toLowerCase()] = true;
        this.emit('keydown', e.key.toLowerCase());

        // Prevent default for game keys
        const gameKeys = [' ', 'tab', 'escape'];
        if (gameKeys.includes(e.key.toLowerCase())) {
            e.preventDefault();
        }
    }

    onKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    }

    // ---- Touch Handlers ----

    onTouchStart(e) {
        if (!this.enabled) return;
        e.preventDefault();

        const ts = this.touchState;
        ts.numTouches = e.touches.length;

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            ts.startX = touch.clientX;
            ts.startY = touch.clientY;
            ts.lastX = touch.clientX;
            ts.lastY = touch.clientY;
            ts.startTime = Date.now();
            ts.moved = false;

            // Start drag for camera pan
            this.dragStart = {
                x: touch.clientX, y: touch.clientY,
                camX: this.renderer.camera.x,
                camY: this.renderer.camera.y
            };

            // Update hover position
            const grid = this.renderer.screenToWorld(touch.clientX, touch.clientY);
            this.mouse.x = touch.clientX;
            this.mouse.y = touch.clientY;
            this.mouse.gridX = grid.x;
            this.mouse.gridY = grid.y;
            this.emit('mousemove', this.mouse);
        }

        if (e.touches.length === 2) {
            // Pinch zoom start
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            ts.pinchStartDist = Math.sqrt(dx * dx + dy * dy);
            ts.pinchStartZoom = this.renderer.camera.zoom;
            ts.moved = true; // Prevent tap on pinch
        }
    }

    onTouchMove(e) {
        if (!this.enabled) return;
        e.preventDefault();

        const ts = this.touchState;

        if (e.touches.length === 1 && ts.numTouches === 1) {
            const touch = e.touches[0];
            const dx = touch.clientX - ts.startX;
            const dy = touch.clientY - ts.startY;

            // If moved more than 10px, it's a drag (camera pan), not a tap
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                ts.moved = true;
                this.renderer.camera.x = this.dragStart.camX - dx / this.renderer.camera.zoom;
                this.renderer.camera.y = this.dragStart.camY - dy / this.renderer.camera.zoom;
            }

            ts.lastX = touch.clientX;
            ts.lastY = touch.clientY;
        }

        if (e.touches.length === 2) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const scale = dist / ts.pinchStartDist;
            this.renderer.camera.zoom = Utils.clamp(ts.pinchStartZoom * scale, 0.5, 2.5);
            this.emit('zoom', this.renderer.camera.zoom);
        }
    }

    onTouchEnd(e) {
        if (!this.enabled) return;
        e.preventDefault();

        const ts = this.touchState;

        // Single-finger tap (not a drag or pinch)
        if (!ts.moved && ts.numTouches === 1) {
            const elapsed = Date.now() - ts.startTime;

            if (elapsed < 300) {
                // Short tap = click
                const grid = this.renderer.screenToWorld(ts.startX, ts.startY);
                this.emit('click', {
                    x: ts.startX, y: ts.startY,
                    gridX: grid.x, gridY: grid.y
                });
            } else {
                // Long press = right click (look/context)
                this.emit('rightclick', this.mouse);
            }
        }

        ts.numTouches = e.touches.length;
        ts.moved = false;
    }

    isKeyDown(key) {
        return this.keys[key.toLowerCase()] || false;
    }

    on(event, callback) {
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(callback);
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            for (const cb of this.callbacks[event]) {
                cb(data);
            }
        }
    }
}
