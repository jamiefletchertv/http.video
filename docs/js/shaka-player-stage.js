import { CustomManifestParser } from './customManifestParser-stage.js';
import { updateTrackTable, updateEventTable, highlightActiveEvent, showActiveEventOverlay, showLiveEdgeOverlay } from './ui-stage.js';
import { parseHlsManifest, parseHlsEvents } from './utils-stage.js';

document.addEventListener('DOMContentLoaded', function() {
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

  const toggleTrackInfo = document.getElementById('toggleTrackInfo');
  const toggleTimedMetadata = document.getElementById('toggleTimedMetadata');
  const toggleManifestTiming = document.getElementById('toggleManifestTiming');

  let shakaPlayer = null;
  let updateInterval = null;

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
      eventOverlay.style.display = 'block';
    } else {
      eventTable.classList.add('hidden');
      eventOverlay.style.display = 'none';
    }
  });

  toggleManifestTiming.addEventListener('change', () => {
    if (toggleManifestTiming.checked) {
      liveEdgeOverlay.style.display = 'block';
    } else {
      liveEdgeOverlay.style.display = 'none';
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

      if (manifestUri.endsWith('.mpd')) {
        const parser = new CustomManifestParser();
        const result = await parser.parseManifest(manifestUri);
        updateTrackTable(result.tracks);
        updateEventTable(result.events);

        if (result.type === 'dynamic') {
          const minimumUpdatePeriod = result.minimumUpdatePeriod || 5; // Default to 5 seconds if not specified
          updateInterval = setInterval(async () => {
            const updatedResult = await parser.parseManifest(manifestUri);
            updateTrackTable(updatedResult.tracks);
            updateEventTable(updatedResult.events);
            // Update live edge time
            if (updatedResult.segmentTimelines.length > 0) {
              const liveEdgeTime = updatedResult.segmentTimelines[0].segments.slice(-1)[0].live_edge_time;
              showLiveEdgeOverlay(liveEdgeTime);
            }
          }, minimumUpdatePeriod * 1000);

          // Set interval to update active event highlighting and current time display
          setInterval(() => {
            highlightActiveEvent(result.events);
            if (toggleTimedMetadata.checked) {
              showActiveEventOverlay(result.events);
            }
          }, 1000); // Check every second

          // Log the segment timelines to the console
          console.log('Parsed SegmentTimelines:', result.segmentTimelines);
        } else {
          // Set interval to update active event highlighting and current time display for static manifests
          setInterval(() => {
            highlightActiveEvent(result.events);
            if (toggleTimedMetadata.checked) {
              showActiveEventOverlay(result.events);
            }
          }, 1000); // Check every second
        }
      } else if (manifestUri.endsWith('.m3u8')) {
        const tracks = await parseHlsManifest(manifestUri);
        updateTrackTable(tracks);
        const events = await parseHlsEvents(manifestUri);
        updateEventTable(events);
      }
    } catch (e) {
      console.error('Error loading manifest:', e);
      feedback.textContent = 'Error loading manifest. Please check the console for more details.';
      errorMessage.textContent = 'Invalid URL or failed to load the manifest. Please try again.';
      errorMessage.style.color = 'red';
    }
  }

  function resetPlayer() {
    if (shakaPlayer) {
      shakaPlayer.destroy();
      shakaPlayer = null;
    }

    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }

    video.pause();
    video.src = '';
    manifestSelector.value = '';
    customManifestUrl.value = '';
    feedback.textContent = 'Active Player: None';
    errorMessage.textContent = '';

    trackTable.classList.add('hidden');
    eventTable.classList.add('hidden');
    eventOverlay.style.display = 'none';
    liveEdgeOverlay.style.display = 'none';
  }
});
