/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import '@tailwindcss/browser';

//Gemini 95 was fully vibe-coded by @ammaar and @olacombe, while we don't endorse code quality, we thought it was a fun demonstration of what's possible with the model when a Designer and PM jam.
//An homage to an OS that inspired so many of us!

// Define the dosInstances object to fix type errors
const dosInstances: Record<string, { initialized: boolean }> = {};

// --- DOM Element References ---
const desktop = document.getElementById('desktop') as HTMLDivElement;
const windows = document.querySelectorAll('.window') as NodeListOf<HTMLDivElement>;
const icons = document.querySelectorAll('.icon') as NodeListOf<HTMLDivElement>; // This is a NodeList
const startMenu = document.getElementById('start-menu') as HTMLDivElement;
const startButton = document.getElementById('start-button') as HTMLButtonElement;
const taskbarAppsContainer = document.getElementById('taskbar-apps') as HTMLDivElement;
const paintAssistant = document.getElementById('paint-assistant') as HTMLDivElement;
const assistantBubble = paintAssistant?.querySelector('.assistant-bubble') as HTMLDivElement;

// --- State Variables ---
let activeWindow: HTMLDivElement | null = null;
let highestZIndex: number = 20; // Start z-index for active windows
const openApps = new Map<string, { windowEl: HTMLDivElement; taskbarButton: HTMLDivElement }>(); // Store open apps and their elements
let geminiInstance: any | null = null; // Store the initialized Gemini AI instance
let paintCritiqueIntervalId: number | null = null; // Timer for paint critiques

// Store ResizeObservers to disconnect them later
const paintResizeObserverMap = new Map<Element, ResizeObserver>();

// --- YouTube Player State ---
// @ts-ignore: YT will be defined by the YouTube API script
const youtubePlayers: Record<string, YT.Player | null> = {};
let ytApiLoaded = false;
let ytApiLoadingPromise: Promise<void> | null = null;

const DEFAULT_YOUTUBE_VIDEO_ID = 'RQEvHFti5p8'; // Default video for MFSPlayer

// --- Core Functions ---

/** Brings a window to the front and sets it as active */
function bringToFront(windowElement: HTMLDivElement): void {
    if (activeWindow === windowElement) return; // Already active

    if (activeWindow) {
        activeWindow.classList.remove('active');
        const appName = activeWindow.id;
        if (openApps.has(appName)) {
            openApps.get(appName)?.taskbarButton.classList.remove('active');
        }
    }

    highestZIndex++;
    windowElement.style.zIndex = highestZIndex.toString();
    windowElement.classList.add('active');
    activeWindow = windowElement;

    const appNameRef = windowElement.id;
    if (openApps.has(appNameRef)) {
        openApps.get(appNameRef)?.taskbarButton.classList.add('active');
    }
     if ((appNameRef === 'doom' || appNameRef === 'wolf3d') && dosInstances[appNameRef]) {
        const container = document.getElementById(`${appNameRef}-container`); // This ID might need checking
        const canvas = container?.querySelector('canvas');
        canvas?.focus();
     }
}

/** Opens an application window */
async function openApp(appName: string): Promise<void> {
    const windowElement = document.getElementById(appName) as HTMLDivElement | null;
    if (!windowElement) {
        console.error(`Window element not found for app: ${appName}`);
        return;
    }

    if (openApps.has(appName)) {
        bringToFront(windowElement);
        windowElement.style.display = 'flex';
        windowElement.classList.add('active');
        return;
    }

    windowElement.style.display = 'flex';
    windowElement.classList.add('active');
    bringToFront(windowElement);

    const taskbarButton = document.createElement('div');
    taskbarButton.classList.add('taskbar-app');
    taskbarButton.dataset.appName = appName;

    let iconSrc = '';
    let title = appName;
    const iconElement = findIconElement(appName);
    if (iconElement) {
        const img = iconElement.querySelector('img');
        const span = iconElement.querySelector('span');
        if(img) iconSrc = img.src;
        if(span) title = span.textContent || appName;
    } else { // Fallback for apps opened via start menu but maybe no desktop icon
         switch(appName) {
            case 'myComputer': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/mycomputer.png'; title = 'My MFStop'; break;
            case 'chrome': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/chrome-icon-2.png'; title = 'Chrome'; break;
            case 'notepad': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/GemNotes.png'; title = 'MFSNotes'; break;
            case 'paint': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/gempaint.png'; title = 'MFSPaint'; break;
            case 'doom': iconSrc = 'https://64.media.tumblr.com/1d89dfa76381e5c14210a2149c83790d/7a15f84c681c1cf9-c1/s540x810/86985984be99d5591e0cbc0dea6f05ffa3136dac.png'; title = 'Doom II'; break;
            case 'subwaysurfer': iconSrc = 'https://win98icons.alexmeub.com/icons/png/joystick-0.png'; title = 'MFSSurfer'; break;
            case 'gemini': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/GeminiChatRetro.png'; title = 'MFS App'; break;
            case 'instagram': iconSrc = 'https://win98icons.alexmeub.com/icons/png/camera-2.png'; title = 'InstaMFS'; break;
            case 'imageViewer': iconSrc = 'https://win98icons.alexmeub.com/icons/png/display_properties-4.png'; title = 'Image Viewer'; break;
            case 'mediaPlayer': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/ytmediaplayer.png'; title = 'MFSPlayer'; break;
         }
    }

    if (iconSrc) {
        const img = document.createElement('img');
        img.src = iconSrc;
        img.alt = title;
        taskbarButton.appendChild(img);
    }
    taskbarButton.appendChild(document.createTextNode(title));

    taskbarButton.addEventListener('click', () => {
        if (windowElement === activeWindow && windowElement.style.display !== 'none') {
             minimizeApp(appName);
        } else {
            windowElement.style.display = 'flex';
            bringToFront(windowElement);
        }
    });

    taskbarAppsContainer.appendChild(taskbarButton);
    openApps.set(appName, { windowEl: windowElement, taskbarButton: taskbarButton });
    taskbarButton.classList.add('active');

    // Initialize specific applications
    if (appName === 'chrome') {
        initAiBrowser(windowElement);
    }
    else if (appName === 'notepad') {
        await initNotepadStory(windowElement);
    }
    else if (appName === 'paint') {
        initSimplePaintApp(windowElement);
        if (paintAssistant) paintAssistant.classList.add('visible');
        if (assistantBubble) assistantBubble.textContent = 'Warming up my judging circuits...';
        if (paintCritiqueIntervalId) clearInterval(paintCritiqueIntervalId);
        paintCritiqueIntervalId = window.setInterval(critiquePaintDrawing, 15000);
    }
    else if (appName === 'doom' && !dosInstances['doom']) {
        const doomContainer = document.getElementById('doom-content') as HTMLDivElement;
        if (doomContainer) {
            doomContainer.innerHTML = '<iframe src="https://js-dos.com/games/doom.exe.html" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>';
            dosInstances['doom'] = { initialized: true };
        }
    } else if (appName === 'subwaysurfer') {
        initSubwaySurfer(windowElement);
    } else if (appName === 'gemini') {
        await initGeminiChat(windowElement);
    }
    else if (appName === 'instagram') {
        initInstagramApp(windowElement);
    }
    else if (appName === 'myComputer') {
        initMyComputer(windowElement);
    }
    else if (appName === 'mediaPlayer') {
        await initMediaPlayer(windowElement);
    }
}

/** Closes an application window */
function closeApp(appName: string): void {
    const appData = openApps.get(appName);
    if (!appData) return;

    const { windowEl, taskbarButton } = appData;

    windowEl.style.display = 'none';
    windowEl.classList.remove('active');
    taskbarButton.remove();
    openApps.delete(appName);

    if (dosInstances[appName]) {
        console.log(`Cleaning up ${appName} instance (iframe approach)`);
        const container = document.getElementById(`${appName}-content`);
        if (container) container.innerHTML = '';
        delete dosInstances[appName];
    }

    if (appName === 'paint') {
        if (paintCritiqueIntervalId) {
            clearInterval(paintCritiqueIntervalId);
            paintCritiqueIntervalId = null;
            if (paintAssistant) paintAssistant.classList.remove('visible');
        }
         const paintContent = appData.windowEl.querySelector('.window-content') as HTMLDivElement | null;
         if (paintContent && paintResizeObserverMap.has(paintContent)) {
             paintResizeObserverMap.get(paintContent)?.disconnect();
             paintResizeObserverMap.delete(paintContent);
         }
    }

    if (appName === 'mediaPlayer') {
        const player = youtubePlayers[appName];
        if (player) {
            try {
                if (typeof player.stopVideo === 'function') player.stopVideo();
                if (typeof player.destroy === 'function') player.destroy();
            } catch (e) {
                console.warn("Error stopping/destroying media player:", e);
            }
            delete youtubePlayers[appName];
            console.log("Destroyed YouTube player for mediaPlayer.");
        }
        // Reset the player area with a message
        const playerDivId = `youtube-player-${appName}`;
        const playerDiv = document.getElementById(playerDivId) as HTMLDivElement | null;
        if (playerDiv) {
            playerDiv.innerHTML = `<p class="media-player-status-message">Player closed. Enter a YouTube URL to load.</p>`;
        }
        // Reset control buttons state (optional, but good practice)
        const mediaPlayerWindow = document.getElementById('mediaPlayer');
        if (mediaPlayerWindow) {
            const playBtn = mediaPlayerWindow.querySelector('#media-player-play') as HTMLButtonElement;
            const pauseBtn = mediaPlayerWindow.querySelector('#media-player-pause') as HTMLButtonElement;
            const stopBtn = mediaPlayerWindow.querySelector('#media-player-stop') as HTMLButtonElement;
            if (playBtn) playBtn.disabled = true;
            if (pauseBtn) pauseBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = true;
        }
    }


    if (activeWindow === windowEl) {
        activeWindow = null;
        let nextAppToActivate: HTMLDivElement | null = null;
        let maxZ = -1;
        openApps.forEach((data) => {
             const z = parseInt(data.windowEl.style.zIndex || '0', 10);
             if (z > maxZ) {
                 maxZ = z;
                 nextAppToActivate = data.windowEl;
             }
        });
        if (nextAppToActivate) {
            bringToFront(nextAppToActivate);
        }
    }
}

