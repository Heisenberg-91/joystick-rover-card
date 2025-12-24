// =========================================================================
// V1.8.1 - ALIGNEMENT GAUCHE ET TRANSPARENCE (POUR LIBÉRER LE CENTRE)
// =========================================================================

import {
    LitElement,
    html,
    css
} from 'https://unpkg.com/lit@2.7.4/index.js?module';

class JoystickRoverCard extends LitElement {
    
    setConfig(config) { this.config = config; }

    static get properties() {
        return {
            hass: { type: Object },
            config: { type: Object },
            x: { type: Number },
            y: { type: Number }
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
        this.lastSend = 0;
    }

    static get styles() {
        return css`
            :host { 
                display: block; 
                background: none !important; 
            }
            ha-card { 
                background: none !important; 
                border: none !important; 
                box-shadow: none !important;
                display: flex;
                justify-content: flex-start; /* ALIGNÉ À GAUCHE */
                align-items: center;
            }
            .card-content { 
                padding: 10px 0px 10px 10px; /* Marges : Haut, Droite (0), Bas, Gauche (10) */
                display: flex; 
                justify-content: flex-start; 
                background: none; 
            }
            .base {
                width: 160px; height: 160px; border-radius: 50%; position: relative;
                background: #000; border: 4px solid #333;
                background-image: repeating-radial-gradient(circle, #222 0px, #222 8px, #0a0a0a 10px, #000 12px);
                box-shadow: inset 0 0 25px rgba(0,0,0,1); touch-action: none;
                display: flex; justify-content: center; align-items: center;
            }
            .handle {
                width: 82px; height: 82px; border-radius: 50%; position: absolute;
                background: radial-gradient(circle at 50% 15%, #03a9f4 0%, #0288d1 60%, #01579b 100%);
                box-shadow: 0 15px 30px rgba(0,0,0,0.8), inset 0 10px 15px rgba(0,0,0,0.5);
                z-index: 10; cursor: grab;
            }
        `;
    }

    render() {
        return html`
            <ha-card>
                <div class="card-content">
                    <div id="joystick-base" class="base">
                        <div id="joystick-handle" class="handle" style="transform: translate(${this.x}px, ${this.y}px);"></div>
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
        const start = (e) => { e.preventDefault(); this.isDragging = true; h.style.transition = 'none'; };
        const end = () => { 
            if (!this.isDragging) return; 
            this.isDragging = false;
            h.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            this.x = 0; this.y = 0; 
            this.sendCommands(0, 0);
        };

        const move = (e) => {
            if (!this.isDragging) return;
            const rect = this.baseElement.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            let dx = clientX - (rect.left + rect.width / 2);
            let dy = clientY - (rect.top + rect.height / 2);
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > this.maxDistance) { dx *= this.maxDistance / dist; dy *= this.maxDistance / dist; }
            this.x = dx; this.y = dy;

            const speedPerc = Math.round((-this.y / this.maxDistance) * 100);
            const steerPerc = Math.round((this.x / this.maxDistance) * 100);

            const now = Date.now();
            if (now - this.lastSend > 60) { this.sendCommands(speedPerc, steerPerc); this.lastSend = now; }
        };

        h.addEventListener('mousedown', start); h.addEventListener('touchstart', start);
        document.addEventListener('mousemove', move); document.addEventListener('touchmove', move);
        document.addEventListener('mouseup', end); document.addEventListener('touchend', end);
    }

    sendCommands(speedPerc, steerPerc) {
        if (!this.hass) return;
        let pwr = 0;
        if (Math.abs(speedPerc) > 5) {
            pwr = 35 + (Math.abs(speedPerc) * 0.65);
            if (speedPerc < 0) pwr = -pwr;
        }
        const val = Math.round(pwr);
        const motorEntities = ['number.vitesse_moteur_gauche', 'number.vitesse_moteur_droit'];
        motorEntities.forEach(ent => {
            this.hass.callService('number', 'set_value', { entity_id: ent, value: val });
        });
        this.hass.callService('number', 'set_value', { entity_id: 'number.direction_home_rover', value: steerPerc });
    }
}
customElements.define('joystick-rover-card', JoystickRoverCard);
