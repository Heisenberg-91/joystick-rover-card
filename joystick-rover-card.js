class JoystickRoverCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' }); 
        
        // Définition de la taille du rayon de la base pour le calcul futur (en pixels)
        // La base (container) sera de 200px. Son rayon est 100px.
        this.baseRadius = 100;
        
        // La bille/manche (handle) fait 60px. Son rayon est 30px.
        this.handleRadius = 30;
        
        // Limite maximale de déplacement du centre du handle (100px - 30px)
        this.maxDistance = this.baseRadius - this.handleRadius; 
        
        // Ajout des éléments au Shadow DOM
        this.shadowRoot.innerHTML = `
            <style>
                .base {
                    width: 200px;
                    height: 200px;
                    border-radius: 50%;
                    background: var(--ha-card-background, #d3d3d3); /* Cercle de base gris clair */
                    position: relative;
                    margin: 20px auto; /* Centrage dans la carte */
                    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2); /* Effet d'enfoncement */
                }
                
                .handle {
                    width: 60px; /* 30% de 200px est environ 60px */
                    height: 60px;
                    border-radius: 50%;
                    background: #f0f0f0; /* Blanc */
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%); /* Centrage parfait initial */
                    cursor: grab;
                    /* Effet "concave" ou 3D */
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.5);
                    transition: box-shadow 0.1s ease-in-out; /* Pour un feedback visuel */
                }
                
                ha-card {
                    padding: 16px;
                    text-align: center;
                }
            </style>
            <ha-card>
                <div id="joystick-base" class="base">
                    <div id="joystick-handle" class="handle"></div>
                </div>
            </ha-card>
        `;
        
        // Références aux éléments
        this.baseElement = this.shadowRoot.getElementById('joystick-base');
        this.handleElement = this.shadowRoot.getElementById('joystick-handle');
        
        // Initialisation de la position
        this.x = 0;
        this.y = 0;
        
        // Ajout des écouteurs d'événements pour le déplacement
        this.addEventListeners();
    }
    
    // ... (setConfig, set hass, getCardSize restent inchangés pour l'instant) ...

    /**
     * Ajoute les écouteurs d'événements pour les interactions tactiles/souris
     */
    addEventListeners() {
        // Événement déclencheur (appui de souris ou début de toucher)
        this.handleElement.addEventListener('mousedown', this.onStart.bind(this));
        this.handleElement.addEventListener('touchstart', this.onStart.bind(this));
        
        // Événement de fin (relâchement de souris ou fin de toucher)
        document.addEventListener('mouseup', this.onEnd.bind(this));
        document.addEventListener('touchend', this.onEnd.bind(this));
    }
    
    /**
     * Démarrage du déplacement
     */
    onStart(e) {
        e.preventDefault();
        
        // Marque le handle comme actif pour le déplacement
        this.isDragging = true; 
        this.handleElement.style.cursor = 'grabbing';
        
        // Ajout des écouteurs de mouvement seulement quand on drague
        document.addEventListener('mousemove', this.onMove.bind(this));
        document.addEventListener('touchmove', this.onMove.bind(this));
    }
    
    /**
     * Fin du déplacement
     */
    onEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.handleElement.style.cursor = 'grab';
        
        // Suppression des écouteurs de mouvement
        document.removeEventListener('mousemove', this.onMove.bind(this));
        document.removeEventListener('touchmove', this.onMove.bind(this));
        
        // Retour du handle au centre de manière douce
        this.handleElement.style.transition = 'transform 0.3s ease-out';
        this.x = 0;
        this.y = 0;
        this.updateHandlePosition();
        
        // Optionnel: Envoyer la commande d'arrêt au Rover ici
    }
    
    /**
     * Déplacement du handle
     */
    onMove(e) {
        if (!this.isDragging) return;
        
        // Réinitialisation de la transition pour un mouvement immédiat
        this.handleElement.style.transition = 'none';

        // Gérer les coordonnées de l'événement (souris ou doigt)
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        // Obtenir la position de la base
        const baseRect = this.baseElement.getBoundingClientRect();
        
        // Calcul du centre de la base
        const centerX = baseRect.left + this.baseRadius;
        const centerY = baseRect.top + this.baseRadius;
        
        // Calcul de la distance relative (delta) par rapport au centre
        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;
        
        // Calcul de la distance totale (Pythagore : d = sqrt(x² + y²))
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // --- Limitation du Mouvement ---
        if (distance > this.maxDistance) {
            // Si la distance est trop grande, nous recalculons les deltas pour les ramener à la limite
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = this.maxDistance * Math.cos(angle);
            deltaY = this.maxDistance * Math.sin(angle);
        }

        this.x = deltaX;
        this.y = deltaY;

        this.updateHandlePosition();
        
        // Optionnel: Envoyer la commande de mouvement au Rover ici
    }
    
    /**
     * Applique les coordonnées (x, y) au style de la bille
     */
    updateHandlePosition() {
        this.handleElement.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%, -50%)`;
        
        // Console pour vérifier les valeurs (à retirer en prod)
        // console.log(`X: ${this.x.toFixed(1)}, Y: ${this.y.toFixed(1)}`);
    }

    // ... (Le reste du code reste inchangé) ...

    getCardSize() {
        return 5; 
    }
}

customElements.define('joystick-rover-card', JoystickRoverCard);
