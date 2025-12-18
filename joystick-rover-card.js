// On importe les outils de Home Assistant (LitElement)
import {
    LitElement,
    html,
    css
} from 'https://unpkg.com/lit@2.7.4/index.js?module';

class JoystickRoverCard extends LitElement {
    
    // --- CONFIGURATION ---
    // Cette fonction reçoit les réglages que tu écris dans ton tableau de bord YAML
    setConfig(config) {
        this.config = config;
    }

    // On définit les propriétés qui vont changer et forcer la carte à se redessiner
    static get properties() {
        return {
            hass: { type: Object },         // Connexion à Home Assistant
            config: { type: Object },       // Ta config YAML
            x: { type: Number },            // Position horizontale du bouton
            y: { type: Number },            // Position verticale du bouton
            displaySpeed: { type: Number }  // Vitesse affichée à l'écran (pour éviter le lag)
        };
    }

    constructor() {
        super();
        this.baseRadius = 80;       // Taille de la base noire
        this.handleRadius = 41;     // Taille du bouton bleu
        this.maxDistance = this.baseRadius - this.handleRadius; // Limite de mouvement
        this.x = 0;
        this.y = 0;
        this.displaySpeed = 0;
        this.isDragging = false;
        this.lastSend = 0;          // Chronomètre pour ne pas saturer l'ESP32
    }

    // --- DESIGN (CSS) ---
    static get styles() {
        return css`
            :host { display: block; }

            .card-content {
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: flex-start; /* ALIGNEMENT À GAUCHE */
                background: #1a1a1a;
                border-radius: var(--ha-card-border-radius, 12px);
            }

            /* LA BASE DU JOYSTICK (Le trou avec effet soufflet) */
            .base {
                width: 160px; height: 160px;
                border-radius: 50%;
                position: relative;
                background: #000;
                /* Anneaux concentriques style caoutchouc */
                background-image: repeating-radial-gradient(
                    circle at center,
                    #222 0px, #222 8px,
                    #0a0a0a 10px, #000 12px
                );
                border: 4px solid #333;
                box-shadow: inset 0 0 25px rgba(0,0,0,1);
                touch-action: none; /* Empêche la page de bouger sur mobile */
                display: flex;
                justify-content: center;
                align-items: center;
                margin-left: 10px;
            }

            /* LUMIÈRE DYNAMIQUE (L'effet qui bouge sous le bouton) */
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
                background: radial-gradient(circle at 50% 15%, #03a9f4 0%, #0288d1 60%, #01579b 100%);
                box-shadow: 
                    0 15px 30px rgba(0,0,0,0.8),
                    inset 0 10px 15px rgba(0,0,0,0.5),
                    inset 0 -5px 10px rgba(255,255,255,0.2);
                z-index: 10;
                touch-action: none;
            }

            /* TEXTE DE LA VITESSE */
            .speed-label {
                margin-top: 15px;
                color: #03a9f4;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                font-weight: bold;
                margin-left: 20px;
            }
        `;
    }

    // --- AFFICHAGE (HTML) ---
    render() {
        // Calcul du mouvement de l'ombre interne pour l'effet soufflet
        const moveX = (this.x / this.maxDistance) * 15;
        const moveY = (this.y / this.maxDistance) * 15;

        return html`
            <ha-card .header=${this.config.title}>
                <div class="card-content">
                    <div id="joystick-base" class="base">
                        <div class="bellows-glow" style="transform: translate(${moveX}px, ${moveY}px);"></div>
                        <div id="joystick-handle" class="handle" 
                             style="transform: translate(${this.x}px, ${this.y}px);">
                        </div>
                    </div>
                    <div class="speed-label">HEISENBERG SPEED: ${Math.round(this.displaySpeed)}%</div>
                </div>
            </ha-card>
        `;
    }

    // --- LOGIQUE ET ÉVÉNEMENTS ---
    firstUpdated() {
        this.baseElement = this.shadowRoot.querySelector('#joystick-base');
        this.handleElement = this.shadowRoot.querySelector('#joystick-handle');
        this._addListeners();
    }

    _addListeners() {
        const h = this.handleElement;
        // Détection souris
        h.addEventListener('mousedown', (e) => this.onStart(e));
        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('mouseup', () => this.onEnd());
        // Détection tactile (Doigt)
        h.addEventListener('touchstart', (e) => this.onStart(e), {passive: false});
        document.addEventListener('touchmove', (e) => this.onMove(e), {passive: false});
        document.addEventListener('touchend', () => this.onEnd());
    }

    // Quand on commence à toucher le bouton
    onStart(e) {
        e.preventDefault();
        this.isDragging = true;
        this.handleElement.style.transition = 'none'; // On enlève les animations pour la réactivité
    }

    // Quand on relâche le bouton (Retour au centre)
    onEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.handleElement.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // Effet ressort
        this.x = 0;
        this.y = 0;
        
        // CORRECTION DU LAG : On force l'affichage à 0 tout de suite
        this.displaySpeed = 0; 
        this.sendCommands(0);
    }

    // Quand on déplace le bouton
    onMove(e) {
        if (!this.isDragging) return;
        const rect = this.baseElement.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calcul de la distance depuis le centre
        let dx = clientX - (rect.left + rect.width / 2);
        let dy = clientY - (rect.top + rect.height / 2);

        // On limite le bouton à l'intérieur du cercle noir
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > this.maxDistance) {
            dx *= this.maxDistance / dist;
            dy *= this.maxDistance / dist;
        }

        this.x = dx;
        this.y = dy;

        // On calcule la vitesse (0 à 100%)
        const speedPerc = Math.round((-this.y / this.maxDistance) * 100);
        this.displaySpeed = speedPerc; // Mise à jour visuelle immédiate

        // LIMITATION DE DÉBIT : On n'envoie à l'ESP32 que toutes les 60ms
        const now = Date.now();
        if (now - this.lastSend > 60) {
            this.sendCommands(speedPerc);
            this.lastSend = now;
        }
    }

    // Envoi des ordres à Home Assistant (Moteurs)
    sendCommands(speedPerc) {
        if (!this.hass) return;

        let finalSpeed = 0;
        // Zone morte et courbe de puissance
        if (Math.abs(speedPerc) > 5) {
            finalSpeed = 35 + (Math.abs(speedPerc) * 0.65);
            if (speedPerc < 0) finalSpeed = -finalSpeed;
        }
        
        const val = Math.round(finalSpeed);
        // On envoie la même vitesse aux deux moteurs
        const entities = ['number.vitesse_moteur_gauche', 'number.vitesse_moteur_droit'];
        
        entities.forEach(ent => {
            this.hass.callService('number', 'set_value', {
                entity_id: ent,
                value: val
            });
        });
    }
}

// Enregistrement de la carte
customElements.define('joystick-rover-card', JoystickRoverCard);
