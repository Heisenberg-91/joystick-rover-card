// =========================================================================
// V1.6.1 - FIX: setConfig + Design Premium (HA Blue, Concave, Sombre)
// =========================================================================

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
        this.handleRadius = 41;  // +15% de taille
        this.maxDistance = this.baseRadius - this.handleRadius; 
        
        this.x = 0;
        this.y = 0;
        this.isDragging = false;
        this.config = {};
    }

    // --- Configuration requise par Home Assistant ---
    setConfig(config) {
        this.config = config;
    }

    static get styles() {
        return css`
            .card-content {
                padding: 16px;
                display: flex;
                justify-content: flex-start;
            }
            .base {
                width: 160px; 
                height: 160px;
                border-radius: 50%;
                background: radial-gradient(circle, #2c2c2c 0%, #1a1a1a 100%);
                position: relative;
                box-shadow: inset 0 4px 10px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(255, 255, 255, 0.1);
                border: 2px solid #444;
            }
            .handle {
                width: 82px;
                height: 82px;
                border-radius: 50%;
                background: #03a9f4; /* Bleu Home Assistant */
                position: absolute;
                top: 50%;
                left: 50%;
                margin-top: -41px;
                margin-left: -41px;
                cursor: grab;
                /* Effet Concave */
                box-shadow: 
                    0 4px 8px rgba(0, 0, 0, 0.4), 
                    inset 0 -4px 6px rgba(0, 0, 0, 0.3),
                    inset 0 4px 6px rgba(255, 255, 255, 0.3);
                z-index: 10;
                touch-action: none;
            }
            .handle:active {
                box-shadow: 
                    0 2px 4px rgba(0, 0, 0, 0.4), 
                    inset 0 -2px 4px rgba(0, 0, 0, 0.3),
                    inset 0 2px 8px rgba(0, 0, 0, 0.5);
            }
        `;
    }

    render() {
        return html`
            <ha-card .header=${this.config.title || "Rover Command"}>
                <div class="card-content">
                    <div id="joystick-base" class="base">
                        <div 
                            id="joystick-handle" 
                            class="handle"
                            style="transform: translate(${this.x}px, ${this.y}px);"
                        ></div>
                    </div>
                </div>
            </ha-card>
        `;
    }
    
    firstUpdated() {
        this.baseElement = this.shadowRoot.querySelector('#joystick-base');
        this.handleElement = this.shadowRoot.querySelector('#joystick-handle');
        this.addEventListeners();
    }

    addEventListeners() {
        if (!this.handleElement) return;
        this.handleElement.addEventListener('mousedown', this.onStart.bind(this));
        this.handleElement.addEventListener('touchstart', this.onStart.bind(this));
        document.addEventListener('mouseup', this.onEnd.bind(this));
        document.addEventListener('touchend', this.onEnd.bind(this));
        document.addEventListener('mousemove', this.onMove.bind(this));
        document.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
    }
    
    onStart(e) {
        e.preventDefault();
        this.isDragging = true; 
        this.handleElement.style.transition = 'none';
    }
    
    onEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.handleElement.style.transition = 'transform 0.2s ease-out';
        this.x = 0;
        this.y = 0;
        this.sendCommands(0);
    }
    
    onMove(e) {
        if (!this.isDragging || !this.baseElement) return;
        e.preventDefault();
        
        const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        
        const baseRect = this.baseElement.getBoundingClientRect();
        const centerX = baseRect.left + this.baseRadius;
        const centerY = baseRect.top + this.baseRadius;
        
        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY); 
        
        if (distance > this.maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = this.maxDistance * Math.cos(angle);
            deltaY = this.maxDistance * Math.sin(angle);
        }

        this.x = deltaX;
        this.y = deltaY;

        const normalizedDistance = (Math.sqrt(this.x**2 + this.y**2) / this.maxDistance) * 100;
        let finalSpeed = 0;

        if (normalizedDistance > 5) {
            finalSpeed = 35 + (normalizedDistance * 0.65);
            if (this.y > 0) finalSpeed = -finalSpeed; 
        }

        this.sendCommands(Math.round(finalSpeed));
    }
    
    sendCommands(speed) {
        if (!this._hass) return;
        this._hass.callService('number', 'set_value', {
            entity_id: 'number.vitesse_moteur_gauche',
            value: speed
        });
        this._hass.callService('number', 'set_value', {
            entity_id: 'number.vitesse_moteur_droit',
            value: speed
        });
    }

    set hass(hass) {
        this._hass = hass;
    }
}

customElements.define('joystick-rover-card', JoystickRoverCard);