/** Minimizes an application window */
function minimizeApp(appName: string): void {
    const appData = openApps.get(appName);
    if (!appData) return;

    const { windowEl, taskbarButton } = appData;

    windowEl.style.display = 'none';
    windowEl.classList.remove('active');
    taskbarButton.classList.remove('active');

    if (activeWindow === windowEl) {
        activeWindow = null;
         let nextAppToActivate: string | null = null;
         let maxZ = 0;
         openApps.forEach((data, name) => {
             if (data.windowEl.style.display !== 'none') {
                 const z = parseInt(data.windowEl.style.zIndex || '0', 10);
                 if (z > maxZ) {
                     maxZ = z;
                     nextAppToActivate = name;
                 }
             }
         });
         if (nextAppToActivate) {
             bringToFront(openApps.get(nextAppToActivate)!.windowEl);
         }
    }
}

// --- Gemini Chat Specific Functions ---
async function initGeminiChat(windowElement: HTMLDivElement): Promise<void> {
    const historyDiv = windowElement.querySelector('.gemini-chat-history') as HTMLDivElement;
    const inputEl = windowElement.querySelector('.gemini-chat-input') as HTMLInputElement;
    const sendButton = windowElement.querySelector('.gemini-chat-send') as HTMLButtonElement;

    if (!historyDiv || !inputEl || !sendButton) {
        console.error("Gemini chat elements not found in window:", windowElement.id);
        return;
    }

    function addChatMessage(container: HTMLDivElement, text: string, className: string = '') {
        const p = document.createElement('p');
        if (className) p.classList.add(className);
        p.textContent = text;
        container.appendChild(p);
        container.scrollTop = container.scrollHeight;
    }

    addChatMessage(historyDiv, "Initializing AI...", "system-message");

    const sendMessage = async () => {
        if (!geminiInstance) {
            const initSuccess = await initializeGeminiIfNeeded('initGeminiChat');
            if (!initSuccess) {
                addChatMessage(historyDiv, "Error: Failed to initialize AI.", "error-message");
                return;
            }
            const initMsg = Array.from(historyDiv.children).find(el => el.textContent?.includes("Initializing AI..."));
            if (initMsg) initMsg.remove();
            addChatMessage(historyDiv, "AI Ready.", "system-message");
        }

        const message = inputEl.value.trim();
        if (!message) return;

        addChatMessage(historyDiv, `You: ${message}`, "user-message");
        inputEl.value = '';
        inputEl.disabled = true;
        sendButton.disabled = true;

        try {
             // @ts-ignore
            const chat = geminiInstance.chats.create({ model: 'gemini-2.5-flash', history: [] });
             // @ts-ignore
            const result = await chat.sendMessageStream({message: message});
            let fullResponse = "";
            addChatMessage(historyDiv, "Gemini: ", "gemini-message");
            const lastMessageElement = historyDiv.lastElementChild as HTMLParagraphElement | null;
            for await (const chunk of result) {
                 const chunkText = chunk.text || "";
                 fullResponse += chunkText;
                 if (lastMessageElement) {
                    lastMessageElement.textContent += chunkText;
                    historyDiv.scrollTop = historyDiv.scrollHeight;
                 }
            }
        } catch (error: any) {
            addChatMessage(historyDiv, `Error: ${error.message || 'Failed to get response.'}`, "error-message");
        } finally {
             inputEl.disabled = false; sendButton.disabled = false; inputEl.focus();
        }
    };
    sendButton.onclick = sendMessage;
    inputEl.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    inputEl.disabled = false; sendButton.disabled = false; inputEl.focus();
}

/** Handles Notepad story generation */
async function initNotepadStory(windowElement: HTMLDivElement): Promise<void> {
    const textarea = windowElement.querySelector('.notepad-textarea') as HTMLTextAreaElement;
    const storyButton = windowElement.querySelector('.notepad-story-button') as HTMLButtonElement;
    if (!textarea || !storyButton) return;

    storyButton.addEventListener('click', async () => {
        const currentText = textarea.value;
        textarea.value = currentText + "\n\nGenerating story... Please wait...\n\n";
        textarea.scrollTop = textarea.scrollHeight;
        storyButton.disabled = true; storyButton.textContent = "Working...";
        try {
            if (!geminiInstance) {
                if (!await initializeGeminiIfNeeded('initNotepadStory')) throw new Error("Failed to initialize Gemini API.");
            }
            const prompt = "Write me a short creative story (250-300 words) with an unexpected twist ending. Make it engaging and suitable for all ages.";
             // @ts-ignore
            const result = await geminiInstance.models.generateContentStream({ model: 'gemini-2.5-flash', contents: prompt });
            textarea.value = currentText + "\n\n";
            for await (const chunk of result) {
                 textarea.value += chunk.text || "";
                 textarea.scrollTop = textarea.scrollHeight;
            }
            textarea.value += "\n\n";
        } catch (error: any) {
            textarea.value = currentText + "\n\nError: " + (error.message || "Failed to generate story.") + "\n\n";
        } finally {
            storyButton.disabled = false; storyButton.textContent = "Generate Story";
            textarea.scrollTop = textarea.scrollHeight;
        }
    });
}

/** Initializes the AI Browser functionality with image generation */
function initAiBrowser(windowElement: HTMLDivElement): void {
    const addressBar = windowElement.querySelector('.browser-address-bar') as HTMLInputElement;
    const goButton = windowElement.querySelector('.browser-go-button') as HTMLButtonElement;
    const iframe = windowElement.querySelector('#browser-frame') as HTMLIFrameElement;
    const loadingEl = windowElement.querySelector('.browser-loading') as HTMLDivElement;
    const DIAL_UP_SOUND_URL = 'https://www.soundjay.com/communication/dial-up-modem-01.mp3';
    let dialUpAudio: HTMLAudioElement | null = null;

    if (!addressBar || !goButton || !iframe || !loadingEl) return;

    async function navigateToUrl(url: string): Promise<void> {
        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            // --- RESTORED DIALUP ANIMATION ---
            loadingEl.innerHTML = `
                <style>
                    .dialup-animation .dot {
                        animation: dialup-blink 1.4s infinite both;
                    }
                    .dialup-animation .dot:nth-child(2) {
                        animation-delay: 0.2s;
                    }
                    .dialup-animation .dot:nth-child(3) {
                        animation-delay: 0.4s;
                    }
                    @keyframes dialup-blink {
                        0%, 80%, 100% { opacity: 0; }
                        40% { opacity: 1; }
                    }
                    .browser-loading p { margin: 5px 0; }
                    .browser-loading .small-text { font-size: 0.8em; color: #aaa; }
                </style>
                <img src="https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/000/948/341/datas/original.gif"/>
                <p>Connecting to ${domain}<span class="dialup-animation"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span></p>
                <!-- Sound will play via JS -->
            `;
            loadingEl.style.display = 'flex';
            // --- END RESTORED DIALUP ANIMATION ---

            try {
                if (!dialUpAudio) {
                    dialUpAudio = new Audio(DIAL_UP_SOUND_URL); dialUpAudio.loop = true;
                }
                await dialUpAudio.play();
            } catch (audioError) { console.error("Dial-up sound error:", audioError); }

            try {
                if (!geminiInstance) {
                    if (!await initializeGeminiIfNeeded('initAiBrowser')) {
                        iframe.src = 'data:text/plain;charset=utf-8,AI Init Error';
                        loadingEl.style.display = 'none'; return;
                    }
                }
                const websitePrompt = `
                Create a complete 90s-style website for the domain "${domain}".
                MUST include: 1 relevant image, garish 90s styling (neon, comic sans, tables), content specific to "${domain}", scrolling marquee, retro emoji/ascii, blinking text, visitor counter (9000+), "Under Construction" signs. Fun, humorous, 1996 feel. Image MUST match theme. No modern design.
                `;
                 // @ts-ignore
                const result = await geminiInstance.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: [{role: 'user', parts: [{text: websitePrompt}]}],
                    config: { temperature: 0.9, responseModalities: ['TEXT', 'IMAGE'] }
                });
                let htmlContent = ""; const images: string[] = [];
                if (result.candidates?.[0]?.content) {
                    for (const part of result.candidates[0].content.parts) {
                        if (part.text) htmlContent += part.text.replace(/```html|```/g, '').trim();
                        else if (part.inlineData?.data) images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
                    }
                }
                if (!htmlContent.includes("<html")) {
                    htmlContent = `<!DOCTYPE html><html><head><title>${domain}</title><style>body{font-family:"Comic Sans MS";background:lime;color:blue;}marquee{background:yellow;color:red;}img{max-width:80%; display:block; margin:10px auto; border: 3px ridge gray;}</style></head><body><marquee>Welcome to ${domain}!</marquee><h1>${domain}</h1><div>${htmlContent}</div></body></html>`;
                }
                if (images.length > 0) {
                     if (!htmlContent.includes('<img src="data:')) {
                         htmlContent = htmlContent.replace(/(<\/h1>)/i, `$1\n<img src="${images[0]}" alt="Site Image">`);
                     }
                }
                iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
                addressBar.value = url;
            } catch (e: any) {
                iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(`<html><body>Error generating site: ${e.message}</body></html>`);
            } finally {
                loadingEl.style.display = 'none';
                if (dialUpAudio) { dialUpAudio.pause(); dialUpAudio.currentTime = 0; }
            }
        } catch (e) { alert("Invalid URL"); loadingEl.style.display = 'none'; }
    }
    goButton.addEventListener('click', () => navigateToUrl(addressBar.value));
    addressBar.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigateToUrl(addressBar.value); });
    addressBar.addEventListener('click', () => addressBar.select());
}

