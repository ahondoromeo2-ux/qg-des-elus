/* ==========================================================================
   ÉLUSGRAM COMMS SYSTEM - VOCAL RECORDER & WEBRTC CALL ENGINE
   ========================================================================== */

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// 1. INJECTION DES BOUTONS DE TÉLÉPHONIE ET MICRO DANS L'INTERFACE DM
document.addEventListener("DOMContentLoaded", () => {
    modifyDmInterfaceForComms();
});

function modifyDmInterfaceForComms() {
    // Attendre que la fenêtre de chat soit accessible
    const checkExist = setInterval(() => {
        const chatHeader = document.querySelector("#dm-window header, .chat-header");
        const chatInputArea = document.querySelector(".chat-input-container, #dm-window div:last-child");
        
        if (chatHeader && chatInputArea) {
            clearInterval(checkExist);
            
            // Injection du bouton d'appel dans l'en-tête s'il n'y est pas
            if (!document.getElementById("btn-lox-call")) {
                const callBtn = document.createElement("button");
                callBtn.id = "btn-lox-call";
                callBtn.innerHTML = "📞";
                callBtn.style.background = "none";
                callBtn.style.border = "none";
                callBtn.style.fontSize = "20px";
                callBtn.style.cursor = "pointer";
                callBtn.style.marginLeft = "auto";
                callBtn.style.paddingRight = "10px";
                callBtn.onclick = () => startWebRtcCall();
                chatHeader.appendChild(callBtn);
            }

            // Injection du bouton vocal à côté de la zone de saisie du message
            if (!document.getElementById("btn-lox-vocal")) {
                const vocalBtn = document.createElement("button");
                vocalBtn.id = "btn-lox-vocal";
                vocalBtn.innerHTML = "🎙️";
                vocalBtn.style.background = "none";
                vocalBtn.style.border = "none";
                vocalBtn.style.fontSize = "20px";
                vocalBtn.style.cursor = "pointer";
                vocalBtn.style.padding = "0 10px";
                vocalBtn.onclick = () => toggleVocalRecording();
                
                // On l'insère juste avant le bouton "Envoyer" de ton app.js
                const sendBtn = chatInputArea.querySelector("button");
                if (sendBtn) {
                    chatInputArea.insertBefore(vocalBtn, sendBtn);
                } else {
                    chatInputArea.appendChild(vocalBtn);
                }
            }
        }
    }, 1000);
}

// ==========================================
// 2. MOTEUR DES MESSAGES VOCAUX
// ==========================================
function toggleVocalRecording() {
    const vocalBtn = document.getElementById("btn-lox-vocal");
    
    if (!isRecording) {
        // Demande d'autorisation d'accès au micro du téléphone
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                    uploadVocalMessage(audioBlob);
                    
                    // Fermer proprement les pistes du micro
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start();
                isRecording = true;
                vocalBtn.innerHTML = "🛑";
                vocalBtn.style.color = "#ef4444";
                vocalBtn.title = "Enregistrement en cours... Cliquez pour envoyer";
            })
            .catch(err => {
                alert("Accès au microphone refusé ou non disponible : " + err.message);
            });
    } else {
        // Arrêt de l'enregistrement et déclenchement automatique de l'envoi
        if (mediaRecorder) {
            mediaRecorder.stop();
        }
        isRecording = false;
        vocalBtn.innerHTML = "🎙️";
        vocalBtn.style.color = "";
    }
}

