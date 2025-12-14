// --- Changement critique : Importation forcée de LitElement depuis un CDN stable ---
// Ceci contourne le problème de chargement interne de Home Assistant.
import {
    LitElement,
    html,
    css
} from 'https://cdn.jsdelivr.net/gh/lit/dist@2.7.4/index.js';

// Si l'importation ci-dessus échoue, essayez cette alternative (décommenter la ligne et commenter la précédente) :
// import { LitElement, html, css } from 'https://unpkg.com/lit@2.7.4/index.js?module';


class JoystickRoverCard extends LitElement {

    // 1. Déclaration des propriétés (variables réactives)
    static get properties() {
        return {
            config: {
                type: Object
            },
            x: {
                type: Number
            },
            y: {
                type: Number
            },
            // On peut ajouter isDragging pour l'état visuel si besoin, mais style suffit
        };
    }

    // 2. Initialisation des variables
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
            /* Les styles sont bien définis */
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
                /* Le translate(-50%, -50%) centré est géré par la propriété LitElement this.x/this.y */
                transform: translate(-50%, -50%); 
                cursor: grab;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.5);
                transition: box-shadow 0.1s ease-in-out;
            }
            /* Style pour encapsuler dans la carte Home Assistant */
            .card-content {
                padding: 16px;
            }
        `;
    }

    // 4. Définition du HTML (Rendu)
    render() {
        const title = this.config.title || "Rover Controller";
        
        // Nous incluons <ha-card> pour être sûr d'avoir un conteneur visible
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
    
    // 5. setConfig (LitElement le rend réactif)
    setConfig(config) {
        this.config = config;
        this.requestUpdate(); 
    }
    
    // 6. firstUpdated (appelé quand le DOM est prêt)
    firstUpdated() {
        // Sélection dans le Shadow Root de LitElement
        this.baseElement = this.shadowRoot.querySelector('#joystick-base');
        this.handleElement = this.shadowRoot.querySelector('#joystick-handle');
        this.addEventListeners();
        
        // Forcer la mise à jour initiale du style du handle
        this.updateHandlePosition();
    }

    // 7. Logique du Joystick (Inchacée)
    
    addEventListeners() {
        // S'assurer que les écouteurs d'événements sont ajoutés à l'élément de la poignée.
        if (!this.handleElement) return;

        this.handleElement.addEventListener('mousedown', this.onStart.bind(this));
        this.handleElement.addEventListener('touchstart', this.onStart.bind(this));
        
        // Les écouteurs onEnd/onMove doivent être sur le document entier
        document.addEventListener('mouseup', this.onEnd.bind(this));
        document.addEventListener('touchend', this.onEnd.bind(this));
        document.addEventListener('mousemove', this.onMove.bind(this));
        document.addEventListener('touchmove', this.onMove.bind(this), { passive: false }); // Passive: false pour preventDefault
    }
    
    onStart(e) {
        e.preventDefault();
        this.isDragging = true; 
        this.handleElement.style.cursor = 'grabbing';
        this.handleElement.style.transition = 'none';
        
        // Empêcher Lovelace de défiler ou de manipuler l'événement
        e.stopPropagation(); 
    }
    
    onEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.handleElement.style.cursor = 'grab';
        
        // Retour du handle au centre avec transition
        this.handleElement.style.transition = 'transform 0.3s ease-out';
        this.x = 0;
        this.y = 0;
        this.updateHandlePosition(); 

        // Retirer les écouteurs de document qui sont ré-ajoutés au onStart pour éviter la duplication
        // Note: Dans cette structure, nous laissons les écouteurs sur le document, mais onEnd ne fait rien s'il n'y a pas de drag.
        // Laisser les document event listeners actifs est souvent plus simple.
    }
    
    onMove(e) {
        if (!this.isDragging || !this.baseElement) return;
        
        e.preventDefault(); // Empêche le défilement pendant le drag
        
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
        
        // --- TODO : AJOUTER ICI LA LOGIQUE D'APPEL À HOME ASSISTANT ---
        // Ex: const speed = Math.round((distance / this.maxDistance) * 100);
        // Ex: const angle_deg = Math.round(Math.atan2(-deltaY, deltaX) * 180 / Math.PI);
        // Ex: this._hass.callService('mqtt', 'publish', { topic: 'rover/command', payload: JSON.stringify({ speed, angle_deg }) });
    }
    
    updateHandlePosition() {
        // Mise à jour directe du style (plus fluide pour le drag)
        if (this.handleElement) {
             this.handleElement.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%, -50%)`;
        }
    }

    // Fonctions Lovelace (Inchagées)
    set hass(hass) {
        this._hass = hass;
    }
    
    getCardSize() {
        return 5; 
    }
}

customElements.define('joystick-rover-card', JoystickRoverCard);