// --- MP3 Player Logic ---
function initMp3Player() {
    const mp3Window = document.getElementById('mp3Player');
    if (!mp3Window) return;

    const audio = new Audio();
    const trackList = mp3Window.querySelector('#mp3-track-list') as HTMLDivElement;
    const trackItems = trackList.querySelectorAll('.mp3-track-item');
    const trackInfo = mp3Window.querySelector('#mp3-track-info') as HTMLDivElement;
    const timeDisplay = mp3Window.querySelector('#mp3-time') as HTMLDivElement;
    const cdDisc = mp3Window.querySelector('#cd-disc') as HTMLDivElement;

    const btnPlay = mp3Window.querySelector('#mp3-play') as HTMLButtonElement;
    const btnPause = mp3Window.querySelector('#mp3-pause') as HTMLButtonElement;
    const btnStop = mp3Window.querySelector('#mp3-stop') as HTMLButtonElement;
    const btnPrev = mp3Window.querySelector('#mp3-prev') as HTMLButtonElement;
    const btnNext = mp3Window.querySelector('#mp3-next') as HTMLButtonElement;

    let currentTrackIndex = -1;

    function formatTime(seconds: number) {
        if (isNaN(seconds)) return "00:00";
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function updateTime() {
        timeDisplay.textContent = formatTime(audio.currentTime);
    }
    audio.addEventListener('timeupdate', updateTime);

    function setTrack(index: number) {
        if (index < 0 || index >= trackItems.length) return;
        currentTrackIndex = index;
        
        trackItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('playing');
                const src = item.getAttribute('data-src');
                if (src) {
                    audio.src = src;
                    trackInfo.textContent = item.textContent || "Unknown Track";
                }
            } else {
                item.classList.remove('playing');
            }
        });
        audio.play();
        cdDisc.classList.add('playing');
    }

    trackItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            setTrack(index);
        });
    });

    btnPlay.addEventListener('click', () => {
        if (currentTrackIndex === -1 && trackItems.length > 0) {
            setTrack(0);
        } else {
            audio.play();
            cdDisc.classList.add('playing');
        }
    });

    btnPause.addEventListener('click', () => {
        audio.pause();
        cdDisc.classList.remove('playing');
    });

    btnStop.addEventListener('click', () => {
        audio.pause();
        audio.currentTime = 0;
        cdDisc.classList.remove('playing');
        trackInfo.textContent = "STOPPED";
    });

    btnPrev.addEventListener('click', () => {
        if (currentTrackIndex > 0) {
            setTrack(currentTrackIndex - 1);
        }
    });

    btnNext.addEventListener('click', () => {
        if (currentTrackIndex < trackItems.length - 1) {
            setTrack(currentTrackIndex + 1);
        }
    });

    audio.addEventListener('ended', () => {
        cdDisc.classList.remove('playing');
        if (currentTrackIndex < trackItems.length - 1) {
            setTrack(currentTrackIndex + 1);
        } else {
            trackInfo.textContent = "END OF DISC";
        }
    });
}
initMp3Player();

// --- Event Listeners Setup ---

icons.forEach(icon => {
    icon.addEventListener('click', () => {
        const appName = icon.getAttribute('data-app');
        if (appName) {
            openApp(appName);
            startMenu.classList.remove('active');
        }
    });
});

document.querySelectorAll('.start-menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const appName = (item as HTMLElement).getAttribute('data-app');
        if (appName) openApp(appName);
        startMenu.classList.remove('active');
    });
});

startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.classList.toggle('active');
    if (startMenu.classList.contains('active')) {
        highestZIndex++;
        startMenu.style.zIndex = highestZIndex.toString();
    }
});

windows.forEach(windowElement => {
    const titleBar = windowElement.querySelector('.window-titlebar') as HTMLDivElement | null;
    const closeButton = windowElement.querySelector('.window-close') as HTMLDivElement | null;
    const minimizeButton = windowElement.querySelector('.window-minimize') as HTMLDivElement | null;

    windowElement.addEventListener('mousedown', () => bringToFront(windowElement), true);

    if (closeButton) {
        closeButton.addEventListener('click', (e) => { e.stopPropagation(); closeApp(windowElement.id); });
    }
    if (minimizeButton) {
        minimizeButton.addEventListener('click', (e) => { e.stopPropagation(); minimizeApp(windowElement.id); });
    }

    if (titleBar) {
        let isDragging = false;
        let dragOffsetX: number, dragOffsetY: number;
        const startDragging = (e: MouseEvent) => {
             if (!(e.target === titleBar || titleBar.contains(e.target as Node)) || (e.target as Element).closest('.window-control-button')) {
                 isDragging = false; return;
            }
            isDragging = true; bringToFront(windowElement);
            const rect = windowElement.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left; dragOffsetY = e.clientY - rect.top;
            titleBar.style.cursor = 'grabbing';
            document.addEventListener('mousemove', dragWindow);
            document.addEventListener('mouseup', stopDragging, { once: true });
        };
        const dragWindow = (e: MouseEvent) => {
            if (!isDragging) return;
            let x = e.clientX - dragOffsetX; let y = e.clientY - dragOffsetY;
            const taskbarHeight = taskbarAppsContainer.parentElement?.offsetHeight ?? 36;
            const maxX = window.innerWidth - windowElement.offsetWidth;
            const maxY = window.innerHeight - windowElement.offsetHeight - taskbarHeight;
            const minX = -(windowElement.offsetWidth - 40);
            const maxXAdjusted = window.innerWidth - 40;
            x = Math.max(minX, Math.min(x, maxXAdjusted));
            y = Math.max(0, Math.min(y, maxY));
            windowElement.style.left = `${x}px`; windowElement.style.top = `${y}px`;
        };
        const stopDragging = () => {
            if (!isDragging) return;
            isDragging = false; titleBar.style.cursor = 'grab';
            document.removeEventListener('mousemove', dragWindow);
        };
        titleBar.addEventListener('mousedown', startDragging);
    }

    if (!openApps.has(windowElement.id)) { // Only apply random for newly opened, not for bringToFront
        const randomTop = Math.random() * (window.innerHeight / 4) + 20;
        const randomLeft = Math.random() * (window.innerWidth / 3) + 20;
        windowElement.style.top = `${randomTop}px`;
        windowElement.style.left = `${randomLeft}px`;
    }
});

document.addEventListener('click', (e) => {
    if (startMenu.classList.contains('active') && !startMenu.contains(e.target as Node) && !startButton.contains(e.target as Node)) {
        startMenu.classList.remove('active');
    }
});

function findIconElement(appName: string): HTMLDivElement | undefined {
    return Array.from(icons).find(icon => icon.dataset.app === appName);
}

console.log("Gemini 95 Simulator Initialized (TS)");

async function critiquePaintDrawing(): Promise<void> {
    const paintWindow = document.getElementById('paint') as HTMLDivElement | null;
    if (!paintWindow || paintWindow.style.display === 'none') return;
    const canvas = paintWindow.querySelector('#paint-canvas') as HTMLCanvasElement | null;
    if (!canvas) { if (assistantBubble) assistantBubble.textContent = 'Error: Canvas not found!'; return; }
    if (!geminiInstance) {
        if (!await initializeGeminiIfNeeded('critiquePaintDrawing')) {
            if (assistantBubble) assistantBubble.textContent = 'Error: AI init failed!'; return;
        }
    }
    try {
        if (assistantBubble) assistantBubble.textContent = 'Analyzing...';
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = imageDataUrl.split(',')[1];
        if (!base64Data) throw new Error("Failed to get base64 data.");
        const prompt = "Critique this drawing with witty sarcasm (1-2 sentences).";
        const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
         // @ts-ignore
        const result = await geminiInstance.models.generateContent({ model: "gemini-2.5-pro-exp-03-25", contents: [{ role: "user", parts: [ { text: prompt }, imagePart] }] });
        const critique = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Is this art?";
        if (assistantBubble) assistantBubble.textContent = critique;
    } catch (error: any) {
        if (assistantBubble) assistantBubble.textContent = `Critique Error: ${error.message}`;
    }
}

