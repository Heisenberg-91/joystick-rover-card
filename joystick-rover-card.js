// Fonction asynchrone pour s'assurer que les helpers LitElement sont chargés par HA
async function loadCardDependencies() {
    // Si window.loadCardHelpers existe, on l'appelle pour charger LitElement et les autres helpers
    if (typeof window.loadCardHelpers === 'function') {
        await window.loadCardHelpers();
    }
    // Une fois chargés, 'LitElement', 'html', et 'css' sont disponibles globalement
    // L'objet LitElement est souvent disponible sous window.LitElement
    return { 
        LitElement: window.LitElement, 
        html: window.html, 
        css: window.css 
    };
}

class JoystickRoverCard extends HTMLElement {
    
    constructor() {
        super();
        this.litInitialized = false;
        
        // Initialisation de la configuration et des variables du joystick
        this.config = {};
        this.baseRadius = 100;
        this.handleRadius = 30;
        this.maxDistance = this.baseRadius - this.handleRadius; 
        this.x = 0;
        this.y = 0;
        this.isDragging = false;
        
        // Chargement asynchrone des dépendances
        this.initializeLit();
    }
    
    // SetConfig est la première méthode appelée par Lovelace
    setConfig(config) {
        this.config = config;
        // Si le LitElement est déjà prêt, on force le rendu.
        if (this.litInitialized) {
            this.requestUpdate(); 
        }
    }
    
    // Fonction d'initialisation asynchrone qui corrige l'héritage
    async initializeLit() {
        const { LitElement, html, css } = await loadCardDependencies();

        // Si l'objet LitElement n'est toujours pas disponible, nous ne pouvons pas continuer.
        if (!LitElement) {
             console.error("JoystickRoverCard: LitElement n'a pas pu être chargé par Home Assistant.");
             return;
        }

        // --- Le Fix : Redéfinition de la classe pour hériter de LitElement ---
        Object.setPrototypeOf(JoystickRoverCard.prototype, LitElement.prototype);
        
        // --- Redéfinition des méthodes de LitElement (Styles et Render) ---
        
        // Styles
        this.constructor.styles = css`
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
        `;
        
        // Rendu
        this.render = function() {
            const title = this.config.title || "Rover Controller";
            
            return html`
                <ha-card .header=${title}>
                    <div id="joystick-base" class="base">
                        <div 
                            id="joystick-handle" 
                            class="handle"
                            style="transform: translate(${this.x}px, ${this.y}px) translate(-50%, -50%);"
                        ></div>
                    </div>
                </ha-card>
            `;
        };
        
        // --- Redéfinition du cycle de vie LitElement ---
        this.firstUpdated = function() {
            this.baseElement = this.shadowRoot.querySelector('#joystick-base');
            this.handleElement = this.shadowRoot.querySelector('#joystick-handle');
            this.addEventListeners();
        };

        // Finalisation
        this.litInitialized = true;
        this.requestUpdate(); // Force LitElement à s'afficher maintenant que la classe est corrigée
    }

    // --- Fonctions du cycle de vie HA ---
    set hass(hass) {
        this._hass = hass;
    }
    
    getCardSize() {
        return 5; 
    }

    // --- Logique du Joystick (reste inchangée et est essentielle) ---
    
    addEventListeners() {
        if (!this.handleElement) return;
        this.handleElement.addEventListener('mousedown', this.onStart.bind(this));
        this.handleElement.addEventListener('touchstart', this.onStart.bind(this));
        document.addEventListener('mouseup', this.onEnd.bind(this));
        document.addEventListener('touchend', this.onEnd.bind(this));
    }
    
    onStart(e) {
        e.preventDefault();
        this.isDragging = true; 
        this.handleElement.style.cursor = 'grabbing';
        document.addEventListener('mousemove', this.onMove.bind(this));
        document.addEventListener('touchmove', this.onMove.bind(this));
        this.handleElement.style.transition = 'none';
    }
    
    onEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.handleElement.style.cursor = 'grab';
        document.removeEventListener('mousemove', this.onMove.bind(this));
        document.removeEventListener('touchmove', this.onMove.bind(this));
        this.handleElement.style.transition = 'transform 0.3s ease-out';
        this.x = 0;
        this.y = 0;
        this.updateHandlePosition(); 
    }
    
    onMove(e) {
        if (!this.isDragging || !this.baseElement) return;
        
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
}

customElements.define('joystick-rover-card', JoystickRoverCard);
