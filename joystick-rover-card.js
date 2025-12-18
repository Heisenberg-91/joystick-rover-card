import {
    LitElement,
    html,
    css
} from 'https://unpkg.com/lit@2.7.4/index.js?module';

class JoystickRoverCard extends LitElement {
    
    // 1. Configuration initiale (répare l'erreur setConfig)
    setConfig(config) {
        this.config = config;
    }

    static get properties() {
        return {
            hass: { type: Object },
            config: { type: Object },
            x: { type: Number },
            y: { type: Number },
        };
    }

    constructor() {
        super();
        this.baseRadius = 80;
        this.handleRadius = 41;
        this.maxDistance = this.baseRadius - this.handleRadius;
        this.x = 0;
        this.y = 0;
        this.isDragging = false;
        this.lastSend = 0; // Pour supprimer le lag de 4s
    }

    static get styles() {
        return css`
            :host {
                display: block;
            }
            .card-content {
                padding: 30px;
                display: flex;
                flex-direction: column;
                align-items: center;
                background: #1a1a1a;
                border-radius: var(--ha-card-border-radius, 12px);
            }
            /* LE SOUFFLET INDUSTRIEL */
            .base {
                width: 160px;
                height: 160px;
                border-radius: 50%;
                position: relative;
                background: #000;
                /* Anneaux concentriques style caoutchouc */
                background-image: repeating-radial-gradient(
                    circle at center,
                    #222 0px, #222 8px,
                    #0a0a0a 10px, #000 12px
                );
                border: 4px solid #333;
                box-shadow: inset 0 0 25px rgba(0,0,0,1);
                touch-action: none;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            /* L'EFFET DE DÉFORMATION DU SOUFFLET */
            .bellows-glow {
                position: absolute;
                width: 100%; height: 100%;
                background: radial-gradient(circle at center, rgba(3, 169, 244, 0.15) 0%, transparent 60%);
                pointer-events: none;
                transition: transform 0.1s ease-out;
            }
            /* LE POMMEAU CONCAVE BLEU */
            .handle {
                width: 82px;
                height: 82px;
                border-radius: 50%;
                position: absolute;
                cursor: grab;
                background: radial-gradient(circle at 50% 15%, #03a9f4 0%, #0288d1 60%, #01579b 100%);
                box-shadow: 
                    0 15px 30px rgba(0,0,0,0.8),
                    inset 0 10px 15px rgba(0,0,0,0.5),
                    inset 0 -5px 10px rgba(255,255,255,0.2);
                z-index: 10;
                touch-action: none;
            }
            .handle:active {
                cursor: grabbing;
            }
        `;
    }

    render() {
        // On calcule un léger décalage du fond pour simuler le mouvement du soufflet
        const moveX = (this.x / this.maxDistance) * 15;
        const moveY = (this.y / this.maxDistance) * 15;

        return html`
            <ha-card .header=${this.config.title}>
                <div class="card-content">
                    <div id="joystick-base" class="base">
                        <div class="bellows-glow" style="transform: translate(${moveX}px, ${moveY}px);"></div>
                        <div id="joystick-handle" class="handle" 
                             style="transform: translate(${this.x}px, ${this.y}px);">
                        </div>
                    </div>
                </div>
            </ha-card>
        `;
    }

    firstUpdated() {
        this.baseElement = this.shadowRoot.querySelector('#joystick-base');
        this.handleElement = this.shadowRoot.querySelector('#joystick-handle');
        this._addListeners();
    }

    _addListeners() {
        const h = this.handleElement;
        h.addEventListener('mousedown', (e) => this.onStart(e));
        h.addEventListener('touchstart', (e) => this.onStart(e), {passive: false});
        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('touchmove', (e) => this.onMove(e), {passive: false});
        document.addEventListener('mouseup', () => this.onEnd());
        document.addEventListener('touchend', () => this.onEnd());
    }

    onStart(e) {
        e.preventDefault();
        this.isDragging = true;
        this.handleElement.style.transition = 'none';
    }

    onEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.handleElement.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        this.x = 0;
        this.y = 0;
        // Arrêt immédiat (sans délais)
        this.sendCommands(0, true);
    }

    onMove(e) {
        if (!this.isDragging) return;
        const rect = this.baseElement.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let dx = clientX - (rect.left + rect.width / 2);
        let dy = clientY - (rect.top + rect.height / 2);

        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > this.maxDistance) {
            dx *= this.maxDistance / dist;
            dy *= this.maxDistance / dist;
        }

        this.x = dx;
        this.y = dy;

        // RÉDUCTION DU LAG : On limite l'envoi à toutes les 60ms
        const now = Date.now();
        if (now - this.lastSend > 60) {
            const speedPerc = Math.round((-this.y / this.maxDistance) * 100);
            this.sendCommands(speedPerc);
            this.lastSend = now;
        }
    }

    sendCommands(speedPerc, priority = false) {
        if (!this.hass) return;

        let finalSpeed = 0;
        if (Math.abs(speedPerc) > 5) {
            // Courbe de puissance identique à ta version 1.9.0
            finalSpeed = 35 + (Math.abs(speedPerc) * 0.65);
            if (speedPerc < 0) finalSpeed = -finalSpeed;
        }
        if (speedPerc === 0) finalSpeed = 0;

        // Envoi simultané aux deux moteurs
        const val = Math.round(finalSpeed);
        const entities = ['number.vitesse_moteur_gauche', 'number.vitesse_moteur_droit'];
        
        entities.forEach(ent => {
            this.hass.callService('number', 'set_value', {
                entity_id: ent,
                value: val
            });
        });
    }
}

customElements.define('joystick-rover-card', JoystickRoverCard);