function initSimplePaintApp(windowElement: HTMLDivElement): void {
    const canvas = windowElement.querySelector('#paint-canvas') as HTMLCanvasElement;
    const toolbar = windowElement.querySelector('.paint-toolbar') as HTMLDivElement;
    const contentArea = windowElement.querySelector('.window-content') as HTMLDivElement; // This is the direct parent managing canvas size
    const colorSwatches = windowElement.querySelectorAll('.paint-color-swatch') as NodeListOf<HTMLButtonElement>;
    const sizeButtons = windowElement.querySelectorAll('.paint-size-button') as NodeListOf<HTMLButtonElement>;
    const clearButton = windowElement.querySelector('.paint-clear-button') as HTMLButtonElement;

    if (!canvas || !toolbar || !contentArea || !clearButton) { return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { return; }

    let isDrawing = false; let lastX = 0; let lastY = 0;
    ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    let currentStrokeStyle = ctx.strokeStyle; let currentLineWidth = ctx.lineWidth;

    function resizeCanvas() {
        const rect = contentArea.getBoundingClientRect();
        const toolbarHeight = toolbar.offsetHeight;
        const newWidth = Math.floor(rect.width); // Canvas width is content area width
        const newHeight = Math.floor(rect.height - toolbarHeight); // Canvas height is content area height minus toolbar

        if (canvas.width === newWidth && canvas.height === newHeight && newWidth > 0 && newHeight > 0) return;

        canvas.width = newWidth > 0 ? newWidth : 1;
        canvas.height = newHeight > 0 ? newHeight : 1;

        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = currentStrokeStyle; ctx.lineWidth = currentLineWidth;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    }

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(contentArea);
    paintResizeObserverMap.set(contentArea, resizeObserver);
    resizeCanvas();

    function getMousePos(canvasDom: HTMLCanvasElement, event: MouseEvent | TouchEvent): { x: number, y: number } {
        const rect = canvasDom.getBoundingClientRect();
        let clientX, clientY;
        if (event instanceof MouseEvent) { clientX = event.clientX; clientY = event.clientY; }
        else { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }
    function startDrawing(e: MouseEvent | TouchEvent) {
        isDrawing = true; const pos = getMousePos(canvas, e);
        [lastX, lastY] = [pos.x, pos.y]; ctx.beginPath(); ctx.moveTo(lastX, lastY);
    }
    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing) return; e.preventDefault();
        const pos = getMousePos(canvas, e);
        ctx.lineTo(pos.x, pos.y); ctx.stroke();
        [lastX, lastY] = [pos.x, pos.y];
    }
    function stopDrawing() { if (isDrawing) isDrawing = false; }

    canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing); canvas.addEventListener('touchcancel', stopDrawing);

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            ctx.strokeStyle = swatch.dataset.color || 'black'; currentStrokeStyle = ctx.strokeStyle;
            colorSwatches.forEach(s => s.classList.remove('active')); swatch.classList.add('active');
            if (swatch.dataset.color === 'white') {
                const largeSizeButton = Array.from(sizeButtons).find(b => b.dataset.size === '10');
                if (largeSizeButton) {
                    ctx.lineWidth = parseInt(largeSizeButton.dataset.size || '10', 10); currentLineWidth = ctx.lineWidth;
                    sizeButtons.forEach(s => s.classList.remove('active')); largeSizeButton.classList.add('active');
                }
            } else {
                const activeSizeButton = Array.from(sizeButtons).find(b => b.classList.contains('active'));
                if (activeSizeButton) { ctx.lineWidth = parseInt(activeSizeButton.dataset.size || '2', 10); currentLineWidth = ctx.lineWidth; }
            }
        });
    });
    sizeButtons.forEach(button => {
        button.addEventListener('click', () => {
            ctx.lineWidth = parseInt(button.dataset.size || '2', 10); currentLineWidth = ctx.lineWidth;
            sizeButtons.forEach(s => s.classList.remove('active')); button.classList.add('active');
            const eraser = Array.from(colorSwatches).find(s => s.dataset.color === 'white');
            if (!eraser?.classList.contains('active')) {
                 if (!Array.from(colorSwatches).some(s => s.classList.contains('active'))) {
                    const blackSwatch = Array.from(colorSwatches).find(s => s.dataset.color === 'black');
                    blackSwatch?.classList.add('active'); ctx.strokeStyle = 'black'; currentStrokeStyle = ctx.strokeStyle;
                 }
            }
        });
    });
    clearButton.addEventListener('click', () => {
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
    (windowElement.querySelector('.paint-color-swatch[data-color="black"]') as HTMLButtonElement)?.classList.add('active');
    (windowElement.querySelector('.paint-size-button[data-size="2"]') as HTMLButtonElement)?.classList.add('active');
}

async function initInstagramApp(windowElement: HTMLDivElement): Promise<void> {
    const feed = windowElement.querySelector('#instagram-feed') as HTMLDivElement;
    const captureBtn = windowElement.querySelector('#insta-capture-btn') as HTMLButtonElement;
    const navBtns = windowElement.querySelectorAll('.insta-nav-btn');
    const tabs = windowElement.querySelectorAll('.insta-tab');
    const headerTitle = windowElement.querySelector('#insta-header-title') as HTMLSpanElement;
    const popularGrid = windowElement.querySelector('#insta-popular-grid') as HTMLDivElement;
    const profileGrid = windowElement.querySelector('#insta-profile-grid') as HTMLDivElement;
    
    if (!feed || !captureBtn) return;

    let mockPosts = [
        {
            user: 'retro_k1d',
            avatar: 'https://win98icons.alexmeub.com/icons/png/user_computer-0.png',
            img: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
            caption: 'Vintage camera ready for the weekend 📸 #vsco #vscocam #retro',
            time: '2h',
            likes: 124
        },
        {
            user: 'barista_life',
            avatar: 'https://win98icons.alexmeub.com/icons/png/user_world-0.png',
            img: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
            caption: 'Latte art on point this morning ☕️ Valencia filter is my fav! #coffee #monocle',
            time: '4h',
            likes: 542
        },
        {
            user: 'wanderlust_2012',
            avatar: 'https://win98icons.alexmeub.com/icons/png/computer_explorer_2k-0.png',
            img: 'https://images.unsplash.com/photo-1494548162494-384bba4ab999?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
            caption: 'Take me back to the sunrise 🌅 The Earlybird filter makes this look amazing. #sunrise #vacation',
            time: '8h',
            likes: 890
        }
    ];

    let userPosts = [];

    // Switch Tabs
    navBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget as HTMLButtonElement;
            const tabName = targetBtn.getAttribute('data-tab');
            
            // Adjust styles
            navBtns.forEach(b => {
                (b as HTMLButtonElement).style.color = '#aaa';
                (b as HTMLButtonElement).style.textShadow = 'none';
            });
            if (tabName !== 'camera') {
                targetBtn.style.color = 'white';
                targetBtn.style.textShadow = '0 0 5px rgba(255,255,255,0.5)';
            }
            
            // Hide all tabs
            tabs.forEach(t => (t as HTMLDivElement).style.display = 'none');
            
            // Show target
            const tabEl = windowElement.querySelector(`#insta-tab-${tabName}`) as HTMLDivElement;
            if(tabEl) {
                if(tabName === 'camera') {
                    tabEl.style.display = 'flex';
                    headerTitle.textContent = 'Camera';
                    headerTitle.style.fontFamily = 'Arial, sans-serif';
                    headerTitle.style.fontStyle = 'normal';
                } else {
                    tabEl.style.display = 'block';
                    
                    if (tabName === 'home') {
                        headerTitle.textContent = 'Instagram';
                        headerTitle.style.fontFamily = "'Billabong', 'Georgia', serif";
                        headerTitle.style.fontStyle = 'italic';
                    } else if (tabName === 'popular') {
                        headerTitle.textContent = 'Explore';
                        headerTitle.style.fontFamily = 'Arial, sans-serif';
                        headerTitle.style.fontStyle = 'normal';
                    } else if (tabName === 'reels') {
                        headerTitle.textContent = 'Reels';
                        headerTitle.style.fontFamily = 'Arial, sans-serif';
                        headerTitle.style.fontStyle = 'normal';
                    } else if (tabName === 'news') {
                        headerTitle.textContent = 'News';
                        headerTitle.style.fontFamily = 'Arial, sans-serif';
                        headerTitle.style.fontStyle = 'normal';
                    } else if (tabName === 'profile') {
                        headerTitle.textContent = 'you_in_2012';
                        headerTitle.style.fontFamily = 'Arial, sans-serif';
                        headerTitle.style.fontStyle = 'normal';
                    }
                }
            }
        });
    });

    const getRandomPost = () => {
        const users = ['vintage_junkie', '90s_kid', 'synthwave.guy', 'film_is_not_dead', 'skaterboy2000'];
        const rUser = users[Math.floor(Math.random() * users.length)];
        const rLikes = Math.floor(Math.random() * 900) + 10;
        const rId = Math.floor(Math.random() * 1000);
        return {
            user: rUser,
            avatar: `https://win98icons.alexmeub.com/icons/png/user_world-${Math.floor(Math.random() * 4)}.png`,
            img: `https://picsum.photos/500/500?random=${rId}`,
            caption: 'Another infinite post... #throwback #random',
            time: 'Just now',
            likes: rLikes
        };
    };

    function createPostHtml(post: any) {
        return `
            <div style="background: white; border: 1px solid #d3d3d3; border-radius: 3px; margin: 10px 0; padding-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                <div style="padding: 10px; display: flex; align-items: center; border-bottom: 1px solid #eee;">
                    <img src="${post.avatar}" style="width: 30px; height: 30px; border-radius: 3px; margin-right: 10px; border: 1px solid #ddd;">
                    <span style="font-weight: bold; color: #125688; font-family: Arial, sans-serif; font-size: 14px;">${post.user}</span>
                    <span style="margin-left: auto; color: #a5a7aa; font-size: 12px; font-family: Arial, sans-serif;">${post.time}</span>
                </div>
                <div style="position: relative; width: 100%; aspect-ratio: 1/1; overflow: hidden; background: #000;">
                    <img src="${post.img}" style="width: 100%; height: 100%; object-fit: cover; display: block; border-top: 1px solid #111; border-bottom: 1px solid #111; filter: sepia(0.3) contrast(1.1) brightness(0.9) saturate(1.2);">
                    <div style="position: absolute; top:0; left:0; right:0; bottom:0; box-shadow: inset 0 0 50px rgba(0,0,0,0.5); pointer-events: none;"></div>
                </div>
                <div style="padding: 10px; display: flex; gap: 15px;">
                   <button style="background: none; border: none; font-size: 24px; cursor: pointer; color: #aaa; padding: 0;" onclick="this.textContent = '♥️'; this.style.color = '#e0245e';">🤍</button>
                   <button style="background: none; border: none; font-size: 24px; cursor: pointer; color: #aaa; padding: 0;">💬</button>
                   <button style="background: none; border: none; font-size: 24px; cursor: pointer; color: #aaa; padding: 0; margin-left: auto;">⋯</button>
                </div>
                <div style="padding: 0 10px; font-weight: bold; color: #125688; font-size: 13px; font-family: Arial, sans-serif; margin-bottom: 5px;">
                   <span style="color: #ed4956;">♥️</span>  ${post.likes.toLocaleString()} likes
                </div>
                <div style="padding: 0 10px; font-size: 13px; font-family: Arial, sans-serif; line-height: 1.4;">
                   <span style="font-weight: bold; color: #125688;">${post.user}</span> 
                   ${post.caption}
                </div>
            </div>
        `;
    }

    const renderFeed = () => {
        feed.innerHTML = mockPosts.map(createPostHtml).join('');
    };
    
    // Infinite Scroll Feed
    const homeTabEl = windowElement.querySelector('#insta-tab-home') as HTMLDivElement;
    if (homeTabEl) {
        homeTabEl.addEventListener('scroll', () => {
            if (homeTabEl.scrollTop + homeTabEl.clientHeight >= homeTabEl.scrollHeight - 200) {
                // append new post
                const np = getRandomPost();
                mockPosts.push(np);
                const div = document.createElement('div');
                div.innerHTML = createPostHtml(np);
                feed.appendChild(div.firstElementChild!);
            }
        });
    }

    const loadStories = () => {
        const storiesTray = windowElement.querySelector('#instagram-stories') as HTMLDivElement;
        const storyModal = windowElement.querySelector('#insta-story-modal') as HTMLDivElement;
        const storyImg = windowElement.querySelector('#insta-story-img') as HTMLImageElement;
        const storyAvatar = windowElement.querySelector('#insta-story-avatar') as HTMLImageElement;
        const storyUser = windowElement.querySelector('#insta-story-user') as HTMLSpanElement;
        const storyTime = windowElement.querySelector('#insta-story-time') as HTMLSpanElement;
        const progress = windowElement.querySelector('#insta-story-progress') as HTMLDivElement;
        const closeBtn = windowElement.querySelector('#insta-story-close') as HTMLButtonElement;
        const prevHit = windowElement.querySelector('#insta-story-prev') as HTMLDivElement;
        const nextHit = windowElement.querySelector('#insta-story-next') as HTMLDivElement;

        if (!storiesTray) return;

        const mockStories = [
            { user: 'retro_k1d', avatar: 'https://win98icons.alexmeub.com/icons/png/user_computer-0.png', img: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', time: '1h' },
            { user: 'aesthetics', avatar: 'https://win98icons.alexmeub.com/icons/png/computer_explorer_2k-0.png', img: 'https://images.unsplash.com/photo-1505968409348-bd000797c92e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', time: '3h' },
            { user: 'vsco_girl', avatar: 'https://win98icons.alexmeub.com/icons/png/user_world-0.png', img: 'https://images.unsplash.com/photo-1517404215738-15263e9f9178?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', time: '5m' },
            { user: 'chill_vibes', avatar: 'https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-4.png', img: 'https://images.unsplash.com/photo-1494548162494-384bba4ab999?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', time: '12m' },
            { user: 'analog.io', avatar: 'https://win98icons.alexmeub.com/icons/png/camera3-0.png', img: 'https://images.unsplash.com/photo-1518599904199-0ca897819ddb?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', time: '8h' }
        ];

        let activeIdx = -1;
        let storyTimer: any = null;
        let progressVal = 0;

        const getRandomStory = () => {
            const users = ['digital_dreamer', 'lofi_study', 'vapor_wave', 'glitch_art', 'neon_nights'];
            const rUser = users[Math.floor(Math.random() * users.length)];
            const rId = Math.floor(Math.random() * 1000);
            return {
                user: rUser,
                avatar: `https://win98icons.alexmeub.com/icons/png/user_computer-${Math.floor(Math.random() * 2)}.png`,
                img: `https://picsum.photos/400/700?random=${rId}`,
                time: 'Just now'
            };
        };

        const renderStoriesTray = () => {
            let storyHtml = '';
            mockStories.forEach((s, idx) => {
                storyHtml += `
                <div class="insta-story-ring" data-idx="${idx}" style="cursor: pointer; display: flex; flex-direction: column; align-items: center; min-width: 64px;">
                    <div style="background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); padding: 3px; border-radius: 50%;">
                        <img src="${s.avatar}" style="width: 56px; height: 56px; border-radius: 50%; border: 2px solid white; display: block; background: #eee;">
                    </div>
                    <span style="font-family: Arial, sans-serif; font-size: 11px; margin-top: 5px; color: #262626; text-overflow: ellipsis; overflow: hidden; width: 64px; text-align: center; white-space: nowrap;">${s.user}</span>
                </div>`;
            });
            storiesTray.innerHTML = storyHtml;
            storiesTray.querySelectorAll('.insta-story-ring').forEach(ring => {
                ring.addEventListener('click', (e) => {
                    const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-idx') || '0', 10);
                    openStory(idx);
                });
            });
        };

        const openStory = (idx: number) => {
            if (idx < 0) {
                closeStory();
                return;
            }
            if (idx >= mockStories.length) {
                // Infinite stories
                mockStories.push(getRandomStory());
                renderStoriesTray(); // Update tray
            }
            activeIdx = idx;
            const s = mockStories[idx];
            storyImg.src = s.img;
            storyAvatar.src = s.avatar;
            storyUser.innerText = s.user;
            storyTime.innerText = s.time;
            
            storyModal.style.display = 'flex';
            prevHit.style.display = 'block';
            nextHit.style.display = 'block';
            
            progressVal = 0;
            progress.style.width = '0%';
            
            if (storyTimer) clearInterval(storyTimer);
            storyTimer = setInterval(() => {
                progressVal += 1;
                progress.style.width = Math.min(progressVal, 100) + '%';
                if (progressVal >= 100) {
                    openStory(activeIdx + 1);
                }
            }, 30); // ~3 seconds per story
        };

        const closeStory = () => {
            storyModal.style.display = 'none';
            prevHit.style.display = 'none';
            nextHit.style.display = 'none';
            if (storyTimer) clearInterval(storyTimer);
        };

        storiesTray.querySelectorAll('.insta-story-ring').forEach(ring => {
            ring.addEventListener('click', (e) => {
                const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-idx') || '0', 10);
                openStory(idx);
            });
        });

        closeBtn.addEventListener('click', closeStory);
        prevHit.addEventListener('click', () => openStory(activeIdx - 1));
        nextHit.addEventListener('click', () => openStory(activeIdx + 1));
    };

    const loadPopular = () => {
        let popHtml = '';
        const popUrls = [
            'https://images.unsplash.com/photo-1520116468816-95b69f847357?w=150&q=80',
            'https://images.unsplash.com/photo-1518599904199-0ca897819ddb?w=150&q=80',
            'https://images.unsplash.com/photo-1505968409348-bd000797c92e?w=150&q=80',
            'https://images.unsplash.com/photo-1481833751842-31b70f7e1e62?w=150&q=80',
            'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=150&q=80',
            'https://images.unsplash.com/photo-1511556820780-d912e42b4980?w=150&q=80',
            'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=150&q=80',
            'https://images.unsplash.com/photo-1517404215738-15263e9f9178?w=150&q=80',
            'https://images.unsplash.com/photo-1503249023995-51b0f3778ccf?w=150&q=80',
            'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=150&q=80',
            'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=150&q=80',
            'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=150&q=80'
        ];
        
        popUrls.forEach(url => {
            popHtml += `<img src="${url}" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; filter: sepia(0.3) saturate(1.2);">`;
        });
        popularGrid.innerHTML = popHtml;
    };
    
    const updateProfileGrid = () => {
        let pfHtml = '';
        userPosts.forEach((post: any) => {
            pfHtml += `<img src="${post.img}" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; filter: sepia(0.3) saturate(1.2);">`;
        });
        profileGrid.innerHTML = pfHtml;
        // Update post count
        const profSection = windowElement.querySelector('#insta-tab-profile') as HTMLDivElement;
        const ptsCount = profSection.querySelectorAll('.font-weight: bold; font-size: 16px;')[0];
        if (ptsCount) (ptsCount as HTMLElement).innerText = userPosts.length.toString();
    };

    const initReels = () => {
        const reelsContainer = windowElement.querySelector('#instagram-reels-container') as HTMLDivElement;
        if (!reelsContainer) return;

        const videoLinks = [
            'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
            'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
            'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
            'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
            'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4'
        ];

        const createReelEl = () => {
            const vidUrl = videoLinks[Math.floor(Math.random() * videoLinks.length)];
            const rUser = 'reel_creator_' + Math.floor(Math.random() * 1000);
            const rLikes = Math.floor(Math.random() * 9000) + 100;
            const rDesc = "Watch this amazing #reel! 🔥💯 #trending #foryou";
            const id = Math.random().toString(36).substring(7);

            const div = document.createElement('div');
            div.style.cssText = "width: 100%; height: 100%; scroll-snap-align: start; position: relative; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center;";
            div.innerHTML = `
                <video src="${vidUrl}" loop playsinline style="width: 100%; height: 100%; object-fit: cover;" id="reel-vid-${id}"></video>
                <div style="position: absolute; top:0; left:0; right:0; bottom:0; background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%); pointer-events: none;"></div>
                <div style="position: absolute; right: 15px; bottom: 80px; display: flex; flex-direction: column; gap: 20px; align-items: center; z-index: 5;">
                    <button style="background: none; border: none; color: white; font-size: 30px; cursor: pointer; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">🤍<div style="font-size: 12px; font-family: sans-serif; font-weight: bold; margin-top:2px;">${(rLikes/1000).toFixed(1)}k</div></button>
                    <button style="background: none; border: none; color: white; font-size: 30px; cursor: pointer; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">💬<div style="font-size: 12px; font-family: sans-serif; font-weight: bold; margin-top:2px;">${Math.floor(Math.random()*500)}</div></button>
                    <button style="background: none; border: none; color: white; font-size: 30px; cursor: pointer; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">↪️<div style="font-size: 12px; font-family: sans-serif; font-weight: bold; margin-top:2px;">Share</div></button>
                    <div style="width: 30px; height: 30px; border-radius: 5px; border: 2px solid white; background: #fff; overflow:hidden;" class="rotating-record">
                        <img src="https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-4.png" style="width:100%; height:100%; object-fit: cover;">
                    </div>
                </div>
                <div style="position: absolute; left: 15px; bottom: 60px; right: 70px; z-index: 5; color: white; font-family: sans-serif;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <img src="https://win98icons.alexmeub.com/icons/png/user_world-${Math.floor(Math.random()*4)}.png" style="width: 35px; height: 35px; border-radius: 50%; border: 1px solid white;">
                        <span style="font-weight: bold; font-size: 15px;">${rUser}</span>
                        <button style="background: transparent; border: 1px solid white; border-radius: 5px; color: white; padding: 3px 8px; font-size: 12px; cursor: pointer;">Follow</button>
                    </div>
                    <div style="font-size: 14px; margin-bottom: 8px;">${rDesc}</div>
                    <div style="font-size: 12px; display: flex; align-items: center; gap: 5px;">
                        <span>🎵</span> Original Audio
                    </div>
                </div>
                <div style="position: absolute; top:0; left:0; right:0; bottom:0; z-index: 10; cursor: pointer;" class="reel-play-overlay"></div>
            `;
            return div;
        };

        // Initialize with 3 reels
        for(let i = 0; i < 3; i++) {
            reelsContainer.appendChild(createReelEl());
        }

        const videos = reelsContainer.querySelectorAll('video');
        let currentPlaying: HTMLVideoElement | null = null;
        
        // Setup observer for Intersection to play/pause
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const vid = entry.target.querySelector('video');
                if (!vid) return;

                if (entry.isIntersecting) {
                    vid.play().catch(e => console.log('Autoplay blocked', e));
                    currentPlaying = vid;
                } else {
                    vid.pause();
                    vid.currentTime = 0; // reset
                }
            });
        }, { threshold: 0.6 });

        reelsContainer.childNodes.forEach(child => {
            if (child.nodeType === 1) observer.observe(child as Element);
        });

        // Add infinite scroll
        reelsContainer.addEventListener('scroll', () => {
            if (reelsContainer.scrollTop + reelsContainer.clientHeight >= reelsContainer.scrollHeight - windowElement.clientHeight) {
                // append 2 more
                for(let i=0; i<2; i++) {
                    const newR = createReelEl();
                    reelsContainer.appendChild(newR);
                    observer.observe(newR);
                }
            }
        });

        // Add pause/play toggle on click
        reelsContainer.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).classList.contains('reel-play-overlay')) {
                const vid = (e.target as HTMLElement).parentElement?.querySelector('video');
                if (vid) {
                    if (vid.paused) vid.play();
                    else vid.pause();
                }
            }
        });
    };

    renderFeed();
    loadPopular();
    loadStories();
    initReels();

    captureBtn.addEventListener('click', async () => {
        const ogContent = captureBtn.innerHTML;
        captureBtn.disabled = true;
        captureBtn.innerHTML = 'Hacking...';
        
        try {
            if (!geminiInstance) {
                if (!await initializeGeminiIfNeeded('initInstagramApp')) {
                    captureBtn.innerHTML = '❌';
                    return;
                }
            }

            // Quick AI post generation
            const prompt = "Generate a very nostalgic 2012 vintage photography style image. Like a heavily filtered photo of a coffee, a polaroid, sneakers, a skateboarding, or a sunset. Square format, retro, low-fi, Vignette. NO text.";
            
            // @ts-ignore
            const result = await geminiInstance.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: [{role: 'user', parts: [{text: prompt}]}],
                config: { temperature: 0.9, responseModalities: ['IMAGE'] }
            });
            let imageUrl = '';
            if (result.candidates?.[0]?.content) {
                for (const part of result.candidates[0].content.parts) {
                    if (part.inlineData?.data) {
                        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                        break;
                    }
                }
            }
            
            if (imageUrl) {
                const newPost = {
                    user: 'you_in_2012', 
                    avatar: 'https://win98icons.alexmeub.com/icons/png/msie1-0.png', 
                    img: imageUrl, 
                    caption: 'Just took this! The new filters are insane... 😍 #2012 #retro #x-proII', 
                    time: '1m',
                    likes: Math.floor(Math.random() * 50) + 5
                };
                mockPosts.unshift(newPost);
                userPosts.unshift(newPost);
                
                renderFeed();
                updateProfileGrid();
                
                // switch to home tab automatically
                (navBtns[0] as HTMLButtonElement).click();
                feed.scrollTop = 0;
            }
        } catch (e: any) {
            console.error('Camera generation error', e);
        } finally {
            captureBtn.disabled = false;
            captureBtn.innerHTML = ogContent;
        }
    });
}

