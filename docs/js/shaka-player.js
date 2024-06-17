import { CustomManifestParser } from './customManifestParser.js';
import { updateTrackTable, updateEventTable, highlightActiveEvent, showActiveEventOverlay, showLiveEdgeOverlay } from './ui.js';
import { parseHlsManifest, parseHlsEvents } from './utils.js';

document.addEventListener('DOMContentLoaded', function() {
  const video = document.getElementById('video');
  const manifestSelector = document.getElementById('manifestSelector');
  const playButton = document.getElementById('playButton');
  const feedback = document.getElementById('feedback');
  let shakaPlayer = null;
  let updateInterval = null;

  // Play button click event
  playButton.addEventListener('click', () => {
    const manifestUri = manifestSelector.value;
    loadPlayer(manifestUri);
    feedback.textContent = `Active Player: Shaka Player`;
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

    const trackTable = document.getElementById('trackTable');
    const trackTableBody = trackTable.querySelector('tbody');
    const eventTable = document.getElementById('eventTable');
    const eventTableBody = eventTable.querySelector('tbody');

    trackTable.style.display = 'none';
    trackTableBody.innerHTML = '';
    eventTable.style.display = 'none';
    eventTableBody.innerHTML = '';

    shakaPlayer = new shaka.Player(video);
    try {
      await shakaPlayer.load(manifestUri);
      video.play();

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
            showActiveEventOverlay(result.events);
          }, 1000); // Check every second

          // Log the segment timelines to the console
          console.log('Parsed SegmentTimelines:', result.segmentTimelines);
        } else {
          // Set interval to update active event highlighting and current time display for static manifests
          setInterval(() => {
            highlightActiveEvent(result.events);
            showActiveEventOverlay(result.events);
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
    }
  }
});