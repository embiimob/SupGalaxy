// Video Player state
var videoPlaylist = [];
var currentVideoIndex = 0;
var videoElement = document.getElementById('videoElement');
var isVideoPlaying = false;
var isVideoMuted = true;
var videoCurrentPage = 1;
var showingVideoPlaylist = false;

// Local mode IPFS URL helper
// Note: Depends on global variables localMode and baseLocalIpfsPath from api.js (loaded via index.html)
function buildIPFSUrl(hash, filename = null) {
    if (typeof localMode !== 'undefined' && typeof baseLocalIpfsPath !== 'undefined' && localMode && baseLocalIpfsPath && filename) {
        // Return relative path (no file:// protocol to avoid CORS issues)
        return `${baseLocalIpfsPath}/${hash}/${filename}`;
    }
    // Fallback to ipfs.io public gateway (does not support hash/filename format)
    return `https://ipfs.io/ipfs/${hash}`;
}

// Video Player Logic
function initVideoPlayer() {
    const playPauseBtn = document.getElementById('videoPlayPauseBtn');
    const skipBtn = document.getElementById('videoSkipBtn');
    const muteBtn = document.getElementById('videoMuteBtn');
    const fullscreenBtn = document.getElementById('videoFullscreenBtn');
    const videoMenuBtn = document.getElementById('videoMenuBtn');
    const videoMenuModal = document.getElementById('videoMenuModal');
    const closeVideoMenuBtn = document.getElementById('closeVideoMenu');
    const showPlaylistBtn = document.getElementById('showVideoPlaylistBtn');
    const videoSearchInput = document.getElementById('videoSearchInput');
    const videoSearchBtn = document.getElementById('videoSearchBtn');

    if (playPauseBtn) playPauseBtn.addEventListener('click', playPauseVideo);
    if (skipBtn) skipBtn.addEventListener('click', skipVideo);
    if (muteBtn) muteBtn.addEventListener('click', muteVideo);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);

    if (videoMenuBtn) videoMenuBtn.addEventListener('click', () => {
        videoMenuModal.style.display = 'flex';
        isPromptOpen = true;
        videoSearchInput.value = 'game'; // Default search term
        fetchVideosForMenu('game', 1);
    });

    if (closeVideoMenuBtn) closeVideoMenuBtn.addEventListener('click', () => {
        videoMenuModal.style.display = 'none';
        isPromptOpen = false;
    });

    function performVideoSearch() {
        const searchTerm = videoSearchInput.value.trim();
        if (searchTerm) {
            videoCurrentPage = 1;
            fetchVideosForMenu(searchTerm, videoCurrentPage);
        }
    }

    if (videoSearchBtn) videoSearchBtn.addEventListener('click', performVideoSearch);
    if (videoSearchInput) videoSearchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            performVideoSearch();
        }
    });

    const prevBtn = document.getElementById('videoPrevBtn');
    const nextBtn = document.getElementById('videoNextBtn');

    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (videoCurrentPage > 1) {
            videoCurrentPage--;
            const searchTerm = videoSearchInput.value.trim() || 'game';
            fetchVideosForMenu(searchTerm, videoCurrentPage);
        }
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        videoCurrentPage++;
        const searchTerm = videoSearchInput.value.trim() || 'game';
        fetchVideosForMenu(searchTerm, videoCurrentPage);
    });

    if (showPlaylistBtn) showPlaylistBtn.addEventListener('click', () => {
        showingVideoPlaylist = !showingVideoPlaylist;
        document.getElementById('videoList').style.display = showingVideoPlaylist ? 'none' : 'block';
        document.getElementById('videoPagination').style.display = showingVideoPlaylist ? 'none' : 'block';
        document.getElementById('videoPlaylistView').style.display = showingVideoPlaylist ? 'block' : 'none';
        showPlaylistBtn.innerText = showingVideoPlaylist ? 'Show Search' : 'Show Playlist';
        if (showingVideoPlaylist) {
            renderVideoPlaylist();
        }
    });

    videoElement.addEventListener('ended', () => {
        skipVideo();
    });

    document.getElementById('tvIcon').addEventListener('click', () => {
        const videoPlayer = document.getElementById('videoPlayer');
        if (videoPlayer.style.display === 'none') {
            videoPlayer.style.display = 'block';
            fetchAndPlayVideos('game');
        } else {
            videoPlayer.style.display = 'none';
            if (isVideoPlaying) {
                videoElement.pause();
                isVideoPlaying = false;
                document.getElementById('videoPlayPauseBtn').innerText = '▶';
            }
        }
    });
}

