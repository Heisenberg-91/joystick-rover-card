// =========================================================================
// V1.6.9 - Heisenberg "Instant Feedback" Edition
// Pilotage double moteurs + Mise à jour d'affichage sans délai
// =========================================================================

import {
    LitElement,
    html,
    css
} from 'https://unpkg.com/lit@2.7.4/index.js?module';

class JoystickRoverCard extends LitElement {
    
    // --- CONFIGURATION ---
    setConfig(config) {
        this.config = config;
    }

    static get properties() {
        return {
            hass: { type: Object },
            config: { type: Object },
            x: { type: Number },
            y: { type: Number }
        };
    }

    // --- INITIALISATION DES VARIABLES ---
    constructor() {
        super();
        this.baseRadius = 80;       // Taille du cercle noir
        this.handleRadius = 41;     // Taille du bouton bleu
        this.maxDistance = this.baseRadius - this.handleRadius;
        this.x = 0;
        this.y = 0;
        this.isDragging = false;
        this.lastSend = 0;          // Pour le limiteur de débit Wi-Fi
    }

    // --- STYLE VISUEL (CSS) ---
    static get styles() {
        return css`
            :host { display: block; }

            .card-content {
                padding: 10px;
                display: flex;
                justify-content: flex-start; /* ALIGNEMENT À GAUCHE */
                background: none;
            }

            /* LA BASE (Effet soufflet industriel) */
            .base {
                width: 160px; height: 160px;
                border-radius: 50%;
                position: relative;
                background: #000;
                background-image: repeating-radial-gradient(
                    circle at center,
                    #222 0px, #222 8px,
                    #0a0a0a 10px, #000 12px
                );
                border: 4px solid #333;
                box-shadow: inset 0 0 25px rgba(0,0,0,1);
                touch-action: none; /* Crucial pour le mobile */
                display: flex;
                justify-content: center;
                align-items: center;
            }

            /* EFFET DE LUMIÈRE DYNAMIQUE DANS LE SOUFFLET */
            .bellows-glow {
                position: absolute;
                width: 100%; height: 100%;
                background: radial-gradient(circle at center, rgba(3, 169, 244, 0.15) 0%, transparent 60%);
                pointer-events: none;
            }

            /* LE BOUTON POMMEAU (Finition Concave) */
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
        `;
    }

    // --- RENDU HTML ---
    render() {
        // Animation du reflet interne
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

    // --- LOGIQUE DE MOUVEMENT ---
    firstUpdated() {
        this.baseElement = this.shadowRoot.querySelector('#joystick-base');
        this.handleElement = this.shadowRoot.querySelector('#joystick-handle');
        this._addListeners();
    }

    _addListeners() {
        const h = this.handleElement;
        // Evenements Souris
        h.addEventListener('mousedown', (e) => this.onStart(e));
        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('mouseup', () => this.onEnd());
        // Evenements Tactiles
        h.addEventListener('touchstart', (e) => this.onStart(e), {passive: false});
        document.addEventListener('touchmove', (e) => this.onMove(e), {passive: false});
        document.addEventListener('touchend', () => this.onEnd());
    }

    onStart(e) {
        e.preventDefault();
        this.isDragging = true;
        this.handleElement.style.transition = 'none'; // Pas de latence au toucher
    }

    onEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        // Retour doux au centre (effet ressort)
        this.handleElement.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        this.x = 0;
        this.y = 0;
        
        // On envoie l'arrêt (0) immédiatement
        this.sendCommands(0);
    }

    onMove(e) {
        if (!this.isDragging) return;
        const rect = this.baseElement.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let dx = clientX - (rect.left + rect.width / 2);
        let dy = clientY - (rect.top + rect.height / 2);

        // Contrainte de distance (cercle)
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > this.maxDistance) {
            dx *= this.maxDistance / dist;
            dy *= this.maxDistance / dist;
        }

        this.x = dx;
        this.y = dy;

        // Puissance brute de -100 à 100
        const speedPerc = Math.round((-this.y / this.maxDistance) * 100);

        // --- LIMITATION DE DÉBIT (ANTI-LAG) ---
        // On n'envoie les ordres que toutes les 60ms pour ne pas saturer l'ESP32
        const now = Date.now();
        if (now - this.lastSend > 60) {
            this.sendCommands(speedPerc);
            this.lastSend = now;
        }
    }

    // --- ENVOI DES COMMANDES (MOTEURS + AFFICHAGE) ---
    sendCommands(speedPerc) {
        if (!this.hass) return;

        // 1. MISE À JOUR DE L'AFFICHAGE (Instantané sur la carte vidéo)
        this.hass.callService('input_number', 'set_value', {
            entity_id: 'input_number.vitesse_rover',
            value: speedPerc
        });

        // 2. CALCUL DE LA VITESSE RÉELLE POUR LES MOTEURS
        let finalSpeed = 0;
        if (Math.abs(speedPerc) > 5) {
            // Seuil de démarrage à 35% + courbe progressive
            finalSpeed = 35 + (Math.abs(speedPerc) * 0.65);
            if (speedPerc < 0) finalSpeed = -finalSpeed;
        }
        
        const val = Math.round(finalSpeed);
        
        // 3. ENVOI AUX DEUX MOTEURS
        const entities = ['number.vitesse_moteur_gauche', 'number.vitesse_moteur_droit'];
        entities.forEach(ent => {
            this.hass.callService('number', 'set_value', {
                entity_id: ent,
                value: val
            });
        });
    }
}

customElements.define('joystick-rover-card', JoystickRoverCard);

