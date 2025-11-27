let currentVideoInfo = null;
let videoData = null;
let isLoadingDetails = false;
let isDownloading = false;
let statusTimer = null;
let currentImageIndex = 0;
let images = [];

const apiEndpoints = [
    {
        url: "https://tikwm.com/api/",
        videoKey: ["data", "play"],
        hdVideoKey: ["data", "hdplay"],
        imageKey: ["data", "images"],
        musicKey: ["data", "music"],
        titleKey: ["data", "title"],
        authorKey: ["data", "author", "nickname"],
        usernameKey: ["data", "author", "unique_id"],
        thumbnailKey: ["data", "cover"],
        durationKey: ["data", "duration"]
    },
    {
        url: "https://api.tikapi.io/public/download",
        videoKey: ["video"],
        hdVideoKey: ["video_hd"],
        imageKey: ["images"],
        musicKey: ["music"],
        titleKey: ["title"],
        authorKey: ["author"],
        usernameKey: ["username"],
        thumbnailKey: ["thumbnail"],
        durationKey: ["duration"]
    }
];

const urlInput = document.getElementById('urlInput');
const clearBtn = document.getElementById('clearBtn');
const fetchBtn = document.getElementById('fetchBtn');

urlInput.addEventListener('input', function() {
    const url = this.value.trim();
    
    if (url) {
        fetchBtn.disabled = false;
        clearBtn.classList.add('show');
    } else {
        fetchBtn.disabled = true;
        clearBtn.classList.remove('show');
    }
    
    if (currentVideoInfo) {
        hideVideoPreview();
        currentVideoInfo = null;
        videoData = null;
    }
});

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            urlInput.value = text;
            fetchBtn.disabled = false;
            clearBtn.classList.add('show');
            hideVideoPreview();
            hideStatus();
        }
    } catch (err) {
        showStatus('Failed to read clipboard. Please paste manually.', 'error');
    }
}

function clearUrl() {
    urlInput.value = '';
    fetchBtn.disabled = true;
    clearBtn.classList.remove('show');
    hideVideoPreview();
    hideStatus();
    currentVideoInfo = null;
    videoData = null;
    currentImageIndex = 0;
    images = [];
    
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.pause();
    videoPlayer.src = '';
}

function isValidTikTokUrl(url) {
    return url.includes('tiktok.com') || 
           url.includes('vm.tiktok.com') || 
           url.includes('vt.tiktok.com');
}

function getNestedValue(data, keys) {
    let current = data;
    for (let key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return null;
        }
    }
    return current;
}

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(duration) {
    if (!duration) return '0:00';
    
    let seconds = parseInt(duration) || 0;
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');
    
    statusText.textContent = message;
    statusEl.className = `status-message status-${type} show`;
    
    if (type === 'success') {
        statusIcon.innerHTML = '<path d="M10 18.333a8.333 8.333 0 1 0 0-16.666 8.333 8.333 0 0 0 0 16.666z" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 10l2.5 2.5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
    } else {
        statusIcon.innerHTML = '<path d="M10 18.333a8.333 8.333 0 1 0 0-16.666 8.333 8.333 0 0 0 0 16.666z" stroke="currentColor" stroke-width="1.5"/><path d="M10 6.667V10M10 13.333h.008" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
    }
    
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
        hideStatus();
    }, type === 'success' ? 3000 : 5000);
}

function hideStatus() {
    const statusEl = document.getElementById('statusMessage');
    statusEl.classList.remove('show');
}

function showVideoPreview(info) {
    document.getElementById('videoTitle').textContent = info.title;
    document.getElementById('videoAuthor').textContent = info.author;
    
    const mediaTypeBadge = document.getElementById('mediaTypeBadge');
    const mediaTypeText = document.getElementById('mediaTypeText');
    const durationBadge = document.getElementById('durationBadge');
    const videoSizeEl = document.getElementById('videoSize');
    const videoContainer = document.getElementById('videoContainer');
    const imageContainer = document.getElementById('imageContainer');
    const downloadOptions = document.getElementById('downloadOptions');
    const downloadVideoBtn = document.getElementById('downloadVideoBtn');
    const downloadAudioBtn = document.getElementById('downloadAudioBtn');
    const downloadImagesBtn = document.getElementById('downloadImagesBtn');
    
    if (info.mediaType === 'image') {
        mediaTypeText.textContent = 'Images';
        durationBadge.classList.remove('show');
        videoSizeEl.textContent = `${info.size} photos`;
        
        videoContainer.classList.remove('show');
        imageContainer.classList.add('show');
        downloadOptions.classList.add('show');
        
        downloadVideoBtn.classList.add('hidden');
        downloadAudioBtn.classList.remove('hidden');
        downloadImagesBtn.classList.remove('hidden');
        
        displayImage(currentImageIndex);
        updateImageNavigation();
    } else {
        mediaTypeText.textContent = 'Video';
        durationBadge.classList.add('show');
        document.getElementById('videoDuration').textContent = info.duration;
        videoSizeEl.textContent = formatFileSize(info.size);
        
        imageContainer.classList.remove('show');
        videoContainer.classList.add('show');
        downloadOptions.classList.add('show');
        
        downloadVideoBtn.classList.remove('hidden');
        downloadAudioBtn.classList.remove('hidden');
        downloadImagesBtn.classList.add('hidden');
        
        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.src = info.videoUrl;
        videoPlayer.load();
    }
    
    const videoPreview = document.getElementById('videoPreview');
    videoPreview.classList.add('show');
}