async function fetchAndPlayVideos(searchTerm = 'game') {
    const videoStatus = document.getElementById('videoInfo');
    if (!videoStatus) return;
    videoStatus.innerText = 'Finding videos...';

    try {
        const gameAddress = await GetPublicAddressByKeyword(searchTerm);
        if (!gameAddress) {
            videoStatus.innerText = 'Video channel not found';
            return;
        }

        const messages = await GetPublicMessagesByAddress(gameAddress, 0, 100);
        if (!messages || messages.length === 0) {
            videoStatus.innerText = 'No videos found';
            return;
        }

        const videoRegex = /([a-zA-Z0-9\s\-_().]+\.(mp4|webm|ogg|mov|avi))/i;
        const ipfsRegex = /IPFS:([a-zA-Z0-9]{46}|[a-zA-Z0-9]{59})/;

        for (const msg of messages) {
            if (videoPlaylist.length >= 10) break;

            const messageText = msg.Message || '';
            const videoMatch = messageText.match(videoRegex);
            const ipfsMatch = messageText.match(ipfsRegex);

            if (videoMatch && ipfsMatch) {
                const filename = videoMatch[0];
                const hash = ipfsMatch[1];
                if (!videoPlaylist.some(track => track.url.includes(hash))) {
                    videoPlaylist.push({
                        name: filename,
                        url: buildIPFSUrl(hash, filename)
                    });
                }
            }
        }

        if (videoPlaylist.length === 0) {
            videoStatus.innerText = 'No valid videos found';
        } else {
            playVideo(currentVideoIndex);
        }
    } catch (error) {
        console.error("Failed to fetch videos:", error);
        videoStatus.innerText = 'Error loading videos';
    }
}

function playVideo(index) {
    const videoStatus = document.getElementById('videoInfo');
    const playPauseBtn = document.getElementById('videoPlayPauseBtn');
    if (!videoStatus || !playPauseBtn) return;

    // If paused due to autoplay restrictions, don't attempt to play
    if (isAutoplayPaused) {
        videoStatus.innerText = 'Tap to play video';
        isVideoPlaying = false;
        playPauseBtn.innerText = '▶';
        return;
    }

    if (videoPlaylist.length === 0 || index < 0 || index >= videoPlaylist.length) {
        videoStatus.innerText = 'Playlist finished';
        isVideoPlaying = false;
        playPauseBtn.innerText = '▶';
        return;
    }

    currentVideoIndex = index;
    const track = videoPlaylist[currentVideoIndex];
    videoStatus.innerText = track.name;
    videoElement.src = track.url;
    videoElement.load();

    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            isVideoPlaying = true;
            playPauseBtn.innerText = '⏸';
            // Clear autoplay pause if this play succeeded (user must have interacted)
            isAutoplayPaused = false;
        }).catch(error => {
            console.error(`Video playback for ${track.name} failed:`, error);
            isVideoPlaying = false;
            playPauseBtn.innerText = '▶';
            
            // Check if this is an autoplay restriction error (use the helper from audio-player.js)
            if (typeof isAutoplayError === 'function' && isAutoplayError(error)) {
                // Set autoplay paused state and don't retry
                isAutoplayPaused = true;
                videoStatus.innerText = 'Tap to play video';
                console.log('[AutoplayPause] Video blocked by browser, waiting for user interaction');
            } else {
                // For other errors (network, etc.), skip to next track
                setTimeout(skipVideo, 2000);
            }
        });
    }
}

function playPauseVideo() {
    if (videoPlaylist.length === 0) return;
    const playPauseBtn = document.getElementById('videoPlayPauseBtn');
    const videoStatus = document.getElementById('videoInfo');
    
    // Clear autoplay pause on explicit user action (this is a real user interaction)
    if (isAutoplayPaused) {
        isAutoplayPaused = false;
    }
    
    if (isVideoPlaying) {
        videoElement.pause();
        isVideoPlaying = false;
        if (playPauseBtn) playPauseBtn.innerText = '▶';
    } else {
        if (videoElement.src) {
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isVideoPlaying = true;
                    if (playPauseBtn) playPauseBtn.innerText = '⏸';
                }).catch(error => {
                    console.error("Video playback failed on resume:", error);
                    // Check if this is an autoplay restriction error
                    if (typeof isAutoplayError === 'function' && isAutoplayError(error)) {
                        isAutoplayPaused = true;
                        if (videoStatus) videoStatus.innerText = 'Tap to play video';
                    }
                });
            }
        } else {
            playVideo(currentVideoIndex);
        }
    }
}

function skipVideo() {
    if (videoPlaylist.length > 0) {
        const nextIndex = (currentVideoIndex + 1) % videoPlaylist.length;
        playVideo(nextIndex);
    }
}

