// Music Player state
var musicPlaylist = [];
var currentTrackIndex = 0;
var musicAudioElement = new Audio();
var isMusicPlaying = false;
var isMuted = false;
var musicCurrentPage = 1;
var previewAudio = new Audio();
var currentPreviewUrl = null;
var showingPlaylist = false;

// Music Player Logic
function initMusicPlayer() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const skipBtn = document.getElementById('skipBtn');
    const muteBtn = document.getElementById('muteBtn');
    const musicMenuBtn = document.getElementById('musicMenuBtn');
    const musicMenuModal = document.getElementById('musicMenuModal');
    const closeMusicMenuBtn = document.getElementById('closeMusicMenu');
    const showPlaylistBtn = document.getElementById('showPlaylistBtn');
    const musicList = document.getElementById('musicList');
    const musicSearchInput = document.getElementById('musicSearchInput');
    const musicSearchBtn = document.getElementById('musicSearchBtn');

    if (playPauseBtn) playPauseBtn.addEventListener('click', playPauseMusic);
    if (skipBtn) skipBtn.addEventListener('click', skipMusic);
    if (muteBtn) muteBtn.addEventListener('click', muteMusic);
    document.getElementById('cameraBtn').addEventListener('click', toggleCamera);
    if (musicMenuBtn) musicMenuBtn.addEventListener('click', () => {
        musicMenuModal.style.display = 'flex';
        isPromptOpen = true;
        musicSearchInput.value = 'game';
        fetchSongsForMenu('game', 1);
    });
    if (closeMusicMenuBtn) closeMusicMenuBtn.addEventListener('click', () => {
        musicMenuModal.style.display = 'none';
        isPromptOpen = false;
    });

    function performMusicSearch() {
        const searchTerm = musicSearchInput.value.trim();
        if (searchTerm) {
            musicCurrentPage = 1;
            fetchSongsForMenu(searchTerm, musicCurrentPage);
        }
    }

    if (musicSearchBtn) musicSearchBtn.addEventListener('click', performMusicSearch);
    if (musicSearchInput) musicSearchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            performMusicSearch();
        }
    });


    const prevBtn = document.getElementById('musicPrevBtn');
    const nextBtn = document.getElementById('musicNextBtn');

    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (musicCurrentPage > 1) {
            musicCurrentPage--;
            const searchTerm = musicSearchInput.value.trim() || 'game';
            fetchSongsForMenu(searchTerm, musicCurrentPage);
        }
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        musicCurrentPage++;
        const searchTerm = musicSearchInput.value.trim() || 'game';
        fetchSongsForMenu(searchTerm, musicCurrentPage);
    });

    if (showPlaylistBtn) showPlaylistBtn.addEventListener('click', () => {
        showingPlaylist = !showingPlaylist;
        document.getElementById('musicList').style.display = showingPlaylist ? 'none' : 'block';
        document.getElementById('musicPagination').style.display = showingPlaylist ? 'none' : 'block';
        document.getElementById('musicPlaylistView').style.display = showingPlaylist ? 'block' : 'none';
        showPlaylistBtn.innerText = showingPlaylist ? 'Show Search' : 'Show Playlist';
        if (showingPlaylist) {
            renderPlaylist();
        }
    });

    musicAudioElement.addEventListener('ended', () => {
        skipMusic();
    });

    previewAudio.addEventListener('ended', () => {
        document.querySelectorAll('.preview-play-btn').forEach(btn => btn.innerText = '▶');
        currentPreviewUrl = null;
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

        const audioRegex = /([a-zA-Z0-9\s\-_().]+\.(mp3|wav))/i;
        const ipfsRegex = /IPFS:([a-zA-Z0-9]{46}|[a-zA-Z0-9]{59})/;

        for (const msg of messages) {
            if (musicPlaylist.length >= 10) break;

            const messageText = msg.Message || '';
            const audioMatch = messageText.match(audioRegex);
            const ipfsMatch = messageText.match(ipfsRegex);

            if (audioMatch && ipfsMatch) {
                const filename = audioMatch[0];
                const sanitizedFilename = filename.replace(/>|</g, '');
                const hash = ipfsMatch[1];
                if (!musicPlaylist.some(track => track.url.includes(hash))) {
                    musicPlaylist.push({
                        name: sanitizedFilename,
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

function togglePreview(button, songUrl) {
    const isCurrentlyPlaying = !previewAudio.paused && currentPreviewUrl === songUrl;

    // Stop any playing audio from the main player
    if (isMusicPlaying) {
        playPauseMusic();
    }

    // Stop any currently playing preview
    if (!previewAudio.paused) {
        previewAudio.pause();
        const playingButton = document.querySelector('.preview-play-btn[data-playing="true"]');
        if(playingButton) {
            playingButton.innerText = '▶';
            playingButton.removeAttribute('data-playing');
        }
    }

    if (isCurrentlyPlaying) {
        currentPreviewUrl = null;
    } else {
        previewAudio.src = songUrl;
        previewAudio.play();
        currentPreviewUrl = songUrl;
        button.innerText = '⏹';
        button.setAttribute('data-playing', 'true');
    }
}

async function fetchSongsForMenu(searchTerm = 'game', page = 1) {
    const musicList = document.getElementById('musicList');
    const pageNum = document.getElementById('musicPageNum');
    const prevBtn = document.getElementById('musicPrevBtn');
    musicList.innerHTML = '<li>Loading...</li>';
    pageNum.innerText = `Page ${page}`;
    prevBtn.disabled = page === 1;

    try {
        const gameAddress = await GetPublicAddressByKeyword(searchTerm);
        if (!gameAddress) {
            musicList.innerHTML = `<li>No results found for "${searchTerm}"</li>`;
            return;
        }

        const messages = await GetPublicMessagesByAddress(gameAddress, (page - 1) * 50, 50);
        if (!messages || messages.length === 0) {
            musicList.innerHTML = '<li>No more songs</li>';
            document.getElementById('musicNextBtn').disabled = true;
            return;
        }

        musicList.innerHTML = '';
        const audioRegex = /([a-zA-Z0-9\s\-_().]+\.(mp3|wav))/i;
        const ipfsRegex = /IPFS:([a-zA-Z0-9]{46}|[a-zA-Z0-9]{59})/;

        const filteredMessages = messages.filter(msg => {
            const messageText = msg.Message || '';
            return audioRegex.test(messageText) && ipfsRegex.test(messageText);
        });

        filteredMessages.sort((a, b) => new Date(b.BlockDate) - new Date(a.BlockDate));

        filteredMessages.forEach(async msg => {
            const messageText = msg.Message || '';
            const ipfsMatch = messageText.match(ipfsRegex);

            if (ipfsMatch) {
                const hash = ipfsMatch[1];
                const audioMatch = messageText.match(audioRegex);
                const filename = audioMatch ? audioMatch[0] : 'Unnamed Track';
                const sanitizedFilename = filename.replace(/>|</g, '');
                const listItem = document.createElement('div');
                listItem.style.display = 'flex';
                listItem.style.justifyContent = 'space-between';
                listItem.style.padding = '5px';
                listItem.style.borderBottom = '1px solid #333';

                const songName = document.createElement('span');
                const profile = await GetProfileByAddress(msg.FromAddress);
                const creator = profile ? profile.URN : 'anonymous';
                songName.innerText = `${sanitizedFilename} by ${creator}`;
                listItem.appendChild(songName);

                const buttonContainer = document.createElement('div');

                const playButton = document.createElement('button');
                playButton.innerText = '▶';
                playButton.className = 'preview-play-btn';
                playButton.style.fontSize = '10px';
                const songUrl = `https://ipfs.io/ipfs/${hash}`;
                playButton.onclick = () => togglePreview(playButton, songUrl);
                buttonContainer.appendChild(playButton);

                const addButton = document.createElement('button');
                addButton.innerText = 'Add';
                addButton.style.fontSize = '10px';
                addButton.style.marginLeft = '5px';
                addButton.onclick = () => {
                    const track = {
                        name: sanitizedFilename,
                        url: `https://ipfs.io/ipfs/${hash}`
                    };
                    if (!musicPlaylist.some(t => t.url === track.url)) {
                        if (musicPlaylist.length >= 10) {
                            musicPlaylist.shift(); // Remove the oldest song
                        }
                        musicPlaylist.push(track);
                        addMessage(`${sanitizedFilename} added to playlist`);
                    } else {
                        addMessage(`${sanitizedFilename} is already in the playlist`);
                    }
                };
                buttonContainer.appendChild(addButton);
                listItem.appendChild(buttonContainer);
                musicList.appendChild(listItem);
            }
        });
        document.getElementById('musicNextBtn').disabled = messages.length < 50;
    } catch (error) {
        console.error("Failed to fetch songs for menu:", error);
        musicList.innerHTML = '<li>Error loading songs</li>';
    }
}

function renderPlaylist() {
    const playlistView = document.getElementById('musicPlaylistView');
    playlistView.innerHTML = '';
    if (musicPlaylist.length === 0) {
        playlistView.innerHTML = '<div>Playlist is empty</div>';
        return;
    }
    musicPlaylist.forEach((track, index) => {
        const listItem = document.createElement('div');
        listItem.style.display = 'flex';
        listItem.style.justifyContent = 'space-between';
        listItem.style.padding = '5px';
        listItem.style.borderBottom = '1px solid #333';

        const songName = document.createElement('span');
        songName.innerText = track.name;
        listItem.appendChild(songName);

        const removeButton = document.createElement('button');
        removeButton.innerText = 'Remove';
        removeButton.style.fontSize = '10px';
        removeButton.onclick = () => {
            musicPlaylist.splice(index, 1);
            renderPlaylist();
        };
        listItem.appendChild(removeButton);
        playlistView.appendChild(listItem);
    });
}
