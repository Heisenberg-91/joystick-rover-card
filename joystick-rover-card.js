// --- Changement crucial : Vérification de la disponibilité des dépendances globales ---
// Le navigateur n'arrive pas à résoudre 'lit', donc nous utilisons le LitElement global exposé par HA.

// Function pour charger LitElement globalement si ce n'est pas déjà fait.
// Fonction asynchrone pour ne pas bloquer le chargement
async function loadLit() {
  if (window.LitElement) return window.LitElement;
  
  // Utilise l'importation dynamique pour forcer la disponibilité des dépendances HA
  await window.loadCardHelpers();
  
  // Après l'attente, LitElement devrait être disponible
  return window.LitElement;
}

// Classe principale. Nous étendons temporairement HTMLElement, puis nous la mettrons à jour une fois LitElement chargé.
class JoystickRoverCard extends HTMLElement {
    
    // Le constructeur est maintenant responsable de charger LitElement
    constructor() {
        super();
        
        // Initialisation de la configuration à vide pour setConfig
        this.config = {};
        
        // Indicateur pour le rendu
        this.litLoaded = false;
        
        // Initialisation des variables pour le joystick (mêmes valeurs que précédemment)
        this.baseRadius = 100;
        this.handleRadius = 30;
        this.maxDistance = this.baseRadius - this.handleRadius; 
        this.x = 0;
        this.y = 0;
        this.isDragging = false;
        
        // Appel asynchrone pour charger et mettre à jour la classe
        this.loadAndRender();
    }
    
    // Chargement de LitElement et mise à jour de la classe
    async loadAndRender() {
        // Chargement de LitElement
        const LitElement = await loadLit();
        
        // Récupération des fonctions essentielles
        const { html, css } = LitElement;

        // Mise à jour de la classe pour hériter de LitElement
        Object.setPrototypeOf(JoystickRoverCard.prototype, LitElement.prototype);
        
        // Maintenant, nous pouvons utiliser les propriétés et méthodes LitElement
        
        // Définition des Styles (CSS)
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
                transform: translate(-50%, -50%); /* Position initiale (0,0) */
                cursor: grab;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.5);
                transition: box-shadow 0.1s ease-in-out;
            }
        `;
        
        // Définition de la fonction de rendu (HTML)
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
        
        // Forcer le premier rendu après la mise à jour de la classe
        this.requestUpdate(); 
        this.litLoaded = true;
    }
    
    // setConfig : Fonction essentielle reconnue par Lovelace
    setConfig(config) {
        this.config = config;
        // Met à jour le rendu si LitElement est déjà chargé
        if (this.litLoaded) {
            this.requestUpdate();
        }
    }
    
    // firstUpdated : Appelé après le premier rendu de LitElement
    firstUpdated() {
        this.baseElement = this.shadowRoot.getElementById('joystick-base');
        this.handleElement = this.shadowRoot.getElementById('joystick-handle');
        this.addEventListeners();
    }

    // Le reste de la logique du Joystick (non Lit-specific)
    
    addEventListeners() {
        if (!this.handleElement) return;

        this.handleElement.addEventListener('mousedown', this.onStart.bind(this));
        this.handleElement.addEventListener('touchstart', this.onStart.bind(this));
        
        document.addEventListener('mouseup', this.onEnd.bind(this));
        document.addEventListener('touchend', this.onEnd.bind(this));
    }
    
    onStart(e) {
        // ... (Logique onStart identique à celle que nous avons ajoutée) ...
        e.preventDefault();
        this.isDragging = true; 
        this.handleElement.style.cursor = 'grabbing';
        document.addEventListener('mousemove', this.onMove.bind(this));
        document.addEventListener('touchmove', this.onMove.bind(this));
    }
    
    onEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.handleElement.style.cursor = 'grab';
        
        document.removeEventListener('mousemove', this.onMove.bind(this));
        document.removeEventListener('touchmove', this.onMove.bind(this));
        
        // Retour du handle au centre
        this.handleElement.style.transition = 'transform 0.3s ease-out';
        this.x = 0;
        this.y = 0;
        this.updateHandlePosition(); 
    }
    
    onMove(e) {
        if (!this.isDragging || !this.baseElement) return;
        
        this.handleElement.style.transition = 'none';

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        const baseRect = this.baseElement.getBoundingClientRect();
        const centerX = baseRect.left + this.baseRadius;
        const centerY = baseRect.top + this.baseRadius;
        
        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Limitation du Mouvement
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
            // Mise à jour directe du style (plus simple que requestUpdate pour les animations rapides)
             this.handleElement.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%, -50%)`;
        }
    }
    
    set hass(hass) {
        this._hass = hass;
    }

    getCardSize() {
        return 5; 
    }
}

// Enregistrement final.
customElements.define('joystick-rover-card', JoystickRoverCard);
