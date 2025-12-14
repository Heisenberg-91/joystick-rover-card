// =========================================================================
// V1.0.8 - Revert à l'importation externe avec un CDN fiable (unpkg)
// =========================================================================

// --- Importation critique : Utilisation de UNPKG (plus stable) ---
import {
    LitElement,
    html,
    css
} from 'https://unpkg.com/lit@2.7.4/index.js?module'; 

// --- DÉBUT DE LA CLASSE DE LA CARTE ---

// Nous héritons de la classe LitElement importée du CDN
class JoystickRoverCard extends LitElement {

    // 1. Déclaration des propriétés
    static get properties() {
        return {
            config: { type: Object },
            x: { type: Number },
            y: { type: Number },
        };
    }

    // 2. Initialisation
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

    // 3. Définition des Styles (CSS)
    static get styles() {
        return css`
            .base {
                width: 200px;
                height: 200px;
                border-radius: 50%;
                background: var(--ha-card-background, #d3d3d3);
                position: relative;
                margin: 20px auto;
                box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);
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
                transition: box-shadow 0.1s ease-in-out;
            }
            .card-content {
                padding: 16px;
            }
        `;
    }

    // 4. Définition du HTML (Rendu)
    render() {
        const title = this.config.title || "Rover Controller";
        
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
    
    // 5. setConfig - utilise requestUpdate qui est maintenant défini par Lit importé
    setConfig(config) {
        this.config = config;
        this.requestUpdate(); 
    }
    
    // 6. firstUpdated (appelé quand le DOM est prêt)
    firstUpdated() {
        this.baseElement = this.shadowRoot.querySelector('#joystick-base');
        this.handleElement = this.shadowRoot.querySelector('#joystick-handle');
        this.addEventListeners();
        this.updateHandlePosition();
    }

    // 7. Logique du Joystick
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
        this.handleElement.style.cursor = 'grabbing';
        this.handleElement.style.transition = 'none';
        e.stopPropagation(); 
    }
    
    onEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.handleElement.style.cursor = 'grab';
        
        this.handleElement.style.transition = 'transform 0.3s ease-out';
        this.x = 0;
        this.y = 0;
        this.updateHandlePosition(); 
    }
    
    onMove(e) {
        if (!this.isDragging || !this.baseElement) return;
        
        e.preventDefault();
        
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
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
    }
    
    updateHandlePosition() {
        if (this.handleElement) {
             this.handleElement.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%, -50%)`;
        }
    }

    // Fonctions Lovelace
    set hass(hass) {
        this._hass = hass;
    }
    
    getCardSize() {
        return 5; 
    }
}

customElements.define('joystick-rover-card', JoystickRoverCard);
