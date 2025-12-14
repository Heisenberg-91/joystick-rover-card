// --- NOUVELLE LIGNE À AJOUTER : Importation de LitElement (Nécessaire pour le contexte Lovelace)
import { LitElement, html, css } from 'lit'; 

// --- CHANGEMENT DE LA LIGNE D'HÉRITAGE ---
// Remplacer "extends HTMLElement" par "extends LitElement"
class JoystickRoverCard extends LitElement {

    // 1. Initialisation : Le constructeur doit appeler super() en premier.
    constructor() {
        super();
        
        // Les variables sont maintenant des "properties" dans LitElement (c'est plus propre)
        this.baseRadius = 100;
        this.handleRadius = 30;
        this.maxDistance = this.baseRadius - this.handleRadius; 
        
        // Initialisation de la position
        this.x = 0;
        this.y = 0;
        
        // Le HTML/CSS ne va PAS dans le constructor, mais dans la méthode "render" de LitElement
        // Nous retirons donc le this.attachShadow et this.shadowRoot.innerHTML ici.

        // Nous laissons les EventListeners car ils ne dépendent pas du rendu initial de LitElement.
        // this.addEventListeners(); // Nous devons déplacer cette fonction dans le "firstUpdated"
    }

    // --- NOUVELLE STRUCTURE DE CARTE (LitElement) ---

    // 2. Définition des Styles (CSS)
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
            /* Pas besoin de ha-card ici, elle est ajoutée par le render Lovelace */
        `;
    }

    // 3. Définition du HTML (Rendu)
    render() {
        // Le HTML est retourné via la fonction `html` de lit.
        // Les styles sont appliqués automatiquement par LitElement.
        return html`
            <div id="joystick-base" class="base">
                <div 
                    id="joystick-handle" 
                    class="handle" 
                    style="transform: translate(${this.x}px, ${this.y}px) translate(-50%, -50%);"
                ></div>
            </div>
        `;
    }
    
    // 4. setConfig : DOIT ÊTRE PRÉSENT ET FONCTIONNER
    // C'est cette fonction que Lovelace recherche !
    setConfig(config) {
        this._config = config;
        
        // LitElement gère son propre rendu, donc pas besoin de manipuler le DOM ici.
        // On force une mise à jour si besoin, mais ce n'est pas nécessaire pour setConfig.
    }
    
    // 5. firstUpdated : Appelé après le premier rendu (une fois les éléments DOM prêts)
    firstUpdated() {
        // C'est ici que nous récupérons les références DOM et ajoutons les écouteurs.
        this.baseElement = this.shadowRoot.getElementById('joystick-base');
        this.handleElement = this.shadowRoot.getElementById('joystick-handle');
        this.addEventListeners();
    }
    
    // *** La suite du code (addEventListeners, onStart, onEnd, onMove, updateHandlePosition, set hass, getCardSize)
    // *** Reste en place, mais en s'assurant que `updateHandlePosition` utilise `this.handleElement`.

    // ... (Le reste du code, y compris les fonctions onMove, onEnd, etc., doit être réinséré ici) ...
    // Note : la fonction updateHandlePosition doit maintenant utiliser `this.requestUpdate()` après avoir changé `this.x` ou `this.y` pour forcer le `render()`.

    // ... (Pour simplifier, nous allons revenir à la méthode initiale de manipulation du style pour l'instant) ...
    updateHandlePosition() {
        if (this.handleElement) {
             this.handleElement.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%, -50%)`;
        }
    }
    
    // ... (Les autres fonctions onMove, onEnd, etc. sont insérées ici) ...
}

// L'enregistrement reste le même :
customElements.define('joystick-rover-card', JoystickRoverCard);
