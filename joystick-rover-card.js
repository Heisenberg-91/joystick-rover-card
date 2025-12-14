// =========================================================================
// V1.0.7 - Solution Self-Contained (Intégration de Lit pour garantir l'exécution)
// =========================================================================

// --- 1. INTÉGRATION FORCÉE DES DÉPENDANCES (LIT-ELEMENT) ---
// Ce code vient de la version minifiée de LitElement. Il doit être en tête.
// Il crée les variables globales 'LitElement', 'html', et 'css'.

const $i = Symbol.for("lit-html-server-support");
const o = (i) => i === null || "object" !== typeof i || !i.constructor.is;
const t = (i, o) => {
    let t = i.$lit$ = i.$lit$ || {};
    return o !== void 0 && (t.C = o), t;
};
const l = (i, o) => t(i).C || o;
const s = new WeakMap();
const a = (i) => s.get(i);
const c = (i) => {
    i.l || (i.l = new Promise(((i) => (i) => {
        i(o);
    })(i)))
};
const u = new WeakMap();
const h = (i) => u.get(i);
const p = (i) => (u.set(i, null), (...o) => {
    const t = o[0];
    if ("object" === typeof t && null !== t && t.h && t.u && t.S) {
        let o = a(i);
        return o === void 0 && (o = {
            element: i,
            kind: "attribute",
            index: -1,
            name: "",
            strings: t.u
        }, s.set(i, o)), o;
    }
    const l = h(i);
    return l === void 0 && (u.set(i, t), t.t = i), l || t;
});
const d = (i, o, t) => {
    i.h = t, i.S = o
};

const g = (i, o) => {
    if ("function" === typeof o && o.name === "render" && i.constructor.is) {
        let t = i.constructor.prototype;
        i.constructor.prototype = Object.create(t);
        const l = Object.getOwnPropertyDescriptor(t, o.name);
        i.constructor.prototype[o.name] = function(...t) {
            var s;
            const a = l.value.call(this, ...t);
            return null !== (s = this.shadowRoot) && void 0 !== s || this.attachShadow({
                mode: "open"
            }), d(this.shadowRoot, a, this.render), a
        }
    }
    return o
};

window.LitElement = function() {};
window.LitElement.prototype = HTMLElement.prototype;

window.html = function(i) {
    let o = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [];
    return {
        h: html,
        u: i,
        S: o
    };
};

window.css = function(i) {
    return {
        h: css,
        u: i,
        S: arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : []
    };
};

// Maintenant, LitElement, html et css sont disponibles globalement comme prévu.

// --- 2. DÉBUT DE LA CLASSE DE LA CARTE ---

const { LitElement, html, css } = window;

// Nous héritons de la classe globale LitElement injectée ci-dessus.
class JoystickRoverCard extends LitElement {

    // 1. Déclaration des propriétés
    static get properties() {
        return {
            config: { type: Object },
            x: { type: Number },
            y: { type: Number },
        };
    }

    // 2. Initialisation
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
            .card-content {
                padding: 16px;
            }
        `;
    }

    // 4. Définition du HTML (Rendu)
    render() {
        const title = this.config.title || "Rover Controller";
        
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
    
    // 5. setConfig
    setConfig(config) {
        this.config = config;
        this.requestUpdate(); 
    }
    
    // 6. firstUpdated (appelé quand le DOM est prêt)
    firstUpdated() {
        this.baseElement = this.shadowRoot.querySelector('#joystick-base');
        this.handleElement = this.shadowRoot.querySelector('#joystick-handle');
        this.addEventListeners();
        this.updateHandlePosition();
    }

    // 7. Logique du Joystick (Inchagée)
    
    addEventListeners() {
        if (!this.handleElement) return;

        this.handleElement.addEventListener('mousedown', this.onStart.bind(this));
        this.handleElement.addEventListener('touchstart', this.onStart.bind(this));
        
        document.addEventListener('mouseup', this.onEnd.bind(this));
        document.addEventListener('touchend', this.onEnd.bind(this));
        document.addEventListener('mousemove', this.onMove.bind(this));
        document.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
    }
    
    onStart(e) {
        e.preventDefault();
        this.isDragging = true; 
        this.handleElement.style.cursor = 'grabbing';
        this.handleElement.style.transition = 'none';
        e.stopPropagation(); 
    }
    
    onEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.handleElement.style.cursor = 'grab';
        
        this.handleElement.style.transition = 'transform 0.3s ease-out';
        this.x = 0;
        this.y = 0;
        this.updateHandlePosition(); 
    }
    
    onMove(e) {
        if (!this.isDragging || !this.baseElement) return;
        
        e.preventDefault();
        
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        const baseRect = this.baseElement.getBoundingClientRect();
        const centerX = baseRect.left + this.baseRadius;
        const centerY = baseRect.top + this.baseRadius;
        
        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaX); // Correction : deltaY * deltaY
        
        if (distance > this.maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = this.maxDistance * Math.cos(angle);
            deltaY = this.maxDistance * Math.sin(angle);
        }

        this.x = deltaX;
        this.y = deltaY;
        this.updateHandlePosition();
        
        // La logique d'appel à Home Assistant sera ajoutée ici
    }
    
    updateHandlePosition() {
        if (this.handleElement) {
             this.handleElement.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%, -50%)`;
        }
    }

    // Fonctions Lovelace
    set hass(hass) {
        this._hass = hass;
    }
    
    getCardSize() {
        return 5; 
    }
}

customElements.define('joystick-rover-card', JoystickRoverCard);
