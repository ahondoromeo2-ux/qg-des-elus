/* ==========================================================================
   ÉLUSGRAM MOTOR ENGINE - JAVASCRIPT REALTIME COMPONENT
   ========================================================================== */

// Références globales aux services réseaux initialisés dans index.html
const db = firebase.database();
const storage = firebase.storage();

// Identifiants de sessions locaux
let currentSessionUser = "Roméo"; // Par défaut configuré sur ton profil principal
let activeChatTarget = null;

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
    loadFeed();
    loadProfile();
    initExploreGrid();
    setupSearchBarListener();
});

// ==========================================
// 1. GESTION DU FLUX PRINCIPAL (FEED)
// ==========================================
function loadFeed() {
    const feedContainer = document.getElementById("feed-container");
    if (!feedContainer) return;

    // Écoute en temps réel des publications sur Firebase
    db.ref("posts").on("value", (snapshot) => {
        feedContainer.innerHTML = "";
        const posts = snapshot.val();
        if (!posts) {
            feedContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#a8a8a8;">Aucune publication pour le moment.<br>Soyez le premier à partager un moment !</div>`;
            return;
        }

        // Affichage inversé pour avoir les nouveautés en haut
        Object.keys(posts).reverse().forEach(key => {
            const post = posts[key];
            const postElement = document.createElement("article");
            postElement.className = "insta-post-card";
            postElement.style.borderBottom = "1px solid #262626";
            postElement.style.paddingBottom = "16px";
            postElement.style.marginBottom = "10px";

            // Détection du type de média (Vidéo ou Image)
            let mediaHtml = `<img src="${post.mediaUrl}" style="width:100%; max-height:450px; object-fit:cover;">`;
            if (post.mediaType && post.mediaType.startsWith("video/")) {
                mediaHtml = `<video src="${post.mediaUrl}" controls style="width:100%; max-height:450px; object-fit:cover;"></video>`;
            }

            postElement.innerHTML = `
                <div class="post-header" style="display:flex; align-items:center; padding:12px 16px; gap:10px;">
                    <img src="Avatar_Elu.png" style="width:32px; height:32px; border-radius:50%;">
                    <strong style="font-size:14px;">${post.author}</strong>
                </div>
                <div class="post-media">
                    ${mediaHtml}
                </div>
                <div class="post-actions" style="padding:12px 16px; display:flex; gap:16px; font-size:20px;">
                    <span style="cursor:pointer;" onclick="likePost('${key}')">❤️</span>
                    <span style="cursor:pointer;" onclick="switchView('view-dm')">💬</span>
                </div>
                <div class="post-details" style="padding:0 16px; font-size:14px;">
                    <p style="margin:4px 0;"><strong>${post.likes || 0} J'aime</strong></p>
                    <p style="margin:4px 0;"><strong>${post.author}</strong> ${post.caption}</p>
                    <span style="font-size:11px; color:#a8a8a8;">Propulsé par la Matrice</span>
                </div>
            `;
            feedContainer.appendChild(postElement);
        });
    });
}

function likePost(postKey) {
    const likeRef = db.ref(`posts/${postKey}/likes`);
    likeRef.transaction((currentLikes) => {
        return (currentLikes || 0) + 1;
    });
}

// ==========================================
// 2. // ==========================================
// 2. SYSTÈME DE TÉLÉVERSEMENT AVANCÉ AVEC APERÇU
// ==========================================

// Initialise les écouteurs pour la zone d'aperçu dès le chargement
document.addEventListener("DOMContentLoaded", () => {
    setupUploadPreview();
});

