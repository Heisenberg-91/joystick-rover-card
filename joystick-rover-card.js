// --- IMPORTATION DES OUTILS ---
// On récupère LitElement qui permet de créer des composants fluides pour Home Assistant
import {
    LitElement,
    html,
    css
} from 'https://unpkg.com/lit@2.7.4/index.js?module';

class JoystickRoverCard extends LitElement {
    
    // --- CONFIGURATION ---
    // Cette fonction reçoit les paramètres YAML de ton tableau de bord
    setConfig(config) {
        this.config = config;
    }

    // On déclare les propriétés qui changent (X et Y pour la position du bouton)
    static get properties() {
        return {
            hass: { type: Object },
            config: { type: Object },
            x: { type: Number },
            y: { type: Number }
        };
    }

    // --- INITIALISATION ---
    constructor() {
        super();
        this.baseRadius = 80;       // Rayon de la base noire (160px / 2)
        this.handleRadius = 41;     // Rayon du bouton bleu (82px / 2)
        this.maxDistance = this.baseRadius - this.handleRadius; // Limite de mouvement
        this.x = 0;
        this.y = 0;
        this.isDragging = false;    // Indique si l'utilisateur est en train de toucher le joystick
        this.lastSend = 0;          // Chronomètre pour éviter d'envoyer trop de messages au Wi-Fi
    }

    // --- DESIGN VISUEL (CSS) ---
    static get styles() {
        return css`
            :host { display: block; }

            .card-content {
                padding: 10px;
                display: flex;
                justify-content: flex-start; /* ALIGNE LE JOYSTICK À GAUCHE */
                background: none;
            }

            /* LA BASE NOIRE (L'effet soufflet) */
            .base {
                width: 160px; height: 160px;
                border-radius: 50%;
                position: relative;
                background: #000;
                /* Anneaux concentriques style caoutchouc industriel */
                background-image: repeating-radial-gradient(
                    circle at center,
                    #222 0px, #222 8px,
                    #0a0a0a 10px, #000 12px
                );
                border: 4px solid #333;
                box-shadow: inset 0 0 25px rgba(0,0,0,1);
                touch-action: none; /* Désactive le scroll de la page quand on touche */
                display: flex;
                justify-content: center;
                align-items: center;
            }

            /* L'EFFET DE DÉFORMATION (Reflet interne qui bouge) */
            .bellows-glow {
                position: absolute;
                width: 100%; height: 100%;
                background: radial-gradient(circle at center, rgba(3, 169, 244, 0.15) 0%, transparent 60%);
                pointer-events: none;
            }

            /* LE BOUTON BLEU (Concave) */
            .handle {
                width: 82px; height: 82px;
                border-radius: 50%;
                position: absolute;
                cursor: grab;
                /* Dégradé pour donner l'effet "creux" */
                background: radial-gradient(circle at 50% 15%, #03a9f4 0%, #0288d1 60%, #01579b 100%);
                box-shadow: 
                    0 15px 30px rgba(0,0,0,0.8),
                    inset 0 10px 15px rgba(0,0,0,0.5),
                    inset 0 -5px 10px rgba(255,255,255,0.2);
                z-index: 10;
                touch-action: none;
            }
        `;
    }

    // --- STRUCTURE HTML ---
    render() {
        // On calcule un léger mouvement pour le reflet du soufflet
        const moveX = (this.x / this.maxDistance) * 15;
        const moveY = (this.y / this.maxDistance) * 15;

        return html`
            <ha-card>
                <div class="card-content">
                    <div id="joystick-base" class="base">
                        <div class="bellows-glow" style="transform: translate(${moveX}px, ${moveY}px);"></div>
                        <div id="joystick-handle" class="handle" 
                             style="transform: translate(${this.x}px, ${this.y}px);">
                        </div>
                    </div>
                </div>
            </ha-card>
        `;
    }

    // --- GESTION DES ÉVÉNEMENTS ---
    firstUpdated() {
        this.baseElement = this.shadowRoot.querySelector('#joystick-base');
        this.handleElement = this.shadowRoot.querySelector('#joystick-handle');
        this._addListeners();
    }

    _addListeners() {
        const h = this.handleElement;
        // Souris
        h.addEventListener('mousedown', (e) => this.onStart(e));
        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('mouseup', () => this.onEnd());
        // Doigt (Mobile/Tablette)
        h.addEventListener('touchstart', (e) => this.onStart(e), {passive: false});
        document.addEventListener('touchmove', (e) => this.onMove(e), {passive: false});
        document.addEventListener('touchend', () => this.onEnd());
    }

    onStart(e) {
        e.preventDefault();
        this.isDragging = true;
        this.handleElement.style.transition = 'none'; // Réactivité instantanée quand on touche
    }

    onEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        // Effet ressort pour revenir au centre
        this.handleElement.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        this.x = 0;
        this.y = 0;
        
        // On envoie immédiatement l'arrêt (Vitesse 0) sans attendre
        this.sendCommands(0);
    }

    onMove(e) {
        if (!this.isDragging) return;
        const rect = this.baseElement.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calcul de la position par rapport au centre de la base
        let dx = clientX - (rect.left + rect.width / 2);
        let dy = clientY - (rect.top + rect.height / 2);

        // On bloque le bouton s'il dépasse le bord de la base
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > this.maxDistance) {
            dx *= this.maxDistance / dist;
            dy *= this.maxDistance / dist;
        }

        this.x = dx;
        this.y = dy;

        // Calcul de la puissance demandée (0 à 100)
        const speedPerc = Math.round((-this.y / this.maxDistance) * 100);

        // --- ANTI-LAG : LIMITATION DU NOMBRE DE MESSAGES ---
        // On n'envoie un ordre que toutes les 60ms pour ne pas saturer l'ESP32-S3
        const now = Date.now();
        if (now - this.lastSend > 60) {
            this.sendCommands(speedPerc);
            this.lastSend = now;
        }
    }

    // --- COMMUNICATION AVEC HOME ASSISTANT ---
    sendCommands(speedPerc) {
        if (!this.hass) return;

        let finalSpeed = 0;
        // On définit la zone morte et la courbe de puissance (35% minimum pour démarrer)
        if (Math.abs(speedPerc) > 5) {
            finalSpeed = 35 + (Math.abs(speedPerc) * 0.65);
            if (speedPerc < 0) finalSpeed = -finalSpeed;
        }
        
        const val = Math.round(finalSpeed);
        // On envoie la commande aux deux entités moteurs simultanément
        const entities = ['number.vitesse_moteur_gauche', 'number.vitesse_moteur_droit'];
        
        entities.forEach(ent => {
            this.hass.callService('number', 'set_value', {
                entity_id: ent,
                value: val
            });
        });
    }
}

// On enregistre la balise personnalisée pour Home Assistant
customElements.define('joystick-rover-card', JoystickRoverCard);
