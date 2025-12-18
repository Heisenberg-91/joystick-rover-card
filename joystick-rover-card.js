// =========================================================================
// V1.3.0 - Mode Propulsion Synchronisée + Direction par Servo
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
        this.baseRadius = 100;
        this.handleRadius = 30;
        this.maxDistance = this.baseRadius - this.handleRadius; 
        this.x = 0;
        this.y = 0;
        this.isDragging = false;
        this.config = {};
    }

    static get styles() {
        return css`
            .base {
                width: 200px;
                height: 200px;
                border-radius: 50%;
                background: var(--ha-card-background, #d3d3d3);
                position: relative;
                margin: 20px auto;
                box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.2);
            }
            .handle {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: #f0f0f0;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%); 
                cursor: grab;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.5);
            }
            .card-content {
                padding: 16px;
                text-align: center;
            }
        `;
    }

    render() {
        const title = this.config.title || "Rover Heisenberg";
        return html`
            <ha-card .header=${title}>
                <div class="card-content">
                    <div id="joystick-base" class="base">
                        <div 
                            id="joystick-handle" 
                            class="handle"
                            style="transform: translate(${this.x}px, ${this.y}px) translate(-50%, -50%);"
                        ></div>
                    </div>
                </div>
            </ha-card>
        `;
    }
    
    setConfig(config) {
        this.config = config;
        this.requestUpdate(); 
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
    }
    
    onEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.x = 0;
        this.y = 0;
        this.updateHandlePosition();
        
        // Tout à zéro au relâchement
        this.sendCommands(0, 0);
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
        this.updateHandlePosition();

        // Calcul de la vitesse (Y) et de la direction (X)
        const speed = Math.round((this.y / this.maxDistance) * -100);
        const steering = Math.round((this.x / this.maxDistance) * 100);

        this.sendCommands(speed, steering);
    }
    
    updateHandlePosition() {
        if (this.handleElement) {
             this.handleElement.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%, -50%)`;
        }
    }

    sendCommands(speed, steering) {
        if (!this._hass) return;
        
        // On envoie la MÊME vitesse aux deux moteurs arrière
        this._hass.callService('number', 'set_value', {
            entity_id: 'number.vitesse_moteur_gauche',
            value: speed
        });
        
        this._hass.callService('number', 'set_value', {
            entity_id: 'number.vitesse_moteur_droit',
            value: speed
        });

        // On envoie l'angle au servomoteur
        this._hass.callService('number', 'set_value', {
            entity_id: 'number.direction_rover', // Vérifie bien cet ID dans HA
            value: steering
        });
    }

    set hass(hass) {
        this._hass = hass;
    }
}

customElements.define('joystick-rover-card', JoystickRoverCard);