function setupUploadPreview() {
    const fileSelector = document.getElementById("file-selector");
    if (!fileSelector) return;

    // Écouteur pour afficher l'aperçu dès qu'un fichier est sélectionné
    fileSelector.addEventListener("change", function() {
        const file = this.files[0];
        const previewContainer = document.getElementById("upload-preview-container") || createPreviewContainer();
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewContainer.innerHTML = ""; // On vide l'ancien aperçu
                
                if (file.type.startsWith("video/")) {
                    previewContainer.innerHTML = `<video src="${e.target.result}" controls style="width:100%; max-height:250px; object-fit:cover; border-radius:8px;"></video>`;
                } else {
                    previewContainer.innerHTML = `<img src="${e.target.result}" style="width:100%; max-height:250px; object-fit:cover; border-radius:8px;">`;
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

function createPreviewContainer() {
    const uploadBox = document.querySelector(".upload-box");
    const container = document.createElement("div");
    container.id = "upload-preview-container";
    container.style.width = "100%";
    container.style.marginTop = "10px";
    container.style.textAlign = "center";
    
    // Insérer la zone d'aperçu juste avant la zone de texte de la légende
    const caption = document.getElementById("post-caption");
    uploadBox.insertBefore(container, caption);
    return container;
}

// Nouvelle fonction de publication avec barre de progression en temps réel
function handlePublish() {
    const fileSelector = document.getElementById("file-selector");
    const captionText = document.getElementById("post-caption");
    const publishBtn = document.getElementById("btn-publish");

    if (!fileSelector || fileSelector.files.length === 0) {
        alert("Veuillez sélectionner une photo ou une vidéo avant de publier.");
        return;
    }

    const file = fileSelector.files[0];
    publishBtn.disabled = true;

    // Création ou récupération de la barre de progression visuelle
    let progressBar = document.getElementById("upload-progress-bar");
    if (!progressBar) {
        progressBar = document.createElement("div");
        progressBar.id = "upload-progress-bar";
        progressBar.style.width = "0%";
        progressBar.style.height = "4px";
        progressBar.style.backgroundColor = "#0095f6";
        progressBar.style.transition = "width 0.1s linear";
        progressBar.style.borderRadius = "2px";
        progressBar.style.marginTop = "8px";
        publishBtn.parentNode.insertBefore(progressBar, publishBtn.nextSibling);
    }

    // Lancement du téléversement vers Firebase Storage
    const storageRef = storage.ref(`uploads/${Date.now()}_${file.name}`);
    const uploadTask = storageRef.put(file);

    // Suivi de la progression pas à pas
    uploadTask.on("state_changed", 
        (snapshot) => {
            // Calcul du pourcentage envoyé
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = progress + "%";
            publishBtn.innerText = `Téléversement : ${Math.round(progress)}%`;
        }, 
        (error) => {
            alert("Erreur lors du téléversement : " + error.message);
            publishBtn.innerText = "Partager";
            publishBtn.disabled = false;
            progressBar.style.width = "0%";
        }, 
        () => {
            // Téléversement réussi, récupération du lien public sécurisé
            uploadTask.snapshot.ref.getDownloadURL().then((downloadUrl) => {
                // Liaison immédiate avec la base de données
                db.ref("posts").push({
                    author: currentSessionUser,
                    mediaUrl: downloadUrl,
                    mediaType: file.type,
                    caption: captionText.value.trim(),
                    likes: 0,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }).then(() => {
                    // Nettoyage complet de la zone après publication réussie
                    captionText.value = "";
                    fileSelector.value = "";
                    progressBar.style.width = "0%";
                    const previewContainer = document.getElementById("upload-preview-container");
                    if (previewContainer) previewContainer.innerHTML = "";
                    
                    publishBtn.innerText = "Partager";
                    publishBtn.disabled = false;
                    
                    // Retour automatique sur le flux d'actualité pour voir son œuvre
                    switchView("view-feed");
                });
            });
        }
    );
}
// ==========================================
function handlePublish() {
    const fileSelector = document.getElementById("file-selector");
    const captionText = document.getElementById("post-caption");
    const publishBtn = document.getElementById("btn-publish");

    if (!fileSelector || fileSelector.files.length === 0) {
        alert("Veuillez sélectionner une photo ou une vidéo avant de publier.");
        return;
    }

    const file = fileSelector.files[0];
    publishBtn.innerText = "Mise en ligne...";
    publishBtn.disabled = true;

    // Stockage du fichier brut dans Firebase Storage
    const storageRef = storage.ref(`uploads/${Date.now()}_${file.name}`);
    const uploadTask = storageRef.put(file);

    uploadTask.on("state_changed", 
        null, 
        (error) => {
            alert("Erreur lors du téléversement : " + error.message);
            publishBtn.innerText = "Partager";
            publishBtn.disabled = false;
        }, 
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadUrl) => {
                // Enregistrement des métadonnées dans la base de données
                db.ref("posts").push({
                    author: currentSessionUser,
                    mediaUrl: downloadUrl,
                    mediaType: file.type,
                    caption: captionText.value.trim(),
                    likes: 0,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }).then(() => {
                    captionText.value = "";
                    fileSelector.value = "";
                    publishBtn.innerText = "Partager";
                    publishBtn.disabled = false;
                    switchView("view-feed");
                });
            });
        }
    );
}

// ==========================================
// 3. ENGIN DE MESSAGERIE PRIVÉE (DM)
// ==========================================
function loadDmMessages(targetName) {
    activeChatTarget = targetName;
    document.getElementById("dm-threads").style.display = "none";
    const windowDm = document.getElementById("dm-window");
    windowDm.style.display = "flex";
    document.getElementById("chat-target-name").innerText = targetName;

    const chatContainer = document.getElementById("chat-messages-container");
    
    // Génération d'une clé de canal de discussion unique triée par ordre alphabétique
    const channelId = [currentSessionUser, targetName].sort().join("_to_");

    db.ref(`direct_messages/${channelId}`).on("value", (snapshot) => {
        chatContainer.innerHTML = "";
        const messages = snapshot.val();
        if (!messages) return;

        Object.values(messages).forEach(msg => {
            const msgEl = document.createElement("div");
            msgEl.style.padding = "10px 14px";
            msgEl.style.borderRadius = "18px";
            msgEl.style.maxWidth = "75%";
            msgEl.style.fontSize = "14px";
            msgEl.style.margin = "4px 0";
            
            if (msg.sender === currentSessionUser) {
                msgEl.style.backgroundColor = "#3797f0";
                msgEl.style.color = "white";
                msgEl.style.alignSelf = "flex-end";
            } else {
                msgEl.style.backgroundColor = "#262626";
                msgEl.style.color = "white";
                msgEl.style.alignSelf = "flex-start";
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
    }).then(() => {
        input.value = "";
    });
}

// ==========================================
// 4. VUE INTERNE DU PROFIL DE L'ÉLU
// ==========================================
function loadProfile() {
    document.getElementById("profile-username").innerText = currentSessionUser;
    
    // Compteur de posts en temps réel de l'utilisateur connecté
    db.ref("posts").on("value", (snapshot) => {
        const posts = snapshot.val();
        const grid = document.getElementById("user-posts-grid");
        if (!grid) return;
        grid.innerHTML = "";

        let userCount = 0;
        if (posts) {
            Object.values(posts).forEach(post => {
                if (post.author === currentSessionUser) {
                    userCount++;
                    const gridItem = document.createElement("div");
                    gridItem.className = "grid-item";
                    
                    if (post.mediaType && post.mediaType.startsWith("video/")) {
                        gridItem.innerHTML = `<video src="${post.mediaUrl}" muted style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;"></video>`;
                    } else {
                        gridItem.innerHTML = `<img src="${post.mediaUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;">`;
                    }
                    grid.appendChild(gridItem);
                }
            });
        }
        document.getElementById("stat-posts").innerText = userCount;
    });
}

// ==========================================
// 5. ZONE DE DECOUVERTE & CONSOLE CACHÉE LOX
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
        const value = e.target.value.trim();
        
        // Déclenchement de la console Secrète LOX Root
        if (value === "le lâche prise" && currentSessionUser === "Roméo") {
            searchBar.value = "";
            injectLoxRootInterface();
        }
    });
}

// Injection à la volée de l'interface secrète LOX dans ÉlusGram
function injectLoxRootInterface() {
    if (document.getElementById("lox-injected-panel")) {
        document.getElementById("lox-injected-panel").style.display = "block";
        return;
    }

    const loxPanel = document.createElement("div");
    loxPanel.id = "lox-injected-panel";
    loxPanel.style.position = "fixed";
    loxPanel.style.top = "50px";
    loxPanel.style.left = "50%";
    loxPanel.style.transform = "translateX(-50%)";
    loxPanel.style.width = "90%";
    loxPanel.style.maxWidth = "400px";
    loxPanel.style.background = "linear-gradient(135deg, #14002a, #050012)";
    loxPanel.style.border = "2px dashed #9c27b0";
    loxPanel.style.borderRadius = "12px";
    loxPanel.style.padding = "16px";
    loxPanel.style.zIndex = "100";
    loxPanel.style.boxShadow = "0 10px 30px rgba(0,0,0,0.9)";
    loxPanel.style.color = "white";

    loxPanel.innerHTML = `
        <div style="font-size:12px; color:#bc00dd; font-weight:bold; text-align:center; margin-bottom:10px;">⚠️ CONSOLE CRITICAL PROTOCOLE LOX</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px;">
            <button onclick="loxPurgeAllPosts()" style="background:#d32f2f; color:white; padding:8px; border:none; border-radius:6px; font-weight:bold;">💥 Purger le Feed</button>
            <button onclick="toggleLoxData('lox-tech-box')" style="background:#0288d1; color:white; padding:8px; border:none; border-radius:6px; font-weight:bold;">📋 Fiche Technique</button>
            <button onclick="toggleLoxData('lox-friends-box')" style="background:#00796b; color:white; padding:8px; border:none; border-radius:6px; font-weight:bold;">📅 Agenda Sessions</button>
            <button onclick="toggleLoxData('lox-france-box')" style="background:#e91e63; color:white; padding:8px; border:none; border-radius:6px; font-weight:bold;">🇫🇷 Module Transit</button>
        </div>
        
        <div id="lox-tech-box" style="display:none; margin-top:10px; background:#111126; padding:8px; border-radius:6px; font-size:10px; font-family:monospace; line-height:1.5; border:1px solid #333;">
            <strong>📂 LA MATRICE DES MYSTÈRES</strong><br>
            • Heures miroirs & synchronicités cliquées.<br>
            • Numérologie active et cartographie des Chakras.<br>
            • Béton romain & Ingénierie de l'Homme de Vitruve.
        </div>

        <div id="lox-friends-box" style="display:none; margin-top:10px; background:#111126; padding:8px; border-radius:6px; font-size:10px; font-family:monospace; line-height:1.5; border:1px solid #333;">
            <strong>📅 ANIMATION DES ÉLUS</strong><br>
            • Lancement de débats et de questions Vérités.<br>
            • Partage de modules de jeux mobiles & émulation PSP.<br>
            • Suivi optimisé des patchs de Magic Rampage (Mise à jour Juin).
        </div>

        <div id="lox-france-box" style="display:none; margin-top:10px; background:#111126; padding:8px; border-radius:6px; font-size:10px; font-family:monospace; line-height:1.5; border:1px solid #333;">
            <strong>🇫🇷 EXOCANAL TRANSIT</strong><br>
            • Suivi logistique voyage France.<br>
            • Liaison Instagram active.<br>
            • Modèle de déclaration d'amour chiffré : <em>Déborah</em>.
        </div>

        <button onclick="document.getElementById('lox-injected-panel').style.display='none'" style="width:100%; background:#333; color:white; border:none; padding:6px; margin-top:10px; border-radius:6px; font-size:11px; font-weight:bold;">🔒 VERROUILLER</button>
    `;

    document.body.appendChild(loxPanel);
}

function toggleLoxData(id) {
    const box = document.getElementById(id);
    box.style.display = (box.style.display === "none") ? "block" : "none";
}

function loxPurgeAllPosts() {
    if (confirm("Voulez-vous détruire l'intégralité du flux d'images ÉlusGram ?")) {
        db.ref("posts").set(null);
        alert("Flux réinitialisé.");
    }
}