function initMyComputer(windowElement: HTMLDivElement): void {
    const cDriveIcon = windowElement.querySelector('#c-drive-icon') as HTMLDivElement;
    const cDriveContent = windowElement.querySelector('#c-drive-content') as HTMLDivElement;
    const secretImageIcon = windowElement.querySelector('#secret-image-icon') as HTMLDivElement;
    if (!cDriveIcon || !cDriveContent || !secretImageIcon) return;
    cDriveIcon.addEventListener('click', () => {
        cDriveIcon.style.display = 'none'; cDriveContent.style.display = 'block';
    });
    secretImageIcon.addEventListener('click', () => {
        const imageViewerWindow = document.getElementById('imageViewer') as HTMLDivElement | null;
        const imageViewerImg = document.getElementById('image-viewer-img') as HTMLImageElement | null;
        const imageViewerTitle = document.getElementById('image-viewer-title') as HTMLSpanElement | null;
        if (!imageViewerWindow || !imageViewerImg || !imageViewerTitle) { alert("Image Viewer corrupted!"); return; }
        imageViewerImg.src = 'https://storage.googleapis.com/gemini-95-icons/%40ammaar%2B%40olacombe.png';
        imageViewerImg.alt = 'dontshowthistoanyone.jpg';
        imageViewerTitle.textContent = 'dontshowthistoanyone.jpg - Image Viewer';
        openApp('imageViewer');
    });
    cDriveIcon.style.display = 'inline-flex'; cDriveContent.style.display = 'none';
}

