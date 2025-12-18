import {
    LitElement,
    html,
    css
} from 'https://unpkg.com/lit@2.7.4/index.js?module';

class JoystickRoverCard extends LitElement {
    static get properties() {
        return {
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
        this.lastSend = 0; // Pour le contrôle de fréquence
    }

    static get styles() {
        return css`
            .card-content {
                padding: 30px;
                display: flex;
                justify-content: center;
                background: #111; /* Fond noir profond style cockpit */
                border-radius: 12px;
            }
            /* BASE AVEC EFFET SOUFFLET RÉALISTE */
            .base {
                width: 160px; height: 160px;
                border-radius: 50%;
                position: relative;
                background: #000;
                /* Les anneaux du soufflet */
                background-image: repeating-radial-gradient(
                    circle at center,
                    #222 0px, #222 10px,
                    #000 12px, #111 15px
                );
                border: 4px solid #333;
                box-shadow: inset 0 0 30px rgba(0,0,0,1);
                overflow: hidden;
            }
            /* EFFET DE PROFONDEUR DU SOUFFLET (Se déplace avec le joystick) */
            .soufflet-glow {
                position: absolute;
                width: 100%; height: 100%;
                background: radial-gradient(circle at center, rgba(2, 136, 209, 0.2) 0%, transparent 70%);
                pointer-events: none;
            }
            /* LE POMMEAU CONCAVE */
            .handle {
                width: 82px; height: 82px;
                border-radius: 50%;
                position: absolute;
                top: 50%; left: 50%;
                margin: -41px 0 0 -41px;
                cursor: grab;
                background: radial-gradient(circle at 50% 20%, #03a9f4 0%, #0288d1 70%, #01579b 100%);
                box-shadow: 
                    0 15px 30px rgba(0,0,0,0.8),
                    inset 0 10px 15px rgba(0,0,0,0.5),
                    inset 0 -5px 10px rgba(255,255,255,0.2);
                z-index: 10;
                touch-action: none;
            }
        `;
    }

    render() {
        // On calcule l'ombre du soufflet pour qu'elle suive le bouton
        const shadowX = (this.x / this.maxDistance) * 20;
        const shadowY = (this.y / this.maxDistance) * 20;

        return html`
            <ha-card .header=${this.config.title}>
                <div class="card-content">
                    <div id="joystick-base" class="base">
                        <div class="soufflet-glow" style="transform: translate(${shadowX}px, ${shadowY}px);"></div>
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
        this._setupEvents();
    }

    _setupEvents() {
        const handle = this.handleElement;
        handle.addEventListener('mousedown', (e) => this.onStart(e));
        handle.addEventListener('touchstart', (e) => this.onStart(e), {passive: false});
        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('touchmove', (e) => this.onMove(e), {passive: false});
        document.addEventListener('mouseup', () => this.onEnd());
        document.addEventListener('touchend', () => this.onEnd());
    }

    onStart(e) {
        this.isDragging = true;
        this.handleElement.style.transition = 'none';
    }

    onEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.handleElement.style.transition = 'transform 0.15s ease-out';
        this.x = 0;
        this.y = 0;
        
        // PRIORITÉ ABSOLUE : Arrêt immédiat
        this.sendCommands(0, true); 
    }

    onMove(e) {
        if (!this.isDragging) return;
        const rect = this.baseElement.getBoundingClientRect();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        let dx = clientX - (rect.left + rect.width / 2);
        let dy = clientY - (rect.top + rect.height / 2);

        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > this.maxDistance) {
            dx *= this.maxDistance / dist;
            dy *= this.maxDistance / dist;
        }

        this.x = dx;
        this.y = dy;

        // On limite l'envoi à toutes les 50ms pour ne pas saturer l'ESP32
        const now = Date.now();
        if (now - this.lastSend > 50) {
            const speed = Math.round((-this.y / this.maxDistance) * 100);
            this.sendCommands(speed);
            this.lastSend = now;
        }
    }

    sendCommands(speed, priority = false) {
        if (!this._hass) return;

        // Calcul de la vitesse réelle (comme ton code 1.9.0)
        let finalSpeed = 0;
        if (Math.abs(speed) > 5) {
            finalSpeed = 35 + (Math.abs(speed) * 0.65);
            if (speed < 0) finalSpeed = -finalSpeed;
        }
        if (speed === 0) finalSpeed = 0;

        // Envoi aux deux moteurs
        const targets = ['number.vitesse_moteur_gauche', 'number.vitesse_moteur_droit'];
        targets.forEach(entity => {
            this._hass.callService('number', 'set_value', {
                entity_id: entity,
                value: Math.round(finalSpeed)
            });
        });
    }

    set hass(hass) { this._hass = hass; }
}
customElements.define('joystick-rover-card', JoystickRoverCard);