function muteVideo() {
    const muteBtn = document.getElementById('videoMuteBtn');
    isVideoMuted = !isVideoMuted;
    videoElement.muted = isVideoMuted;
    if (muteBtn) muteBtn.innerText = isVideoMuted ? '🔊' : '🔇';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        videoElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        // Any cleanup when exiting fullscreen can be done here
    }
});

function renderVideoPlaylist() {
    const playlistView = document.getElementById('videoPlaylistView');
    playlistView.innerHTML = '';
    if (videoPlaylist.length === 0) {
        playlistView.innerHTML = '<div>Playlist is empty</div>';
        return;
    }
    videoPlaylist.forEach((track, index) => {
        const listItem = document.createElement('div');
        listItem.style.display = 'flex';
        listItem.style.justifyContent = 'space-between';
        listItem.style.padding = '5px';
        listItem.style.borderBottom = '1px solid #333';

        const videoName = document.createElement('span');
        videoName.innerText = track.name;
        listItem.appendChild(videoName);

        const removeButton = document.createElement('button');
        removeButton.innerText = 'Remove';
        removeButton.style.fontSize = '10px';
        removeButton.onclick = () => {
            videoPlaylist.splice(index, 1);
            renderVideoPlaylist();
        };
        listItem.appendChild(removeButton);
        playlistView.appendChild(listItem);
    });
}

async function fetchVideosForMenu(searchTerm = 'game', page = 1) {
    const videoList = document.getElementById('videoList');
    const pageNum = document.getElementById('videoPageNum');
    const prevBtn = document.getElementById('videoPrevBtn');
    videoList.innerHTML = '<li>Loading...</li>';
    pageNum.innerText = `Page ${page}`;
    prevBtn.disabled = page === 1;

    try {
        const gameAddress = await GetPublicAddressByKeyword(searchTerm);
        if (!gameAddress) {
            videoList.innerHTML = `<li>No results found for "${searchTerm}"</li>`;
            return;
        }

        const messages = await GetPublicMessagesByAddress(gameAddress, (page - 1) * 50, 50);
        if (!messages || messages.length === 0) {
            videoList.innerHTML = '<li>No more videos</li>';
            document.getElementById('videoNextBtn').disabled = true;
            return;
        }

        videoList.innerHTML = '';
        const videoRegex = /([a-zA-Z0-9\s\-_().]+\.(mp4|webm|ogg|mov|avi))/i;
        const ipfsRegex = /IPFS:([a-zA-Z0-9]{46}|[a-zA-Z0-9]{59})/;

        const filteredMessages = messages.filter(msg => {
            const messageText = msg.Message || '';
            return videoRegex.test(messageText) && ipfsRegex.test(messageText);
        });

        filteredMessages.sort((a, b) => new Date(b.BlockDate) - new Date(a.BlockDate));

        filteredMessages.forEach(async msg => {
            const messageText = msg.Message || '';
            const ipfsMatch = messageText.match(ipfsRegex);

            if (ipfsMatch) {
                const hash = ipfsMatch[1];
                const videoMatch = messageText.match(videoRegex);
                const filename = videoMatch ? videoMatch[0] : 'Unnamed Video';
                const sanitizedFilename = filename.replace(/>|</g, '');
                const listItem = document.createElement('div');
                listItem.style.display = 'flex';
                listItem.style.justifyContent = 'space-between';
                listItem.style.padding = '5px';
                listItem.style.borderBottom = '1px solid #333';

                const videoName = document.createElement('span');
                const profile = await GetProfileByAddress(msg.FromAddress);
                const creator = profile ? profile.URN : 'anonymous';
                videoName.innerText = `${sanitizedFilename} by ${creator}`;
                listItem.appendChild(videoName);

                const buttonContainer = document.createElement('div');

                const addButton = document.createElement('button');
                addButton.innerText = 'Add';
                addButton.style.fontSize = '10px';
                addButton.style.marginLeft = '5px';
                addButton.onclick = () => {
                    const track = {
                        name: sanitizedFilename,
                        url: buildIPFSUrl(hash, sanitizedFilename)
                    };
                    if (!videoPlaylist.some(t => t.url === track.url)) {
                        if (videoPlaylist.length >= 10) {
                            videoPlaylist.shift(); // Remove the oldest video
                        }
                        videoPlaylist.push(track);
                        addMessage(`${sanitizedFilename} added to playlist`);
                    } else {
                        addMessage(`${sanitizedFilename} is already in the playlist`);
                    }
                };
                buttonContainer.appendChild(addButton);
                listItem.appendChild(buttonContainer);
                videoList.appendChild(listItem);
            }
        });
        document.getElementById('videoNextBtn').disabled = messages.length < 50;
    } catch (error) {
        console.error("Failed to fetch videos for menu:", error);
        videoList.innerHTML = '<li>Error loading videos</li>';
    }
}