// --- YouTube Player (MFSPlayer) Logic ---
function loadYouTubeApi(): Promise<void> {
    if (ytApiLoaded) return Promise.resolve();
    if (ytApiLoadingPromise) return ytApiLoadingPromise;

    ytApiLoadingPromise = new Promise((resolve, reject) => {
        // @ts-ignore
        if (window.YT && window.YT.Player) {
            ytApiLoaded = true; resolve(); return;
        }
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        tag.onerror = (err) => {
            console.error("Failed to load YouTube API script:", err);
            ytApiLoadingPromise = null;
            reject(new Error("YouTube API script load failed"));
        };
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);

        // @ts-ignore
        window.onYouTubeIframeAPIReady = () => {
            ytApiLoaded = true; ytApiLoadingPromise = null; resolve();
        };
        setTimeout(() => {
            if (!ytApiLoaded) {
                 // @ts-ignore
                if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady = null;
                ytApiLoadingPromise = null;
                reject(new Error("YouTube API load timeout"));
            }
        }, 10000);
    });
    return ytApiLoadingPromise;
}

function getYouTubeVideoId(urlOrId: string): string | null {
    if (!urlOrId) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
    const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11}).*/;
    const match = urlOrId.match(regExp);
    return (match && match[1]) ? match[1] : null;
}