function uploadVocalMessage(audioBlob) {
    if (!activeChatTarget) return;
    
    const vocalBtn = document.getElementById("btn-lox-vocal");
    vocalBtn.innerHTML = "⏳";
    
    // Téléversement du fichier audio brut sur Firebase Storage
    const storageRef = firebase.storage().ref(`vocals/${Date.now()}_vocal.mp3`);
    const uploadTask = storageRef.put(audioBlob);
    
    uploadTask.on("state_changed", null, 
        (error) => {
            alert("Échec de l'envoi du vocal : " + error.message);
            vocalBtn.innerHTML = "🎙️";
        }, 
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadUrl) => {
                const channelId = [currentSessionUser, activeChatTarget].sort().join("_to_");
                
                // Enregistrement du message sous forme de balise audio exploitable
                firebase.database().ref(`direct_messages/${channelId}`).push({
                    sender: currentSessionUser,
                    text: `🎵[AUDIO_MESSAGE]:${downloadUrl}`,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }).then(() => {
                    vocalBtn.innerHTML = "🎙️";
                });
            });
        }
    );
}

// HOOK DE RENDU : Modifie l'affichage des messages dans app.js pour générer un lecteur audio s'il détecte un vocal
const originalLoadDmMessages = loadDmMessages;
loadDmMessages = function(targetName) {
    originalLoadDmMessages(targetName);
    
    // Surcharger l'écouteur Firebase pour intercepter et dessiner les lecteurs audio
    const channelId = [currentSessionUser, targetName].sort().join("_to_");
    firebase.database().ref(`direct_messages/${channelId}`).on("value", (snapshot) => {
        const chatContainer = document.getElementById("chat-messages-container");
        if (!chatContainer) return;
        
        // On laisse app.js faire le premier rendu puis on ajuste les messages audio
        setTimeout(() => {
            const divs = chatContainer.querySelectorAll("div");
            divs.forEach(div => {
                if (div.innerText.startsWith("🎵[AUDIO_MESSAGE]:")) {
                    const audioUrl = div.innerText.replace("🎵[AUDIO_MESSAGE]:", "");
                    div.innerHTML = `
                        <div style="display:flex; align-items:center; gap:8px; padding:2px 0;">
                            <span>▶️</span>
                            <audio src="${audioUrl}" controls style="max-width:180px; height:30px;"></audio>
                        </div>
                    `;
                    div.style.background = div.style.alignSelf === "flex-end" ? "#262626" : "#1a1a1a";
                    div.style.border = "1px solid #333";
                }
            });
        }, 100);
    });
};

// ==========================================
// 3. PASSERELLE D'APPELS EN LIGNE (WebRTC HUB)
// ==========================================
function startWebRtcCall() {
    if (!activeChatTarget) return;
    
    // Génération d'un identifiant unique et sécurisé pour la salle d'appel des Élus
    const cryptoRoomId = "elusgram_call_" + [currentSessionUser, activeChatTarget].sort().join("_x_");
    const callUrl = `https://meet.jit.si/${cryptoRoomId}`;

    // Envoyer une invitation d'appel directement dans le chat privé de l'autre personne
    const channelId = [currentSessionUser, activeChatTarget].sort().join("_to_");
    firebase.database().ref(`direct_messages/${channelId}`).push({
        sender: currentSessionUser,
        text: `📞 Rejoins mon appel en ligne en cliquant ici : ${callUrl}`,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    // Ouvrir la fenêtre d'appel vidéo chiffrée en surcouche plein écran
    openCallOverlay(callUrl);
}

function openCallOverlay(url) {
    if (document.getElementById("lox-call-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "lox-call-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0"; overlay.style.left = "0";
    overlay.style.width = "100vw"; overlay.style.height = "100vh";
    overlay.style.background = "#000";
    overlay.style.zIndex = "300";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";

    overlay.innerHTML = `
        <div style="background:#111; padding:12px 20px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #262626; color:white;">
            <strong style="font-size:14px; color:#0095f6;">📞 APPEL EN LIGNE SÉCURISÉ</strong>
            <button onclick="document.getElementById('lox-call-overlay').remove()" style="background:#ef4444; border:none; color:white; padding:6px 14px; border-radius:6px; font-weight:bold; cursor:pointer;">Raccrocher</button>
        </div>
        <iframe src="${url}" allow="microphone; camera; display-capture; autoplay" style="width:100%; flex-grow:1; border:none;"></iframe>
    `;

    document.body.appendChild(overlay);
}
