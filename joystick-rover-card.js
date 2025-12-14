class JoystickRoverCard extends HTMLElement {
    // 1. Initialisation : Le constructeur crée la structure HTML de base de notre carte.
    constructor() {
        super();
        this.attachShadow({ mode: 'open' }); // Utilisation du Shadow DOM
        this.shadowRoot.innerHTML = `
            <style>
                .container {
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 200px; /* Hauteur arbitraire pour le test */
                    background: var(--card-background-color);
                    border-radius: var(--ha-card-border-radius, 12px);
                }
                .joystick-sphere {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    /* Styles de la sphère */
                    background: radial-gradient(circle at 30% 30%, white, #333);
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
                    cursor: grab;
                }
            </style>
            <ha-card>
                <div class="container">
                    <div id="sphere-element" class="joystick-sphere"></div>
                </div>
            </ha-card>
        `;
    }

    // 2. setConfig : Appelé lorsque la carte est configurée.
    setConfig(config) {
        // Nous enregistrons la configuration pour un usage ultérieur (comme le nom de la caméra ou les services)
        this.config = config;
        
        // Afficher un titre si défini
        const haCard = this.shadowRoot.querySelector('ha-card');
        haCard.header = config.title || "Rover Controller";
    }

    // 3. set hass : Appelé chaque fois que l'état de Home Assistant change.
    set hass(hass) {
        // Enregistrement de l'objet hass pour l'appel de services plus tard
        this._hass = hass;
    }

    // La hauteur par défaut de la carte (optionnel mais utile)
    getCardSize() {
        return 5; 
    }
}

// Enregistrement de la nouvelle carte auprès de Lovelace
customElements.define('joystick-rover-card', JoystickRoverCard);