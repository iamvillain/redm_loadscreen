document.addEventListener('DOMContentLoaded', () => {
    let CONFIG = {
        logoUrl: "https://via.placeholder.com/150x50.png?text=Loading...",
        enableMusic: false,
        youtubeVideoId: null,
        initialVolume: 30,
        messages: ["Loading..."],
        enableChangelog: false,
        changelogTitle: "Updates",
        changelogEntry: null,
        enableDiscordBackgrounds: false,
        backgroundImageUrls: [],
        serverName: "RedM Server"
    };

    const logoElement = document.getElementById('logo');
    const messageText = document.getElementById('message-text');
    const handoverName = document.getElementById('handover-name');
    const handoverAddress = document.getElementById('handover-address');
    const loadingBar = document.getElementById('loading-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const statusText = document.getElementById('status-text');
    const logText = document.getElementById('log-text');
    const musicControls = document.getElementById('music-controls');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const volumeSlider = document.getElementById('volume-slider');
    const changelogContainer = document.getElementById('changelog-container');
    const changelogTitle = document.getElementById('changelog-title');
    const changelogEntries = document.getElementById('changelog-entries');
    const bgImage1 = document.getElementById('bg-image-1');
    const bgImage2 = document.getElementById('bg-image-2');

    let messageInterval;
    let currentMessageIndex = -1;
    let player;
    let musicReady = false;
    let musicShouldBePlaying = true;
    let playerApiReady = false;
    let messagesToShow = CONFIG.messages;
    let backgroundUrls = [];
    let validIndices = [];
    let currentBgIndex = -1;
    let activeBgDiv = bgImage1;
    let inactiveBgDiv = bgImage2;
    let bgInterval = null;
    const BG_CHANGE_INTERVAL = 10000;

    function preloadImage(url) {
        return new Promise((resolve, reject) => {
            if (!url) {
                reject(new Error("Invalid URL provided for preloading."));
                return;
            }
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = (err) => {
                console.error("[LoadScreen] Image preload failed:", url, err);
                reject(err);
            };
            img.src = url;
        });
    }

    async function changeBackground() {
        if (!validIndices || validIndices.length < 2) {
            if (bgInterval) clearInterval(bgInterval);
            bgInterval = null;
            return;
        }
        let possibleNextIndices = validIndices.filter(index => index !== currentBgIndex);
        if (possibleNextIndices.length === 0) {
            possibleNextIndices = validIndices;
        }
        const randomPossibleIndexPosition = Math.floor(Math.random() * possibleNextIndices.length);
        const nextIndex = possibleNextIndices[randomPossibleIndexPosition];
        const nextImageUrl = backgroundUrls[nextIndex];
        if (!nextImageUrl) {
            console.error("[LoadScreen] Randomly selected next index resulted in invalid URL:", nextIndex);
            return;
        }
        try {
            await preloadImage(nextImageUrl);
            inactiveBgDiv.style.backgroundImage = `url('${nextImageUrl}')`;
            activeBgDiv.style.opacity = 0;
            inactiveBgDiv.style.opacity = 1;
            const temp = activeBgDiv;
            activeBgDiv = inactiveBgDiv;
            inactiveBgDiv = temp;
            currentBgIndex = nextIndex;
        } catch (error) {
            console.error("[LoadScreen] Skipping background change due to preload error:", error);
        }
    }

    function startBackgroundSlideshow() {
        if (bgInterval) clearInterval(bgInterval);
        bgInterval = null;
        currentBgIndex = -1;
        if (!CONFIG.enableDiscordBackgrounds || !bgImage1 || !bgImage2 || validIndices.length === 0) {
            if(bgImage1) bgImage1.style.opacity = 0;
            if(bgImage2) bgImage2.style.opacity = 0;
            return;
        }
        const randomValidIndexPosition = Math.floor(Math.random() * validIndices.length);
        currentBgIndex = validIndices[randomValidIndexPosition];
        const firstImageUrl = backgroundUrls[currentBgIndex];
        preloadImage(firstImageUrl)
            .then(url => {
                activeBgDiv = bgImage1;
                inactiveBgDiv = bgImage2;
                activeBgDiv.style.backgroundImage = `url('${url}')`;
                activeBgDiv.style.opacity = 1;
                inactiveBgDiv.style.backgroundImage = '';
                inactiveBgDiv.style.opacity = 0;
                if (validIndices.length > 1) {
                    bgInterval = setInterval(changeBackground, BG_CHANGE_INTERVAL);
                }
            })
            .catch(error => {
                if(bgImage1) bgImage1.style.opacity = 0;
                if(bgImage2) bgImage2.style.opacity = 0;
                console.error("[LoadScreen] Failed to load initial random background:", error);
            });
    }

    function showRandomMessage() {
        if (!messagesToShow || messagesToShow.length === 0) return;
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * messagesToShow.length);
        } while (messagesToShow.length > 1 && randomIndex === currentMessageIndex);
        currentMessageIndex = randomIndex;
        messageText.style.opacity = 0;
        setTimeout(() => {
            messageText.textContent = messagesToShow[randomIndex];
            messageText.style.opacity = 1;
        }, 500);
    }

    function startMessageRotation() {
        stopMessageRotation();
        if (messagesToShow && messagesToShow.length > 0) {
            showRandomMessage();
            messageInterval = setInterval(showRandomMessage, 4500);
        } else {
            messageText.textContent = "";
        }
    }

    function stopMessageRotation() {
        clearInterval(messageInterval);
        messageInterval = null;
        if(messageText) messageText.style.opacity = 0;
    }

    function formatDiscordTimestamp(isoTimestamp) {
        if (!isoTimestamp) return '';
        try {
            const date = new Date(isoTimestamp);
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
            return date.toLocaleDateString(undefined, options);
        } catch (e) {
            return '';
        }
    }

    // NEW FUNCTION: Format Discord-like markdown to HTML
    function formatDiscordToHtml(text) {
        if (!text) return '';

        const lines = text.split('\n');
        let htmlOutput = '';
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let processLine = line.trim();

            line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            line = line.replace(/(?<!\*)\*(?!\s|\*)(.*?)(?<!\s)\*(?!\*)/g, '<em>$1</em>');
            line = line.replace(/_(.*?)_/g, '<em>$1</em>');
            line = line.replace(/<@!?(\d+)>/g, (match, userId) => {
                return `<span class="discord-mention" title="User ID: ${userId}">@User</span>`;
            });

            if (processLine.startsWith('- ')) {
                if (!inList) {
                    htmlOutput += '<ul>\n';
                    inList = true;
                }
                let listItemContent = line.substring(line.indexOf('- ') + 2);
                htmlOutput += '  <li>' + listItemContent + '</li>\n';
            } else {
                if (inList) {
                    htmlOutput += '</ul>\n';
                    inList = false;
                }
                htmlOutput += line + '\n';
            }
        }
        if (inList) {
            htmlOutput += '</ul>\n';
        }
        return htmlOutput.trim();
    }

    function applyConfiguration(handoverData) {
        CONFIG.logoUrl = handoverData.logoUrl || CONFIG.logoUrl;
        CONFIG.enableMusic = handoverData.enableMusic !== undefined ? handoverData.enableMusic : CONFIG.enableMusic;
        CONFIG.youtubeVideoId = handoverData.youtubeVideoId || CONFIG.youtubeVideoId;
        CONFIG.initialVolume = handoverData.initialVolume !== undefined ? handoverData.initialVolume : CONFIG.initialVolume;
        CONFIG.messages = handoverData.messages && handoverData.messages.length > 0 ? handoverData.messages : CONFIG.messages;
        CONFIG.enableChangelog = handoverData.enableChangelog !== undefined ? handoverData.enableChangelog : CONFIG.enableChangelog;
        CONFIG.changelogTitle = handoverData.changelogTitle || CONFIG.changelogTitle;
        CONFIG.changelogEntry = handoverData.changelogEntry || null;
        CONFIG.enableDiscordBackgrounds = handoverData.enableDiscordBackgrounds !== undefined ? handoverData.enableDiscordBackgrounds : CONFIG.enableDiscordBackgrounds;
        CONFIG.backgroundImageUrls = handoverData.backgroundImageUrls || [];
        CONFIG.serverName = handoverData.serverName || CONFIG.serverName;

        if (handoverData.playerName && handoverName) handoverName.innerText = handoverData.playerName;
        if (handoverData.serverName && handoverAddress) {
            handoverAddress.innerText = handoverData.serverName;
        } else if (handoverAddress) {
            handoverAddress.innerText = "Unknown Server";
        }

        if (CONFIG.logoUrl && logoElement) {
            logoElement.src = CONFIG.logoUrl;
            logoElement.style.display = 'block';
        } else if (logoElement) {
            logoElement.style.display = 'none';
        }

        messagesToShow = CONFIG.messages;
        startMessageRotation();

        if (CONFIG.enableMusic && CONFIG.youtubeVideoId) {
            if (musicControls) musicControls.style.display = 'flex';
            if (volumeSlider) volumeSlider.value = CONFIG.initialVolume;
            if (playerApiReady) createYouTubePlayer();
        } else {
            if (musicControls) musicControls.style.display = 'none';
            if (player && typeof player.stopVideo === 'function') player.stopVideo();
        }

        if (CONFIG.enableChangelog && changelogContainer && changelogTitle && changelogEntries) {
            changelogTitle.innerText = CONFIG.changelogTitle;
            changelogEntries.innerHTML = '';
            const entry = CONFIG.changelogEntry;
            if (entry && entry.content) {
                const entryDiv = document.createElement('div');
                entryDiv.className = 'changelog-entry';
                const contentP = document.createElement('p');
                contentP.className = 'changelog-content';
                contentP.innerHTML = formatDiscordToHtml(entry.content);
                const metaP = document.createElement('p');
                metaP.className = 'changelog-meta';
                const authorSpan = document.createElement('span');
                authorSpan.className = 'changelog-author';
                authorSpan.textContent = entry.author || 'Unknown';
                const timeSpan = document.createElement('span');
                timeSpan.textContent = ` - ${formatDiscordTimestamp(entry.timestamp)}`;
                metaP.appendChild(authorSpan);
                metaP.appendChild(timeSpan);
                entryDiv.appendChild(contentP);
                entryDiv.appendChild(metaP);
                changelogEntries.appendChild(entryDiv);
                changelogContainer.style.display = 'flex';
            } else {
                const noEntriesP = document.createElement('p');
                noEntriesP.textContent = 'No recent update found.';
                noEntriesP.style.textAlign = 'center';
                noEntriesP.style.color = '#aaa';
                changelogEntries.appendChild(noEntriesP);
                changelogContainer.style.display = 'flex';
            }
        } else {
            if (changelogContainer) changelogContainer.style.display = 'none';
        }

        backgroundUrls = CONFIG.backgroundImageUrls.filter(url => !!url);
        validIndices = backgroundUrls.map((url, index) => url ? index : -1).filter(index => index !== -1);
        startBackgroundSlideshow();
    }

    function createYouTubePlayer() {
         if (!CONFIG.enableMusic || !CONFIG.youtubeVideoId || !playerApiReady) return;
         if (player) {
             if (musicShouldBePlaying && player.getPlayerState() !== YT.PlayerState.PLAYING) {
                 player.playVideo();
             }
             return;
         }
         player = new YT.Player('youtube-player', {
             height: '0', width: '0', videoId: CONFIG.youtubeVideoId,
             playerVars: { 'autoplay': 1, 'controls': 0, 'loop': 1, 'playlist': CONFIG.youtubeVideoId, 'modestbranding': 1, 'fs': 0, 'iv_load_policy': 3 },
             events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange, 'onError': onPlayerError }
         });
    }

    window.onYouTubeIframeAPIReady = function() {
        playerApiReady = true;
        if (CONFIG.enableMusic && CONFIG.youtubeVideoId) {
            createYouTubePlayer();
        }
    };

    function onPlayerReady(event) {
        musicReady = true;
        if (player && typeof player.setVolume === 'function') {
            player.setVolume(CONFIG.initialVolume);
        }
        updateMusicIcons();
        if (!musicShouldBePlaying) {
            player.pauseVideo();
        }
    }

    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            musicShouldBePlaying = true;
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            musicShouldBePlaying = false;
        }
        updateMusicIcons();
    }

    function onPlayerError(event) {
        console.error("YouTube Player Error:", event.data);
        musicReady = false;
        if(musicControls) musicControls.style.display = 'none';
    }

    function toggleMusic() {
        if (!musicReady || !player || typeof player.playVideo !== 'function' || typeof player.pauseVideo !== 'function') return;
        musicShouldBePlaying = !musicShouldBePlaying;
        if (musicShouldBePlaying) {
            player.playVideo();
        } else {
            player.pauseVideo();
        }
    }

    function updateMusicIcons() {
        if (!playIcon || !pauseIcon) return;
        if (!CONFIG.enableMusic) {
             playIcon.style.display = 'inline-block';
             pauseIcon.style.display = 'none';
             return;
        }
        let isPlaying = musicShouldBePlaying;
        if (musicReady && player && typeof player.getPlayerState === 'function') {
            const currentState = player.getPlayerState();
            isPlaying = (currentState === YT.PlayerState.PLAYING || currentState === YT.PlayerState.BUFFERING);
        }
        playIcon.style.display = isPlaying ? 'none' : 'inline-block';
        pauseIcon.style.display = isPlaying ? 'inline-block' : 'none';
    }

    function handleVolumeChange() {
         if (!musicReady || !player || typeof player.setVolume !== 'function') return;
         const newVolume = parseInt(volumeSlider.value, 10);
         player.setVolume(newVolume);
    }

    if (musicControls && playIcon && pauseIcon) {
        playIcon.addEventListener('click', toggleMusic);
        pauseIcon.addEventListener('click', toggleMusic);
    }
    if (volumeSlider) {
        volumeSlider.addEventListener('input', handleVolumeChange);
    }

    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || !data.eventName) return;

        let totalDataFileCount = 0;
        let totalInitFuncCount = 0;

        switch (data.eventName) {
            case 'loadProgress':
                if (loadingBar && data.loadFraction !== undefined) {
                    const percentage = Math.round(data.loadFraction * 100);
                    loadingBar.value = data.loadFraction;
                    if(progressPercentage) progressPercentage.textContent = `${percentage}%`;
                    let statusMsg = "Initializing...";
                    if (percentage < 10) statusMsg = "Establishing connection...";
                    else if (percentage < 30) statusMsg = "Requesting assets...";
                    else if (percentage < 70) statusMsg = "Loading game data...";
                    else if (percentage < 95) statusMsg = "Initializing scripts...";
                    else statusMsg = "Finalizing setup...";
                    if(statusText) statusText.textContent = statusMsg;
                }
                break;
            case 'onLogLine':
                if (logText && data.message) logText.innerText = data.message;
                break;
            case 'startDataFileEntries':
                totalDataFileCount = data.count;
                if(statusText) statusText.textContent = "Loading Data Files";
                if(logText) logText.innerText = `(0 / ${totalDataFileCount})`;
                break;
            case 'onDataFileEntry':
                if(logText) logText.innerText = `Loading: ${data.name}`;
                break;
            case 'endDataFileEntries':
                 if(logText) logText.innerText = `Finished loading ${totalDataFileCount} data files.`;
                break;
            case 'performMapLoadFunction':
                 if(logText) logText.innerText = `Performing map load operation #${data.idx}...`;
                break;
            case 'startInitFunction':
                if(statusText) statusText.textContent = `Initializing ${data.type}`;
                if(logText) logText.innerText = `Preparing ${data.type} functions...`;
                break;
            case 'startInitFunctionOrder':
                totalInitFuncCount = data.count;
                if(statusText) statusText.textContent = `Invoking ${data.type} (Order ${data.order})`;
                if(logText) logText.innerText = `(0 / ${totalInitFuncCount})`;
                break;
            case 'initFunctionInvoking':
                 if(logText) logText.innerText = `Invoking: ${data.name}`;
                break;
            case 'initFunctionInvoked':
                break;
            case 'endInitFunction':
                if(logText) logText.innerText = `Finished invoking ${data.type} functions.`;
                break;
            default:
                break;
        }
    });

    if (window.nuiHandoverData) {
        applyConfiguration(window.nuiHandoverData);
    } else {
        if (CONFIG.logoUrl && logoElement) { logoElement.src = CONFIG.logoUrl; logoElement.style.display = 'block'; }
        if (handoverAddress) handoverAddress.innerText = CONFIG.serverName;
        startMessageRotation();
        if (changelogContainer) changelogContainer.style.display = 'none';
        validIndices = CONFIG.backgroundImageUrls.map((url, index) => url ? index : -1).filter(index => index !== -1);
        startBackgroundSlideshow();
    }
    updateMusicIcons();

    window.addEventListener('unload', () => {
        stopMessageRotation();
        if (bgInterval) {
            clearInterval(bgInterval);
            bgInterval = null;
        }
        if (player && typeof player.destroy === 'function') {
            try { player.destroy(); player = null; } catch (e) {}
        }
    });
});