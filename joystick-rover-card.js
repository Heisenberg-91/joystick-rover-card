// =========================================================================
// V1.5.0 - Propulsion Radiale, Contrainte de Bille & Alignement Gauche
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
        this.handleRadius = 36;  
        // La distance max est le rayon de la base MOINS le rayon de la bille
        this.maxDistance = this.baseRadius - this.handleRadius; 
        
        this.x = 0;
        this.y = 0;
        this.isDragging = false;
        this.config = {};
    }

    static get styles() {
        return css`
            .card-content {
                padding: 16px;
                display: flex;
                justify-content: flex-start; /* Aligne le joystick à gauche */
            }
            .base {
                width: 160px; /* baseRadius * 2 */
                height: 160px;
                border-radius: 50%;
                background: var(--ha-card-background, #d3d3d3);
                position: relative;
                box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.2);
                border: 2px solid #555;
            }
            .handle {
                width: 72px; /* handleRadius * 2 */
                height: 72px;
                border-radius: 50%;
                background: #f0f0f0;
                position: absolute;
                top: 50%;
                left: 50%;
                /* Le point d'ancrage est le centre de la bille */
                margin-top: -36px;
                margin-left: -36px;
                cursor: grab;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                z-index: 10;
                touch-action: none;
            }
        `;
    }

    render() {
        const title = this.config.title || "Contrôle Propulsion";
        return html`
            <ha-card .header=${title}>
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
        
        // --- Calcul de la distance réelle ---
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY); 
        
        // --- Contrainte : La bille reste à l'intérieur ---
        if (distance > this.maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = this.maxDistance * Math.cos(angle);
            deltaY = this.maxDistance * Math.sin(angle);
        }

        this.x = deltaX;
        this.y = deltaY;

        // --- Calcul de la vitesse basé sur la DISTANCE ---
        // On normalise la distance de 0 à 100%
        const normalizedDistance = (Math.sqrt(this.x**2 + this.y**2) / this.maxDistance) * 100;
        
        let finalSpeed = 0;

        if (normalizedDistance > 5) { // Zone morte de 5%
            // Vitesse mini 35%, rampe de 65% (35 + 65 = 100)
            finalSpeed = 35 + (normalizedDistance * 0.65);
            
            // Sens de marche : Si Y est en haut, positif. Si Y est en bas, négatif.
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