function hideVideoPreview() {
    const videoPreview = document.getElementById('videoPreview');
    videoPreview.classList.remove('show');
    
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.pause();
    videoPlayer.src = '';
}

function displayImage(index) {
    if (images.length === 0) return;
    
    const imagePlayer = document.getElementById('imagePlayer');
    imagePlayer.src = images[index];
    
    document.getElementById('currentImageIndex').textContent = index + 1;
    document.getElementById('totalImages').textContent = images.length;
}

function updateImageNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (images.length <= 1) {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    }
}

function previousImage() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        displayImage(currentImageIndex);
    } else {
        currentImageIndex = images.length - 1;
        displayImage(currentImageIndex);
    }
}

function nextImage() {
    if (currentImageIndex < images.length - 1) {
        currentImageIndex++;
        displayImage(currentImageIndex);
    } else {
        currentImageIndex = 0;
        displayImage(currentImageIndex);
    }
}

function showLoading() {
    const loadingState = document.getElementById('loadingState');
    loadingState.classList.add('show');
}

function hideLoading() {
    const loadingState = document.getElementById('loadingState');
    loadingState.classList.remove('show');
}

function showProgress(percent, downloaded, total) {
    const progressEl = document.getElementById('downloadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressInfo = document.getElementById('progressInfo');
    const progressBar = document.querySelector('.progress-bar');
    
    progressEl.classList.add('show');
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);
    
    if (downloaded && total) {
        if (typeof downloaded === 'number' && typeof total === 'number') {
            progressInfo.textContent = `${formatFileSize(downloaded)} / ${formatFileSize(total)}`;
        } else {
            progressInfo.textContent = `${downloaded} / ${total}`;
        }
    } else {
        progressInfo.textContent = 'Preparing download...';
    }
}

function hideProgress() {
    const progressEl = document.getElementById('downloadProgress');
    progressEl.classList.remove('show');
    document.getElementById('progressFill').style.width = '0%';
}

