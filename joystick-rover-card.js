// --- DÉFINITION DE LA CLASSE DE LA CARTE ---
class JoystickRoverCard extends HTMLElement {
  
  // Cette fonction est appelée par Home Assistant pour configurer la carte
  setConfig(config) {
    if (!config.entity) {
      throw new Error("Erreur : Vous devez spécifier une entité 'number' (ex: number.vitesse)");
    }
    this.config = config; // On stocke la configuration (nom de l'entité, etc.)
  }

  // Cette fonction s'exécute quand la carte est affichée sur l'écran
  connectedCallback() {
    this._render();
  }

  // Cette fonction reçoit les mises à jour de Home Assistant (état des capteurs, etc.)
  set hass(hass) {
    this._hass = hass;
    this._updateValue(); // On met à jour le chiffre affiché sur la carte
  }

  // --- PARTIE AFFICHAGE (HTML & CSS) ---
  _render() {
    if (this.shadowRoot) return; // Si la carte est déjà dessinée, on ne fait rien
    this.attachShadow({ mode: 'open' }); // On crée un "Shadow DOM" pour isoler le style de la carte

    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; padding: 10px; }
      
      /* Le rectangle qui contient tout le joystick */
      .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #1c1c1c; /* Fond sombre industriel */
        border-radius: 15px;
        padding: 20px;
        border: 2px solid #333;
      }

      /* La base circulaire noire (le trou dans lequel est le levier) */
      .base {
        position: relative;
        width: 160px;
        height: 160px;
        background: #000;
        border-radius: 50%;
        border: 5px solid #222;
        box-shadow: inset 0 0 20px rgba(0,0,0,0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        touch-action: none; /* Empêche le téléphone de scroller quand on touche le joystick */
      }

      /* L'EFFET SOUFFLET (Les anneaux en caoutchouc) */
      .soufflet {
        position: absolute;
        width: 110px;
        height: 110px;
        /* On crée des cercles concentriques pour imiter les plis du caoutchouc */
        background: repeating-radial-gradient(circle, #2a2a2a 0%, #2a2a2a 8%, #111 12%);
        border-radius: 50%;
        transition: transform 0.1s ease-out; /* Fluidité du mouvement */
        border: 1px solid #000;
      }

      /* LE POMMEAU (Le bouton que tu touches) */
      .joystick {
        position: relative;
        width: 65px;
        height: 65px;
        /* Dégradé pour donner l'effet de volume CONCAVE (creux) */
        background: radial-gradient(circle at 50% 50%, #333 0%, #555 100%);
        border-radius: 50%;
        box-shadow: 0 8px 15px rgba(0,0,0,0.6);
        cursor: pointer;
        z-index: 2;
        border: 2px solid #444;
      }

      /* Petit reflet pour accentuer l'effet creux du bouton */
      .joystick::after {
        content: '';
        position: absolute;
        top: 20%; left: 20%; width: 60%; height: 60%;
        background: radial-gradient(circle, rgba(0,0,0,0.3) 0%, transparent 70%);
        border-radius: 50%;
      }

      /* Texte affichant la vitesse sous le joystick */
      .value-display {
        margin-top: 15px;
        color: #00FF00; /* Vert style écran radar */
        font-family: 'Courier New', monospace;
        font-size: 1.1em;
      }
    `;

    // --- STRUCTURE HTML DE LA CARTE ---
    const container = document.createElement('div');
    container.className = 'container';
    container.innerHTML = `
      <div class="base" id="base">
        <div class="soufflet" id="soufflet"></div>
        <div class="joystick" id="joystick"></div>
      </div>
      <div class="value-display">COMMAND_VITESSE: <span id="val">0</span></div>
    `;

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(container);

    this._setupEventListeners(); // On active la détection du toucher/souris
  }

  // --- PARTIE LOGIQUE (MOUVEMENT ET CALCULS) ---
  _setupEventListeners() {
    const joystick = this.shadowRoot.getElementById('joystick');
    const soufflet = this.shadowRoot.getElementById('soufflet');
    const base = this.shadowRoot.getElementById('base');
    let isDragging = false;

    // Fonction qui calcule le mouvement
    const move = (e) => {
      if (!isDragging) return;

      const rect = base.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Position de la souris ou du doigt
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      let x = clientX - rect.left - centerX;
      let y = clientY - rect.top - centerY;

      // Limiter le mouvement à l'intérieur de la base (Max 45 pixels)
      const dist = Math.sqrt(x*x + y*y);
      const maxDist = 45;
      if (dist > maxDist) {
        x *= maxDist / dist;
        y *= maxDist / dist;
      }

      // Appliquer les transformations visuelles
      joystick.style.transform = `translate(${x}px, ${y}px)`; // Le bouton bouge
      // Le soufflet bouge à moitié de la vitesse pour simuler la déformation
      soufflet.style.transform = `translate(${x/2}px, ${y/2}px) scale(${1 - dist/400})`; 
      
      // Conversion du mouvement Y en vitesse (-100 à 100)
      const value = Math.round(-y * (100 / maxDist)); 
      this._sendValue(value);
    };

    // Fonction quand on lâche le joystick (retour au centre)
    const stop = () => {
      if (!isDragging) return;
      isDragging = false;
      joystick.style.transform = `translate(0px, 0px)`;
      soufflet.style.transform = `translate(0px, 0px) scale(1)`;
      this._sendValue(0); // On arrête le rover
    };

    // Événements Souris et Tactile
    joystick.addEventListener('mousedown', () => isDragging = true);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    joystick.addEventListener('touchstart', () => isDragging = true);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', stop);
  }

  // --- COMMUNICATION AVEC HOME ASSISTANT ---
  _sendValue(value) {
    // Appelle le service pour changer la valeur de l'entité ESPHome
    this._hass.callService('number', 'set_value', {
      entity_id: this.config.entity,
      value: value
    });
  }

  // Met à jour le texte affiché sous le joystick
  _updateValue() {
    const state = this._hass.states[this.config.entity];
    const valSpan = this.shadowRoot.getElementById('val');
    if (state && valSpan) {
      valSpan.textContent = state.state;
    }
  }
}

// Enregistrement final pour que HA reconnaisse la balise <joystick-rover-card>
customElements.define('joystick-rover-card', JoystickRoverCard);
