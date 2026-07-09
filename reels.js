/* ==========================================================================
   ÉLUSGRAM REELS & STORIES MODULE - EXTRA COMPONENT v1.0
   ========================================================================== */

const loxDb = firebase.database();

// Initialisation du composant Stories au chargement
document.addEventListener("DOMContentLoaded", () => {
    injectStoriesBar();
    initReelsSystem();
});

// 1. INJECTION DE LA BARRE DE STORIES STYLE INSTAGRAM
function injectStoriesBar() {
    const feedView = document.getElementById("view-feed");
    if (!feedView) return;

    // Création du conteneur de la barre de stories si elle n'existe pas
    if (!document.getElementById("stories-timeline")) {
        const storiesBar = document.createElement("div");
        storiesBar.id = "stories-timeline";
        storiesBar.style.display = "flex";
        storiesBar.style.gap = "12px";
        storiesBar.style.padding = "10px 16px";
        storiesBar.style.overflowX = "auto";
        storiesBar.style.borderBottom = "1px solid #262626";
        storiesBar.style.background = "#000";
        
        // Contenu dynamique simulant les membres actifs et les salons mystères
        storiesBar.innerHTML = `
            <div class="story-bubble" onclick="openStoryViewer('Roméo')" style="text-align:center; cursor:pointer; flex-shrink:0;">
                <div style="width:56px; height:56px; border-radius:50%; background: linear-gradient(45deg, #ffd700, #bc1888); padding:2px; box-sizing:border-box;">
                    <img src="Avatar_Elu.png" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:2px solid #000;">
                </div>
                <div style="font-size:11px; color:#fff; margin-top:4px; max-width:60px; overflow:hidden; text-overflow:ellipsis;">Votre Story</div>
            </div>
            <div class="story-bubble" onclick="openStoryViewer('Matrice')" style="text-align:center; cursor:pointer; flex-shrink:0;">
                <div style="width:56px; height:56px; border-radius:50%; background: linear-gradient(45deg, #00e5ff, #4a00e0); padding:2px; box-sizing:border-box;">
                    <div style="width:100%; height:100%; border-radius:50%; background:#111; display:flex; align-items:center; justify-content:center; font-size:18px; border:2px solid #000;">🧬</div>
                </div>
                <div style="font-size:11px; color:#a8a8a8; margin-top:4px;">Mystères</div>
            </div>
        `;
        
        // Insérer tout en haut du fil d'actualité
        feedView.insertBefore(storiesBar, feedView.firstChild);
    }
}

// 2. VISIONNEUSE DE STORIES EN PLEIN ÉCRAN
function openStoryViewer(type) {
    let contentHtml = "";
    if (type === 'Roméo') {
        contentHtml = `<div style="padding:30px; text-align:center;"><h3>Statut Actif</h3><p style="font-size:24px;">👑</p><p>Réseau configuré avec succès.</p></div>`;
    } else {
        contentHtml = `
            <div style="padding:20px; font-family:monospace; font-size:12px; text-align:left; color:#00e5ff;">
                <h3 style="color:#ffd700; text-align:center;">SYNCRONICITÉ MATRIX</h3>
                <p>• Heure Miroir détectée : Flux actif.</p>
                <p>• Calculs de numérologie en cours sur la base réseau...</p>
                <p>• Énergie Chakras : Équilibrée.</p>
            </div>
        `;
    }

    const viewer = document.createElement("div");
    viewer.id = "story-fullscreen-overlay";
    viewer.style.position = "fixed"; viewer.style.top = "0"; viewer.style.left = "0";
    viewer.style.width = "100vw"; viewer.style.height = "100vh";
    viewer.style.background = "rgba(10, 10, 15, 0.95)"; viewer.style.zIndex = "200";
    viewer.style.display = "flex"; viewer.style.flexDirection = "column";
    viewer.style.justifyContent = "center"; viewer.style.alignItems = "center";

    viewer.innerHTML = `
        <div style="width:90%; max-width:400px; background:#121212; border-radius:16px; border:1px solid #262626; position:relative; padding:20px; box-sizing:border-box; color:white;">
            <span onclick="document.getElementById('story-fullscreen-overlay').remove()" style="position:absolute; top:10px; right:15px; font-size:20px; cursor:pointer; color:#aaa;">✕</span>
            ${contentHtml}
        </div>
    `;
    document.body.appendChild(viewer);
}

