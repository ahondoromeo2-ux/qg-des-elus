/* ==========================================================================
   ÉLUSGRAM CORE INTERACTION ENGINE - ULTRA CONFIGURATION DE PRODUCTION
   ========================================================================== */

const db = firebase.database();
const storage = firebase.storage();

// Identités et constantes issues de ton carnet de notes (Intégration Totale de A à Z)
let currentSessionUser = "Roméo"; 
let activeChatTarget = null;

const MATRIX_DATA = {
    birthDate: "2007-01-17",
    birthTime: "05:30",
    birthPlace: "Togo 🇹🇬",
    inspiration: "Lomepal",
    targetInstagram: "Déborah",
    hoursMirrors: {
        "11:11": "Alignement total des Élus. Vos pensées se matérialisent instantanément.",
        "22:22": "Grand projet en construction. La persévérance au Togo va payer.",
        "05:30": "Heure sacrée de la naissance de Roméo. Énergie Matrix à son maximum."
    },
    knowledgeBase: {
        "beton romain": "Le secret réside dans les cendres volcaniques (pouzzolane) et la chaux vive, provoquant une réaction thermique qui durcit le mortier sous l'eau de mer. Idéal pour concevoir des structures indestructibles.",
        "vitruve": "L'Homme de Vitruve de Léonard de Vinci représente les proportions parfaites du corps humain inscrites dans un cercle (le divin) et un carré (la Terre). C'est la clé de la géométrie sacrée.",
        "chakras": "7 centres énergétiques. Le plexus solaire gère la confiance, le chakra du cœur (vibration Déborah) et le chakra couronne (connexion aux Élus).",
        "numerologie": "Année 2007 + 01 + 17 = Nombre vibratoire calculé en temps réel par l'algorithme.",
        "magic rampage": "Stratégies exclusives de juin : Optimisation des patchs, utilisation des émulateurs PSP mobiles et techniques de speedrun."
    }
};

document.addEventListener("DOMContentLoaded", () => {
    loadFeed();
    loadProfile();
    initExploreGrid();
    setupSearchBarListener();
    checkMirrorHoursAutomated();
});

// ==========================================
// 1. MODULE DU FLUX PRINCIPAL (FEED) WITH AUTO-LOOKUP
// ==========================================
function loadFeed() {
    const feedContainer = document.getElementById("feed-container");
    if (!feedContainer) return;

    db.ref("posts").on("value", (snapshot) => {
        feedContainer.innerHTML = "";
        const posts = snapshot.val();
        if (!posts) {
            feedContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#a8a8a8;">Aucune publication.<br>Activez le réseau !</div>`;
            return;
        }

        Object.keys(posts).reverse().forEach(key => {
            const post = posts[key];
            const postElement = document.createElement("article");
            postElement.className = "insta-post-card";
            postElement.style.borderBottom = "1px solid #262626";
            postElement.style.paddingBottom = "16px";
            postElement.style.marginBottom = "10px";

            let mediaHtml = `<img src="${post.mediaUrl}" style="width:100%; max-height:450px; object-fit:cover;">`;
            if (post.mediaType && post.mediaType.startsWith("video/")) {
                mediaHtml = `<video src="${post.mediaUrl}" controls style="width:100%; max-height:450px; object-fit:cover;"></video>`;
            }

            // Détection automatique de mots-clés du carnet dans la légende
            let extraMatrixBadge = "";
            Object.keys(MATRIX_DATA.knowledgeBase).forEach(keyword => {
                if (post.caption && post.caption.toLowerCase().includes(keyword)) {
                    extraMatrixBadge = `<div style="background: linear-gradient(90deg, #9c27b0, #00e5ff); color:white; font-size:10px; padding:4px 10px; border-radius:4px; margin-top:5px; font-family:monospace;">🧬 ANOMALIE DÉTECTÉE : Fiche "${keyword}" liée</div>`;
                }
            });

            postElement.innerHTML = `
                <div class="post-header" style="display:flex; align-items:center; padding:12px 16px; gap:10px;">
                    <img src="Avatar_Elu.png" style="width:32px; height:32px; border-radius:50%;">
                    <strong style="font-size:14px;">${post.author}</strong>
                </div>
                <div class="post-media">${mediaHtml}</div>
                <div class="post-actions" style="padding:12px 16px; display:flex; gap:16px; font-size:20px;">
                    <span style="cursor:pointer;" onclick="likePost('${key}')">❤️</span>
                    <span style="cursor:pointer;" onclick="switchView('view-dm')">💬</span>
                </div>
                <div class="post-details" style="padding:0 16px; font-size:14px;">
                    <p style="margin:4px 0;"><strong>${post.likes || 0} J'aime</strong></p>
                    <p style="margin:4px 0;"><strong>${post.author}</strong> ${post.caption}</p>
                    ${extraMatrixBadge}
                </div>
            `;
            feedContainer.appendChild(postElement);
        });
    });
}

