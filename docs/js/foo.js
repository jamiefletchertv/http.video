import { CustomManifestParser } from './customManifestParser-stage.js';
import { updateTrackTable, updateEventTable, highlightActiveEvent, showActiveEventOverlay, showLiveEdgeOverlay, showMediaTimeOverlay, renderMetadataTree } from './ui-stage.js';
import { parseHlsManifest, parseHlsEvents } from './utils-stage.js';

document.addEventListener('DOMContentLoaded', function () {
  const video = document.getElementById('video');
  const manifestSelector = document.getElementById('manifestSelector');
  const customManifestUrl = document.getElementById('customManifestUrl');
  const playButton = document.getElementById('playButton');
  const resetButton = document.getElementById('resetButton');
  const feedback = document.getElementById('feedback');
  const errorMessage = document.getElementById('errorMessage');
  const trackTable = document.getElementById('trackTable');
  const eventTable = document.getElementById('eventTable');
  const eventOverlay = document.getElementById('eventOverlay');
  const liveEdgeOverlay = document.getElementById('liveEdgeOverlay');
  const mediaTimeOverlay = document.getElementById('mediaTimeOverlay');
  const metadataTree = document.getElementById('metadataTree');

  const toggleTrackInfo = document.getElementById('toggleTrackInfo');
  const toggleTimedMetadata = document.getElementById('toggleTimedMetadata');
  const toggleManifestTiming = document.getElementById('toggleManifestTiming');

  let shakaPlayer = null;
  let updateInterval = null;
  let mediaTimeInterval = null;

  // Play button click event
  playButton.addEventListener('click', () => {
    const manifestUri = manifestSelector.value || customManifestUrl.value.trim();
    if (!manifestUri) {
      feedback.textContent = 'Please select or enter a valid manifest URL.';
      return;
    }
    loadPlayer(manifestUri);
    feedback.textContent = `Active Player: Shaka Player`;
  });

  // Reset button click event
  resetButton.addEventListener('click', () => {
    resetPlayer();
  });

  // Toggle switches
  toggleTrackInfo.addEventListener('change', () => {
    if (toggleTrackInfo.checked) {
      trackTable.classList.remove('hidden');
    } else {
      trackTable.classList.add('hidden');
    }
  });

  toggleTimedMetadata.addEventListener('change', () => {
    if (toggleTimedMetadata.checked) {
      eventTable.classList.remove('hidden');
      eventOverlay.classList.remove('hidden');
    } else {
      eventTable.classList.add('hidden');
      eventOverlay.classList.add('hidden');
    }
  });

  toggleManifestTiming.addEventListener('change', () => {
    if (toggleManifestTiming.checked) {
      liveEdgeOverlay.classList.remove('hidden');
      mediaTimeOverlay.classList.remove('hidden');
    } else {
      liveEdgeOverlay.classList.add('hidden');
      mediaTimeOverlay.classList.add('hidden');
    }
  });

  // Load the player with the manifest URI
  async function loadPlayer(manifestUri) {
    // Stop the video and clear any existing player instance
    if (shakaPlayer) {
      await shakaPlayer.destroy();
      shakaPlayer = null;
    }

    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }

    if (mediaTimeInterval) {
      clearInterval(mediaTimeInterval);
      mediaTimeInterval = null;
    }

    const trackTableBody = trackTable.querySelector('tbody');
    const eventTableBody = eventTable.querySelector('tbody');

    trackTableBody.innerHTML = '';
    eventTableBody.innerHTML = '';

    shakaPlayer = new shaka.Player(video);
    try {
      await shakaPlayer.load(manifestUri);
      video.play();
      customManifestUrl.value = ''; // Clear the input field on successful load
      errorMessage.textContent = ''; // Clear any previous error message

      mediaTimeInterval = setInterval(() => {
        const currentTime = video.currentTime;
        const mediaTime = new Date(currentTime * 1000).toISOString();
        if (toggleManifestTiming.checked) {
          showMediaTimeOverlay(mediaTime);
        }

        if (toggleTimedMetadata.checked) {
          // Highlight active events and show overlays based on media time
          highlightActiveEvent(mediaTime);
          showActiveEventOverlay(mediaTime);
        }
      }, 1000);

      if (manifestUri.endsWith('.mpd')) {
        const parser = new CustomManifestParser();
        const result = await parser.parseManifest(manifestUri);
        updateTrackTable(result.tracks);
        updateEventTable(result.events);
        renderMetadataTree(result.tracks);

        if (result.type === 'dynamic') {
          const minimumUpdatePeriod = result.minimumUpdatePeriod || 5; // Default to 5 seconds if not specified
          updateInterval = setInterval(async () => {
            const updatedResult = await parser.parseManifest(manifestUri);
            updateTrackTable(updatedResult.tracks);
            updateEventTable(updatedResult.events);
            renderMetadataTree(updatedResult.tracks);
            // Update live edge time
            if (updatedResult.segmentTimelines.length > 0) {
              const liveEdgeTime = updatedResult.segmentTimelines[0].segments.slice(-1)[0].live_edge_time;
              if (toggleManifestTiming.checked) {
                showLiveEdgeOverlay(liveEdgeTime);
              }
            }
          }, minimumUpdatePeriod * 1000);
        }
      } else if (manifestUri.endsWith('.m3u8')) {
        const tracks = await parseHlsManifest(manifestUri);
        updateTrackTable(tracks);
        updateEventTable([]);
        renderMetadataTree(tracks);
      }
    } catch (e) {
      errorMessage.textContent = 'Error loading manifest';
      errorMessage.classList.add('text-danger');
      console.error('Error loading manifest:', e);
    }
  }

  function resetPlayer() {
    if (shakaPlayer) {
      shakaPlayer.destroy().then(() => {
        shakaPlayer = null;
        video.pause();
        video.currentTime = 0;
        feedback.textContent = 'Active Player: None';
        errorMessage.textContent = '';
        customManifestUrl.value = '';
        manifestSelector.value = '';
        trackTable.classList.add('hidden');
        eventTable.classList.add('hidden');
        hideOverlays();
        metadataTree.innerHTML = '<h2>Track Information</h2>';
      });
    }
  }

  function hideOverlays() {
    eventOverlay.style.display = 'hidden';
    liveEdgeOverlay.style.display = 'hidden';
    mediaTimeOverlay.style.display = 'hidden';
  }
});
