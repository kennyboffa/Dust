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
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.emit('rightclick', this.mouse);
        });
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

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