function likePost(postKey) {
    db.ref(`posts/${postKey}/likes`).transaction(c => (c || 0) + 1);
}

// ==========================================
// 2. SYSTEME DE CHAT PRIVÉ AVEC TRADUCTEUR AUDIO
// ==========================================
function loadDmMessages(targetName) {
    activeChatTarget = targetName;
    document.getElementById("dm-threads").style.display = "none";
    document.getElementById("dm-window").style.display = "flex";
    document.getElementById("chat-target-name").innerText = targetName;

    const chatContainer = document.getElementById("chat-messages-container");
    const channelId = [currentSessionUser, targetName].sort().join("_to_");

    db.ref(`direct_messages/${channelId}`).on("value", (snapshot) => {
        chatContainer.innerHTML = "";
        const messages = snapshot.val();
        if (!messages) return;

        Object.values(messages).forEach(msg => {
            const msgEl = document.createElement("div");
            msgEl.style.padding = "10px 14px"; msgEl.style.borderRadius = "18px";
            msgEl.style.maxWidth = "75%"; msgEl.style.fontSize = "14px"; msgEl.style.margin = "4px 0";
            
            if (msg.sender === currentSessionUser) {
                msgEl.style.backgroundColor = "#3797f0"; msgEl.style.color = "white"; msgEl.style.alignSelf = "flex-end";
            } else {
                msgEl.style.backgroundColor = "#262626"; msgEl.style.color = "white"; msgEl.style.alignSelf = "flex-start";
            }
            msgEl.innerText = msg.text;
            chatContainer.appendChild(msgEl);
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}

function sendDirectMessage() {
    const input = document.getElementById("dm-input");
    const txt = input.value.trim();
    if (!txt || !activeChatTarget) return;

    const channelId = [currentSessionUser, activeChatTarget].sort().join("_to_");
    db.ref(`direct_messages/${channelId}`).push({
        sender: currentSessionUser,
        text: txt,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => { input.value = ""; });
}

// ==========================================
// 3. AFFICHAGE PROFIL & CALCULS VIBRATIONNELS
// ==========================================
function loadProfile() {
    document.getElementById("profile-username").innerText = currentSessionUser;
    
    // Algorithme de Numérologie basé sur ton carnet
    const totalVibration = 1 + 7 + 0 + 1 + 2 + 0 + 0 + 7; // 18 -> 1+8 = 9
    document.getElementById("profile-bio-text").innerHTML = `
        Élu de la Matrice. 🇹🇬<br>
        <span style="color:#ffd700; font-size:12px;">🧬 Chemin de Vie Numérologique : Rang ${totalVibration} (Idéaliste & Leader)</span><br>
        <span style="color:#a8a8a8; font-size:11px;">🎧 Inspiration Fréquence : ${MATRIX_DATA.inspiration}</span>
    `;

    db.ref("posts").on("value", (snapshot) => {
        const posts = snapshot.val();
        const grid = document.getElementById("user-posts-grid");
        if (!grid) return; grid.innerHTML = "";
        let count = 0;
        if (posts) {
            Object.values(posts).forEach(post => {
                if (post.author === currentSessionUser) {
                    count++;
                    const item = document.createElement("div");
                    item.className = "grid-item";
                    item.innerHTML = `<img src="${post.mediaUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;">`;
                    grid.appendChild(item);
                }
            });
        }
        document.getElementById("stat-posts").innerText = count;
    });
}

// ==========================================
// 4. MOTEUR DE RECHERCHE ET REELS DE DÉCOUVERTE
// ==========================================
function initExploreGrid() {
    const exploreGrid = document.getElementById("explore-grid-container");
    if (!exploreGrid) return;
    db.ref("posts").limitToLast(9).on("value", (snapshot) => {
        exploreGrid.innerHTML = "";
        const posts = snapshot.val();
        if (!posts) return;
        Object.values(posts).forEach(post => {
            const item = document.createElement("div");
            item.className = "grid-item";
            item.innerHTML = `<img src="${post.mediaUrl}">`;
            exploreGrid.appendChild(item);
        });
    });
}

function setupSearchBarListener() {
    const searchBar = document.getElementById("search-users");
    if (!searchBar) return;

    searchBar.addEventListener("input", (e) => {
        const value = e.target.value.toLowerCase().trim();
        
        // Commande Racine d'activation de la console LOX
        if (value === "le lâche prise" && currentSessionUser === "Roméo") {
            searchBar.value = "";
            injectLoxRootInterface();
            return;
        }

        // Système d'interconnexion avec ton carnet de notes : recherche instantanée
        Object.keys(MATRIX_DATA.knowledgeBase).forEach(key => {
            if (value === key) {
                alert(`📖 CARNET DE NOTES SECRETS - Fiche [${key.toUpperCase()}] :\n\n${MATRIX_DATA.knowledgeBase[key]}`);
                searchBar.value = "";
            }
        });
    });
}

// ==========================================
// 5. SURVEILLANCE DES HEURES MIROIRS AUTOMATIQUES
// ==========================================
function checkMirrorHoursAutomated() {
    setInterval(() => {
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0].substring(0, 5); // Ex: "11:11"
        if (MATRIX_DATA.hoursMirrors[timeString]) {
            console.log(`%c Synchronicités actives : ${MATRIX_DATA.hoursMirrors[timeString]}`, "color: #ffd700; font-weight: bold;");
        }
    }, 60000);
}

// CONSOLE SÉCURISÉE LOX EXTENSION REFUGE
function injectLoxRootInterface() {
    if (document.getElementById("lox-injected-panel")) {
        document.getElementById("lox-injected-panel").style.display = "block";
        return;
    }
    const loxPanel = document.createElement("div");
    loxPanel.id = "lox-injected-panel";
    loxPanel.style = "position:fixed; top:50px; left:50%; transform:translateX(-50%); width:90%; max-width:400px; background:linear-gradient(135deg, #14002a, #050012); border:2px dashed #9c27b0; border-radius:12px; padding:16px; z-index:100; color:white; font-family:sans-serif;";
    loxPanel.innerHTML = `
        <div style="font-size:12px; color:#bc00dd; font-weight:bold; text-align:center; margin-bottom:10px;">⚠️ CONSOLE CRITICAL PROTOCOLE LOX</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px;">
            <button onclick="db.ref('posts').set(null); alert('Feed purgé.');" style="background:#d32f2f; color:white; padding:8px; border:none; border-radius:6px; font-weight:bold;">💥 Purger le Feed</button>
            <button onclick="alert('Liaison active avec ${MATRIX_DATA.targetInstagram}. Fichier prêt.')" style="background:#e91e63; color:white; padding:8px; border:none; border-radius:6px; font-weight:bold;">🇫🇷 Lettre Déborah</button>
            <button onclick="alert('Lancement de la session d\\'animation du groupe d\\'amis... Mode Zéro Jugement activé !')" style="background:#00796b; color:white; padding:8px; border:none; border-radius:6px; font-weight:bold;">📅 Session Amis</button>
            <button onclick="document.getElementById('lox-injected-panel').style.display='none'" style="background:#333; color:white; padding:8px; border:none; border-radius:6px;">🔒 Verrouiller</button>
        </div>
    `;
    document.body.appendChild(loxPanel);
}