async function initMediaPlayer(windowElement: HTMLDivElement): Promise<void> {
    const appName = windowElement.id; // 'mediaPlayer'
    const urlInput = windowElement.querySelector('.media-player-input') as HTMLInputElement;
    const loadButton = windowElement.querySelector('.media-player-load-button') as HTMLButtonElement;
    const playerContainerDivId = `youtube-player-${appName}`;
    const playerDiv = windowElement.querySelector(`#${playerContainerDivId}`) as HTMLDivElement;
    const playButton = windowElement.querySelector('#media-player-play') as HTMLButtonElement;
    const pauseButton = windowElement.querySelector('#media-player-pause') as HTMLButtonElement;
    const stopButton = windowElement.querySelector('#media-player-stop') as HTMLButtonElement;

    if (!urlInput || !loadButton || !playerDiv || !playButton || !pauseButton || !stopButton) {
        console.error("Media Player elements not found for", appName);
        if (playerDiv) playerDiv.innerHTML = `<p class="media-player-status-message" style="color:red;">Error: Player UI missing.</p>`;
        return;
    }

    const updateButtonStates = (playerState?: number) => {
        // @ts-ignore
        const YTPlayerState = window.YT?.PlayerState;
        if (!YTPlayerState) {
             playButton.disabled = true; pauseButton.disabled = true; stopButton.disabled = true;
             return;
        }
        const state = playerState !== undefined ? playerState
            // @ts-ignore
            : (youtubePlayers[appName] && typeof youtubePlayers[appName].getPlayerState === 'function' ? youtubePlayers[appName].getPlayerState() : YTPlayerState.UNSTARTED);

        playButton.disabled = state === YTPlayerState.PLAYING || state === YTPlayerState.BUFFERING;
        pauseButton.disabled = state !== YTPlayerState.PLAYING && state !== YTPlayerState.BUFFERING; // Can pause if buffering too
        stopButton.disabled = state === YTPlayerState.ENDED || state === YTPlayerState.UNSTARTED || state === -1 /* UNSTARTED also seen as -1 */;
    };

    updateButtonStates(-1); // Initial state (unstarted)

    const showPlayerMessage = (message: string, isError: boolean = false) => {
        const player = youtubePlayers[appName];
        if (player) {
            try { if (typeof player.destroy === 'function') player.destroy(); }
            catch(e) { console.warn("Minor error destroying player:", e); }
            delete youtubePlayers[appName];
        }
        playerDiv.innerHTML = `<p class="media-player-status-message" style="color:${isError ? 'red' : '#ccc'};">${message}</p>`;
        updateButtonStates(-1);
    };

    const initialStatusMessageEl = playerDiv.querySelector('.media-player-status-message');
    if (initialStatusMessageEl) initialStatusMessageEl.textContent = 'Connecting to YouTube...';

    try {
        await loadYouTubeApi();
        if (initialStatusMessageEl) initialStatusMessageEl.textContent = 'YouTube API Ready. Loading default video...';
    } catch (error: any) {
        showPlayerMessage(`Error: Could not load YouTube Player API. ${error.message}`, true);
        return;
    }

    const createPlayer = (videoId: string) => {
        const existingPlayer = youtubePlayers[appName];
        if (existingPlayer) {
            try { if (typeof existingPlayer.destroy === 'function') existingPlayer.destroy(); }
            catch(e) { console.warn("Minor error destroying previous player:", e); }
        }
        playerDiv.innerHTML = ''; // Clear previous content/message

        try {
            // @ts-ignore
            youtubePlayers[appName] = new YT.Player(playerContainerDivId, {
                height: '100%', width: '100%', videoId: videoId,
                playerVars: { 'playsinline': 1, 'autoplay': 1, 'controls': 0, 'modestbranding': 1, 'rel': 0, 'fs': 0, 'origin': window.location.origin },
                events: {
                    'onReady': (event: any) => { /* Autoplay handles start */ updateButtonStates(event.target.getPlayerState()); },
                    'onError': (event: any) => {
                        const errorMessages: { [key: number]: string } = { 2: "Invalid video ID.", 5: "HTML5 Player error.", 100: "Video not found/private.", 101: "Playback disallowed.", 150: "Playback disallowed."};
                        showPlayerMessage(errorMessages[event.data] || `Playback Error (Code: ${event.data})`, true);
                    },
                    'onStateChange': (event: any) => { updateButtonStates(event.data); }
                }
            });
        } catch (error: any) {
             showPlayerMessage(`Failed to create video player: ${error.message}`, true);
        }
    };

    loadButton.addEventListener('click', () => {
        const videoUrlOrId = urlInput.value.trim();
        const videoId = getYouTubeVideoId(videoUrlOrId);
        if (videoId) {
             showPlayerMessage("Loading video..."); // Show loading message immediately
             createPlayer(videoId);
        } else {
            showPlayerMessage("Invalid YouTube URL or Video ID.", true);
        }
    });

    playButton.addEventListener('click', () => {
        const player = youtubePlayers[appName];
        // @ts-ignore
        if (player && typeof player.playVideo === 'function') player.playVideo();
    });
    pauseButton.addEventListener('click', () => {
        const player = youtubePlayers[appName];
        // @ts-ignore
        if (player && typeof player.pauseVideo === 'function') player.pauseVideo();
    });
    stopButton.addEventListener('click', () => {
        const player = youtubePlayers[appName];
        // @ts-ignore
        if (player && typeof player.stopVideo === 'function') {
            player.stopVideo();
            // @ts-ignore - Manually set to ended for button state update
            updateButtonStates(window.YT?.PlayerState?.ENDED);
        }
    });

    if (DEFAULT_YOUTUBE_VIDEO_ID) {
        if (initialStatusMessageEl) initialStatusMessageEl.textContent = `Loading default video...`; // Update message
        createPlayer(DEFAULT_YOUTUBE_VIDEO_ID);
    } else {
        // Message already set by HTML if no default video.
        // showPlayerMessage("Enter a YouTube URL or Video ID and click 'Load'.");
    }
}
// --- END YouTube Player Logic ---

async function initializeGeminiIfNeeded(context: string): Promise<boolean> {
    if (geminiInstance) return true;
    try {
        const module = await import('@google/genai');
        // @ts-ignore
        const GoogleAIClass = module.GoogleGenAI;
        if (typeof GoogleAIClass !== 'function') throw new Error("GoogleGenAI constructor not found.");
        // @ts-ignore
        const apiKey = process.env.GEMINI_API_KEY || "";
        if (!apiKey) {
            alert("CRITICAL ERROR: Gemini API Key missing.");
            throw new Error("API Key is missing.");
        }
         // @ts-ignore
        geminiInstance = new GoogleAIClass({apiKey: apiKey});
        return true;
    } catch (error: any) {
        console.error(`Failed Gemini initialization in ${context}:`, error);
        alert(`CRITICAL ERROR: Gemini AI failed to initialize. ${error.message}`);
        return false;
    }
}

