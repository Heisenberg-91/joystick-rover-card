// =========================================================================
// V2.0.0 - Design Industriel : Soufflet Caoutchouc & Bouton Concave
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
        this.handleRadius = 41;  
        this.maxDistance = this.baseRadius - this.handleRadius; 
        this.x = 0;
        this.y = 0;
        this.isDragging = false;
        this._hass = null;
    }

    setConfig(config) {
        this.config = config;
    }

    set hass(hass) {
        this._hass = hass;
    }

    static get styles() {
        return css`
            :host {
                display: block;
            }
            ha-card {
                background: none;
                box-shadow: none;
                border: none;
            }
            .card-content {
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            /* DESIGN SOUFFLET (Base du Joystick) */
            .base {
                width: 160px; 
                height: 160px;
                border-radius: 50%;
                position: relative;
                border: 4px solid #222;
                background: 
                    /* Effet de texture anneaux concentriques (soufflet) */
                    repeating-radial-gradient(
                        circle at 50% 50%,
                        #1a1a1a 0px,
                        #1a1a1a 8px,
                        #222222 10px,
                        #0a0a0a 12px
                    );
                /* Ombre pour creuser la base dans la carte */
                box-shadow: 
                    inset 0 10px 30px rgba(0, 0, 0, 1.0),
                    0 4px 10px rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: none;
            }
            /* DESIGN BOUTON CONCAVE (Le Handle) */
            .handle {
                width: 82px;
                height: 82px;
                border-radius: 50%;
                position: absolute;
                cursor: grab;
                /* Dégradé radial pour l'effet de creux éclairé */
                background: radial-gradient(circle at 50% 10%, #05c3ff 0%, #03a9f4 50%, #0288d1 100%);
                /* Mix d'ombres externes pour le relief et internes pour la forme concave */
                box-shadow: 
                    0 15px 35px rgba(0, 0, 0, 0.8),         /* Ombre portée sur le soufflet */
                    inset 0 12px 15px rgba(0, 0, 0, 0.5),    /* Creux supérieur */
                    inset 0 -6px 10px rgba(255, 255, 255, 0.3); /* Reflet inférieur */
                z-index: 10;
                touch-action: none;
                border: 1px solid rgba(0,0,0,0.3);
            }
            .handle:active {
                cursor: grabbing;
                box-shadow: 
                    0 5px 15px rgba(0, 0, 0, 0.8),
                    inset 0 18px 20px rgba(0, 0, 0, 0.6); /* Accentue l'enfoncement */
            }
        `;
    }

    render() {
        return html`
            <ha-card .header=${this.config.title}>
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
        
        // Souris
        this.handleElement.addEventListener('mousedown', this.onStart.bind(this));
        document.addEventListener('mouseup', this.onEnd.bind(this));
        document.addEventListener('mousemove', this.onMove.bind(this));
        
        // Tactile
        this.handleElement.addEventListener('touchstart', this.onStart.bind(this), { passive: false });
        document.addEventListener('touchend', this.onEnd.bind(this));
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
        // Retour doux au centre
        this.handleElement.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        this.x = 0;
        this.y = 0;
        this.sendCommands(0);
    }
    
    onMove(e) {
        if (!this.isDragging || !this.baseElement)