// 3. INITIALISATION DU MODULE LECTEUR DE REELS VERTICAUX
function initReelsSystem() {
    // Modification discrète du bouton Explore (Recherche) pour intégrer une double fonction Reels
    const exploreBtn = document.querySelector(".nav-btn[onclick=\"switchView('view-explore')\"]");
    if (exploreBtn) {
        exploreBtn.innerHTML = "🎬"; // On transforme l'icône recherche en icône Clap Cinéma / Reels
        exploreBtn.setAttribute("onclick", "launchReelsViewer()");
    }
}

function launchReelsViewer() {
    // Récupération des posts de la base pour extraire uniquement les vidéos
    loxDb.ref("posts").once("value", (snapshot) => {
        const posts = snapshot.val();
        let videoUrls = [];
        
        if (posts) {
            Object.values(posts).forEach(p => {
                if (p.mediaType && p.mediaType.startsWith("video/")) {
                    videoUrls.push({url: p.mediaUrl, author: p.author, caption: p.caption});
                }
            });
        }

        // Si aucune vidéo n'est encore sur ta base, on met une vidéo de démo lourde
        if (videoUrls.length === 0) {
            videoUrls.push({
                url: "https://www.w3schools.com/html/mov_bbb.mp4",
                author: "Système LOX",
                caption: "Initialisation du flux vertical vidéo. Téléversez vos fichiers MP4 !"
            });
        }

        // Génération de l'écran Reels
        const reelsOverlay = document.createElement("div");
        reelsOverlay.id = "reels-fullscreen-view";
        reelsOverlay.style.position = "fixed"; reelsOverlay.style.top = "0"; reelsOverlay.style.left = "0";
        reelsOverlay.style.width = "100vw"; reelsOverlay.style.height = "100vh";
        reelsOverlay.style.background = "#000"; reelsOverlay.style.zIndex = "150";
        reelsOverlay.style.display = "flex"; reelsOverlay.style.justifyContent = "center";

        let reelsCardsHtml = "";
        videoUrls.forEach((video, index) => {
            reelsCardsHtml += `
                <div class="reel-card" style="width:100%; max-width:450px; height:100vh; position:relative; background:#000; display:${index === 0 ? 'block' : 'none'};">
                    <video src="${video.url}" loop autoplay muted style="width:100%; height:100%; object-fit:cover;"></video>
                    
                    <!-- Bouton Fermer -->
                    <span onclick="document.getElementById('reels-fullscreen-view').remove()" style="position:absolute; top:20px; left:20px; font-size:24px; color:white; cursor:pointer; text-shadow:0 2px 4px rgba(0,0,0,0.8); z-index:10;">⬅</span>
                    
                    <!-- Infos en surimpression en bas du Reel -->
                    <div style="position:absolute; bottom:60px; left:16px; right:16px; color:white; text-shadow:0 1px 6px rgba(0,0,0,0.9); z-index:10;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <div style="width:32px; height:32px; border-radius:50%; background:#ffd700; display:flex; align-items:center; justify-content:center; font-weight:bold; color:black; font-size:12px;">É</div>
                            <strong style="font-size:14px;">@${video.author}</strong>
                            <span style="border:1px solid white; padding:2px 6px; border-radius:4px; font-size:10px;">S'abonner</span>
                        </div>
                        <p style="font-size:13px; margin:0; line-height:1.4;">${video.caption}</p>
                    </div>

                    <!-- Interactions à droite -->
                    <div style="position:absolute; bottom:120px; right:12px; display:flex; flex-direction:column; gap:20px; align-items:center; z-index:10;">
                        <div style="cursor:pointer; font-size:26px;" onclick="this.innerHTML = this.innerHTML === '❤️' ? '❤️' : '❤️'">❤️</div>
                        <div style="cursor:pointer; font-size:24px;">💬</div>
                        <div style="cursor:pointer; font-size:24px;">✈️</div>
                    </div>
                </div>
            `;
        });

        reelsOverlay.innerHTML = reelsCardsHtml;
        document.body.appendChild(reelsOverlay);
    });
}