let subwaySurferReq: number | null = null;
function initSubwaySurfer(windowEl: HTMLDivElement) {
    const canvas = windowEl.querySelector('#subwaysurfer-canvas') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');
    const overlay = windowEl.querySelector('#subwaysurfer-overlay') as HTMLDivElement;
    const startBtn = windowEl.querySelector('#subwaysurfer-startBtn') as HTMLButtonElement;
    const scoreEl = windowEl.querySelector('#subwaysurfer-score') as HTMLDivElement;
    const aiBtn = windowEl.querySelector('#subwaysurfer-aiBtn') as HTMLButtonElement;
    if (!canvas || !ctx || !overlay || !startBtn || !scoreEl) return;

    if (subwaySurferReq) { cancelAnimationFrame(subwaySurferReq); subwaySurferReq = null; }

    let width = canvas.clientWidth || 400;
    let height = canvas.clientHeight || 500;
    canvas.width = width;
    canvas.height = height;

    let aiPlayerImg: HTMLImageElement | null = null;
    let aiObstacleImg: HTMLImageElement | null = null;
    let aiBgImg: HTMLImageElement | null = null;

    if (aiBtn) {
        aiBtn.onclick = async () => {
            aiBtn.disabled = true;
            aiBtn.textContent = 'Generating... ⏳';
            startBtn.disabled = true;

            try {
                if (!geminiInstance) {
                    if (!await initializeGeminiIfNeeded('initSubwaySurfer')) {
                        aiBtn.textContent = 'Error x_x';
                        return;
                    }
                }
                
                const promptPlayer = "A cool Y2K retro 90s character sprite riding a hoverboard, side view facing right, pure white background. NO TEXT";
                const promptBg = "Side scrolling video game background, retro 90s vaporwave, synthwave city skyline, neon colors. NO TEXT";
                
                const [playerRes, bgRes] = await Promise.all([
                    // @ts-ignore
                    geminiInstance.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: [{role: 'user', parts: [{text: promptPlayer}]}],
                        config: { temperature: 0.9, responseModalities: ['IMAGE'] }
                    }),
                    // @ts-ignore
                    geminiInstance.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: [{role: 'user', parts: [{text: promptBg}]}],
                        config: { temperature: 0.9, responseModalities: ['IMAGE'] }
                    })
                ]);
                
                const extractImage = (result: any) => {
                    if (result.candidates?.[0]?.content) {
                        for (const part of result.candidates[0].content.parts) {
                            if (part.inlineData?.data) {
                                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                            }
                        }
                    }
                    return null;
                }
                
                const pUrl = extractImage(playerRes);
                const bUrl = extractImage(bgRes);

                if (pUrl) { aiPlayerImg = new Image(); aiPlayerImg.src = pUrl; }
                if (bUrl) { aiBgImg = new Image(); aiBgImg.src = bUrl; }

                aiBtn.style.display = 'none';
            } catch(e) {
                console.error("Asset generation error", e);
                aiBtn.textContent = 'Failed. Try Again';
            } finally {
                aiBtn.disabled = false;
                startBtn.disabled = false;
                if(aiPlayerImg) reset();
            }
        };
    }

    let playing = false;
    let score = 0;
    let speed = 5;
    let frameObj = 0;
    
    // Y2K Retro colors
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff00aa', '#00ffaa'];
    
    const player = { x: 50, y: height - 100, width: 40, height: 60, dy: 0, gravity: 0.6, jumpPower: -13, grounded: false, doubleJumped: false };
    const obstacles: any[] = [];
    const particles: any[] = [];
    const stars: any[] = Array.from({length: 50}, () => ({x: Math.random()*width, y: Math.random()*(height-100), s: Math.random()*2}));
    
    function reset() {
        score = 0;
        speed = 5;
        frameObj = 0;
        player.y = height - 100;
        player.dy = 0;
        player.doubleJumped = false;
        obstacles.length = 0;
        particles.length = 0;
        playing = true;
        overlay.style.display = 'none';
        scoreEl.innerText = `Score: ${score}`;
        loop();
    }
    
    function jump() {
        if (!playing) {
            reset();
            return;
        }
        if (player.grounded) {
            player.dy = player.jumpPower;
            player.grounded = false;
            player.doubleJumped = false;
            createParticles(player.x + 20, player.y + 60, 10, '#fff');
        } else if (!player.doubleJumped) {
            player.dy = player.jumpPower * 0.8;
            player.doubleJumped = true;
            createParticles(player.x + 20, player.y + 60, 15, '#0ff');
        }
    }

    startBtn.onclick = reset;
    canvas.onmousedown = jump;
    canvas.ontouchstart = (e) => { e.preventDefault(); jump(); };
    
    function createParticles(x: number, y: number, count: number, color: string) {
        for(let i=0; i<count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1.0,
                color
            });
        }
    }

    function drawPlayer() {
        if (!ctx) return;
        if (aiPlayerImg && aiPlayerImg.complete && aiPlayerImg.naturalWidth > 0) {
            const prevMode = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'multiply';
            // maintain aspect ratio approximately, character shouldn't stretch too much
            ctx.drawImage(aiPlayerImg, player.x - 20, player.y - 20, player.width + 40, player.height + 40);
            ctx.globalCompositeOperation = prevMode;
            return;
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff66b2';
        ctx.fillStyle = '#ff66b2'; 
        
        // draw hoverboard
        ctx.fillRect(player.x - 5, player.y + player.height - 5, player.width + 10, 10);
        
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.fillRect(player.x, player.y, player.width, player.height - 10);
        
        // cool visor
        ctx.fillStyle = '#0ff';
        ctx.shadowColor = '#0ff';
        ctx.fillRect(player.x + 15, player.y + 10, 25, 10);
        ctx.shadowBlur = 0;
    }
    
    function drawObstacles() {
        if (!ctx) return;
        for (const obs of obstacles) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = obs.color;
            ctx.fillStyle = obs.color;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            
            // Inner core
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;
            ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, obs.height - 10);
        }
    }
    
    function drawDecorations() {
        if (!ctx) return;
        
        if (aiBgImg && aiBgImg.complete && aiBgImg.naturalWidth > 0) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(aiBgImg, 0, 0, width, height);
            ctx.globalAlpha = 1.0;
        }

        // Parallax Stars
        ctx.fillStyle = '#fff';
        for(let s of stars) {
            s.x -= speed * 0.1;
            if(s.x < 0) s.x = width;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.s, 0, Math.PI*2);
            ctx.fill();
        }

        // Sun
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ff00ff';
        ctx.fillStyle = '#ff00aa';
        ctx.beginPath();
        ctx.arc(width/2, height - 100, 80, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Grid floor
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1;
        const gridOffset = (score * speed * 0.5) % 40;
        
        // Perspective lines
        for (let i = -width; i < width*2; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i - gridOffset, height - 40);
            const centerDist = (i - gridOffset) - width/2;
            ctx.lineTo(width/2 + centerDist * 3, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for(let j = 0; j < 40; j+=10) {
            ctx.beginPath();
            ctx.moveTo(0, height - 40 + j);
            ctx.lineTo(width, height - 40 + j);
            ctx.stroke();
        }
    }
    
    function updateAndDrawParticles() {
        if (!ctx) return;
        for(let i=particles.length-1; i>=0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 4, 4);
        }
        ctx.globalAlpha = 1.0;
    }

    function loop() {
        if (!playing) return;
        if (!ctx) return;
        
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        
        // create trailing effect
        ctx.fillStyle = 'rgba(0, 0, 10, 0.4)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#111';
        ctx.fillRect(0, height - 40, width, 40);
        
        drawDecorations();
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0ff';
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, height - 40);
        ctx.lineTo(width, height - 40);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Player physics
        player.dy += player.gravity;
        player.y += player.dy;
        if (player.y + player.height > height - 40) {
            player.y = height - 40 - player.height;
            player.dy = 0;
            player.grounded = true;
            player.doubleJumped = false;
        }

        // Particle trail from hoverboard
        if (player.grounded && Math.random() > 0.5) {
            createParticles(player.x + 5, player.y + player.height, 1, '#ff66b2');
        }
        
        updateAndDrawParticles();
        
        // Spawn obstacles
        frameObj++;
        if (frameObj % Math.max(30, Math.floor(120 - speed * 5)) === 0) {
            let ow = 30 + Math.random() * 20;
            let oh = 40 + Math.random() * 50;
            let c = colors[Math.floor(Math.random() * colors.length)];
            obstacles.push({ x: width, y: height - 40 - oh, width: ow, height: oh, color: c });
        }
        
        // Move obstacles and collision
        for (let i = 0; i < obstacles.length; i++) {
            let o = obstacles[i];
            o.x -= speed;
            
            // Collision logic
            if (player.x < o.x + o.width && 
                player.x + player.width > o.x && 
                player.y < o.y + o.height && 
                player.y + player.height > o.y) {
                    
                    // CRASH!
                    createParticles(player.x + 20, player.y + 30, 50, '#ff0000');
                    updateAndDrawParticles();

                    playing = false;
                    const msg = overlay.querySelector('p');
                    if(msg) msg.innerHTML = `<span style="color:#f0f; font-size:1.5em; font-weight:bold; text-shadow: 2px 2px #0ff;">GAME OVER</span><br/><br/>Score: ${Math.floor(score)}<br/>Speed: ${speed.toFixed(1)}<br/><br/>Tap to Retry`;
                    overlay.style.display = 'flex';
                    subwaySurferReq = requestAnimationFrame(() => {}); // Pause
                    return;
            }
        }
        
        // remove old obstacles
        while(obstacles.length > 0 && obstacles[0].x + obstacles[0].width < 0) {
            obstacles.shift();
            score += 10;
            scoreEl.innerText = `Score: ${score}`;
            if (score % 50 === 0) speed += 0.5; // increase speed
        }
        
        drawPlayer();
        drawObstacles();
        
        subwaySurferReq = requestAnimationFrame(loop);
    }
}