async function handleFetch() {
    const url = urlInput.value.trim();
    
    if (!isValidTikTokUrl(url)) {
        showStatus('Please enter a valid TikTok URL', 'error');
        return;
    }
    
    isLoadingDetails = true;
    fetchBtn.disabled = true;
    
    const originalText = document.getElementById('fetchBtnText').textContent;
    document.getElementById('fetchBtnText').textContent = 'Loading...';
    const fetchBtnIcon = document.getElementById('fetchBtnIcon');
    fetchBtnIcon.style.display = 'none';
    
    hideStatus();
    hideVideoPreview();
    showLoading();
    
    for (let api of apiEndpoints) {
        try {
            const response = await fetch(`${api.url}?url=${encodeURIComponent(url)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                const imageList = getNestedValue(data, api.imageKey);
                const hdVideoUrl = getNestedValue(data, api.hdVideoKey);
                const videoUrl = getNestedValue(data, api.videoKey);
                const musicUrl = getNestedValue(data, api.musicKey);
                
                let mediaUrl = null;
                let mediaType = 'video';
                let totalSize = 0;
                let hasImages = false;
                
                if (imageList && Array.isArray(imageList) && imageList.length > 0) {
                    hasImages = true;
                    mediaUrl = imageList;
                    mediaType = 'image';
                    totalSize = imageList.length;
                    images = imageList;
                    currentImageIndex = 0;
                } else if (hdVideoUrl || videoUrl) {
                    mediaUrl = hdVideoUrl || videoUrl;
                    mediaType = 'video';
                }
                
                if (mediaUrl) {
                    const title = getNestedValue(data, api.titleKey) || 'TikTok Media';
                    const author = getNestedValue(data, api.authorKey) || 'Unknown';
                    const username = getNestedValue(data, api.usernameKey) || 'Unknown';
                    const thumbnailUrl = getNestedValue(data, api.thumbnailKey);
                    const duration = getNestedValue(data, api.durationKey);
                    
                    if (mediaType === 'video') {
                        try {
                            const headResponse = await fetch(mediaUrl, { method: 'HEAD' });
                            const contentLength = headResponse.headers.get('content-length');
                            totalSize = contentLength ? parseInt(contentLength) : 0;
                        } catch (e) {
                            console.log('Could not get video size');
                        }
                    }
                    
                    currentVideoInfo = {
                        title,
                        author,
                        username,
                        size: totalSize,
                        duration: formatDuration(duration),
                        thumbnailUrl,
                        mediaType,
                        videoUrl: mediaUrl,
                        musicUrl: musicUrl
                    };
                    
                    videoData = {
                        mediaUrl,
                        title,
                        author,
                        username,
                        size: totalSize,
                        mediaType,
                        musicUrl: musicUrl
                    };
                    
                    hideLoading();
                    showVideoPreview(currentVideoInfo);
                    document.getElementById('fetchBtnText').textContent = originalText;
                    fetchBtnIcon.style.display = 'block';
                    fetchBtn.disabled = false;
                    isLoadingDetails = false;
                    return;
                }
            }
        } catch (error) {
            console.error('API error:', error);
            continue;
        }
    }
    
    hideLoading();
    showStatus('Failed to get media details. Please try again.', 'error');
    document.getElementById('fetchBtnText').textContent = originalText;
    fetchBtnIcon.style.display = 'block';
    fetchBtn.disabled = false;
    isLoadingDetails = false;
}

async function downloadVideo() {
    if (!videoData || videoData.mediaType !== 'video') return;
    
    isDownloading = true;
    const downloadVideoBtn = document.getElementById('downloadVideoBtn');
    downloadVideoBtn.disabled = true;
    downloadVideoBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div><span>Downloading...</span>';
    
    try {
        hideStatus();
        showProgress(0);
        
        const response = await fetch(videoData.mediaUrl);
        const reader = response.body.getReader();
        const contentLength = videoData.size || parseInt(response.headers.get('content-length'));
        
        let receivedLength = 0;
        let chunks = [];
        
        while (true) {
            const {done, value} = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            receivedLength += value.length;
            
            if (contentLength) {
                const percent = Math.round((receivedLength / contentLength) * 100);
                showProgress(percent, receivedLength, contentLength);
            }
        }
        
        let blob = new Blob(chunks, { type: 'video/mp4' });
        
        const timestamp = Date.now();
        const cleanUsername = videoData.username.replace(/[^\w\s-]/g, '');
        const filename = `TikTok_${timestamp}_${cleanUsername}.mp4`;
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        hideProgress();
        showStatus('Video downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        hideProgress();
        showStatus('Failed to download video. Please try again.', 'error');
    } finally {
        isDownloading = false;
        downloadVideoBtn.disabled = false;
        downloadVideoBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 3v9m0 0l-3-3m3 3l3-3M3 15h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Download Video</span>';
    }
}

async function downloadAudio() {
    if (!videoData) return;
    
    isDownloading = true;
    const downloadAudioBtn = document.getElementById('downloadAudioBtn');
    downloadAudioBtn.disabled = true;
    downloadAudioBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div><span>Converting...</span>';
    
    try {
        hideStatus();
        showProgress(0);
        
        const audioUrl = videoData.musicUrl || videoData.mediaUrl;
        
        const response = await fetch(audioUrl);
        const reader = response.body.getReader();
        const contentLength = parseInt(response.headers.get('content-length')) || 0;
        
        let receivedLength = 0;
        let chunks = [];
        
        while (true) {
            const {done, value} = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            receivedLength += value.length;
            
            if (contentLength) {
                const percent = Math.round((receivedLength / contentLength) * 100);
                showProgress(percent, receivedLength, contentLength);
            }
        }
        
        let blob = new Blob(chunks, { type: 'audio/mpeg' });
        
        const timestamp = Date.now();
        const cleanUsername = videoData.username.replace(/[^\w\s-]/g, '');
        const filename = `TikTok_${timestamp}_${cleanUsername}.mp3`;
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        hideProgress();
        showStatus('Audio downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        hideProgress();
        showStatus('Failed to download audio. Please try again.', 'error');
    } finally {
        isDownloading = false;
        downloadAudioBtn.disabled = false;
        downloadAudioBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M14.25 7.5v6a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 13.5v-6M9 3v7.5m0 0L6 7.5m3 3l3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Download Audio (MP3)</span>';
    }
}

async function downloadImages() {
    if (!videoData || videoData.mediaType !== 'image') return;
    
    isDownloading = true;
    const downloadImagesBtn = document.getElementById('downloadImagesBtn');
    downloadImagesBtn.disabled = true;
    downloadImagesBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div><span>Downloading...</span>';
    
    try {
        hideStatus();
        showProgress(0);
        
        const imageList = videoData.mediaUrl;
        const timestamp = Date.now();
        const cleanUsername = videoData.username.replace(/[^\w\s-]/g, '');
        
        for (let i = 0; i < imageList.length; i++) {
            try {
                const response = await fetch(imageList[i]);
                const blob = await response.blob();
                
                const filename = `TikTok_${timestamp}_${cleanUsername}_${i + 1}.jpg`;
                
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
                
                const percent = Math.round(((i + 1) / imageList.length) * 100);
                showProgress(percent, i + 1, imageList.length);
                
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Failed to download image ${i + 1}:`, error);
            }
        }
        
        hideProgress();
        showStatus(`${imageList.length} images downloaded successfully!`, 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        hideProgress();
        showStatus('Failed to download images. Please try again.', 'error');
    } finally {
        isDownloading = false;
        downloadImagesBtn.disabled = false;
        downloadImagesBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 3v9m0 0l-3-3m3 3l3-3M3 15h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Download ${videoData.size} Images</span>`;
    }
}