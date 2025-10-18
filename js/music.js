// Music Player Logic
function initMusicPlayer() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const skipBtn = document.getElementById('skipBtn');
    const muteBtn = document.getElementById('muteBtn');

    if (playPauseBtn) playPauseBtn.addEventListener('click', playPauseMusic);
    if (skipBtn) skipBtn.addEventListener('click', skipMusic);
    if (muteBtn) muteBtn.addEventListener('click', muteMusic);

    musicAudioElement.addEventListener('ended', () => {
        skipMusic();
    });

    fetchAndPlayMusic();
}

async function fetchAndPlayMusic() {
    const musicStatus = document.getElementById('currentTrack');
    if (!musicStatus) return;
    musicStatus.innerText = 'Finding music...';

    try {
        const gameAddress = await GetPublicAddressByKeyword('game');
        if (!gameAddress) {
            musicStatus.innerText = 'Music channel not found';
            return;
        }

        const messages = await GetPublicMessagesByAddress(gameAddress, 0, 100);
        if (!messages || messages.length === 0) {
            musicStatus.innerText = 'No music tracks found';
            return;
        }

        const audioRegex = /(\b[a-zA-Z0-9\-_]+\.(mp3|wav))\b/i;
        const ipfsRegex = /IPFS:([a-zA-Z0-9]{46}|[a-zA-Z0-9]{59})/;

        for (const msg of messages) {
            if (musicPlaylist.length >= 10) break;

            const messageText = msg.Message || '';
            const audioMatch = messageText.match(audioRegex);
            const ipfsMatch = messageText.match(ipfsRegex);

            if (audioMatch && ipfsMatch) {
                const filename = audioMatch[0];
                const hash = ipfsMatch[1];
                if (!musicPlaylist.some(track => track.url.includes(hash))) {
                    musicPlaylist.push({
                        name: filename,
                        url: `https://ipfs.io/ipfs/${hash}`
                    });
                }
            }
        }

        if (musicPlaylist.length === 0) {
            musicStatus.innerText = 'No valid music found';
        } else {
            playTrack(currentTrackIndex);
        }
    } catch (error) {
        console.error("Failed to fetch music:", error);
        musicStatus.innerText = 'Error loading music';
    }
}

function playTrack(index) {
    const musicStatus = document.getElementById('currentTrack');
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (!musicStatus || !playPauseBtn) return;

    if (musicPlaylist.length === 0 || index < 0 || index >= musicPlaylist.length) {
        musicStatus.innerText = 'Playlist finished';
        isMusicPlaying = false;
        playPauseBtn.innerText = '▶';
        return;
    }

    currentTrackIndex = index;
    const track = musicPlaylist[currentTrackIndex];
    musicStatus.innerText = track.name;
    musicAudioElement.src = track.url;
    musicAudioElement.load();

    const playPromise = musicAudioElement.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            isMusicPlaying = true;
            playPauseBtn.innerText = '⏸';
        }).catch(error => {
            console.error(`Audio playback for ${track.name} failed:`, error);
            isMusicPlaying = false;
            playPauseBtn.innerText = '▶';
            setTimeout(skipMusic, 2000);
        });
    }
}

function playPauseMusic() {
    if (musicPlaylist.length === 0) return;
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (isMusicPlaying) {
        musicAudioElement.pause();
        isMusicPlaying = false;
        if (playPauseBtn) playPauseBtn.innerText = '▶';
    } else {
        if (musicAudioElement.src) {
            const playPromise = musicAudioElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isMusicPlaying = true;
                    if (playPauseBtn) playPauseBtn.innerText = '⏸';
                }).catch(error => {
                    console.error("Audio playback failed on resume:", error);
                });
            }
        } else {
            playTrack(currentTrackIndex);
        }
    }
}

function skipMusic() {
    if (musicPlaylist.length > 0) {
        const nextIndex = (currentTrackIndex + 1) % musicPlaylist.length;
        playTrack(nextIndex);
    }
}

function muteMusic() {
    const muteBtn = document.getElementById('muteBtn');
    isMuted = !isMuted;
    musicAudioElement.muted = isMuted;
    if (muteBtn) muteBtn.innerText = isMuted ? '🔊' : '🔇';
}