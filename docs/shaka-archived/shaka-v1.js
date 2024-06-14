document.addEventListener('DOMContentLoaded', function() {
  const video = document.getElementById('video');
  const manifestSelector = document.getElementById('manifestSelector');
  const playButton = document.getElementById('playButton');
  const feedback = document.getElementById('feedback');
  const trackTable = document.getElementById('trackTable');
  const trackTableBody = trackTable.querySelector('tbody');
  const trackTableHead = trackTable.querySelector('thead');
  let shakaPlayer = null;

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
      shakaPlayer.destroy();
      shakaPlayer = null;
    }

    trackTable.style.display = 'none';
    trackTableBody.innerHTML = '';

    shakaPlayer = new shaka.Player(video);
    try {
      await shakaPlayer.load(manifestUri);
      video.play();

      if (manifestUri.endsWith('.mpd')) {
        const tracks = await parseDashManifest(manifestUri);
        updateTrackTable(tracks);
      } else if (manifestUri.endsWith('.m3u8')) {
        const tracks = await parseHlsManifest(manifestUri);
        updateTrackTable(tracks);
      }
    } catch (e) {
      console.error('Error loading manifest:', e);
    }
  }

  // Function to update the track table
  function updateTrackTable(tracks) {
    const columns = new Set();
    tracks.forEach(track => {
      Object.keys(track).forEach(key => columns.add(key));
    });

    trackTableHead.innerHTML = '<tr></tr>';
    const headerRow = trackTableHead.querySelector('tr');
    columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column.charAt(0).toUpperCase() + column.slice(1);
      headerRow.appendChild(th);
    });

    trackTableBody.innerHTML = '';
    tracks.forEach(track => {
      const row = trackTableBody.insertRow();
      columns.forEach(column => {
        const cell = row.insertCell();
        cell.textContent = track[column] || 'n/a';
      });
    });
    trackTable.style.display = '';
  }

  // Parse DASH manifest using Shaka Player's built-in parser
  async function parseDashManifest(manifestUri) {
    const response = await fetch(manifestUri);
    const manifestText = await response.text();
    const mpd = new DOMParser().parseFromString(manifestText, 'application/xml');

    const periods = mpd.getElementsByTagName('Period');
    const tracks = [];

    Array.from(periods).forEach((period) => {
      const adaptationSets = period.getElementsByTagName('AdaptationSet');
      Array.from(adaptationSets).forEach((adaptationSet) => {
        const mimeType = adaptationSet.getAttribute('mimeType') || 'n/a';
        let type = 'unknown';
        if (mimeType.includes('video')) type = 'video';
        else if (mimeType.includes('audio')) type = 'audio';
        else if (mimeType.includes('text')) type = 'subtitle';

        const trackData = {
          id: adaptationSet.getAttribute('id') || 'n/a',
          group: adaptationSet.getAttribute('group') || 'n/a',
          contentType: adaptationSet.getAttribute('contentType') || 'n/a',
          lang: adaptationSet.getAttribute('lang') || 'n/a',
          minBandwidth: adaptationSet.getAttribute('minBandwidth') || 'n/a',
          maxBandwidth: adaptationSet.getAttribute('maxBandwidth') || 'n/a',
          segmentAlignment: adaptationSet.getAttribute('segmentAlignment') || 'n/a',
          audioSamplingRate: adaptationSet.getAttribute('audioSamplingRate') || 'n/a',
          width: adaptationSet.getAttribute('width') || 'n/a',
          height: adaptationSet.getAttribute('height') || 'n/a',
          sar: adaptationSet.getAttribute('sar') || 'n/a',
          frameRate: adaptationSet.getAttribute('frameRate') || 'n/a',
          mimeType: mimeType,
          codecs: adaptationSet.getAttribute('codecs') || 'n/a',
          type: type
        };

        const representations = adaptationSet.getElementsByTagName('Representation');
        Array.from(representations).forEach((representation) => {
          const bandwidth = representation.getAttribute('bandwidth') || 'n/a';
          const codecs = representation.getAttribute('codecs') || 'n/a';
          const segmentTemplate = representation.getElementsByTagName('SegmentTemplate')[0];
          const timescale = segmentTemplate ? parseInt(segmentTemplate.getAttribute('timescale') || '1') : 1;
          const segmentTimeline = segmentTemplate ? segmentTemplate.getElementsByTagName('S') : [];
          
          // Extract segment duration from the first segment
          const segmentLength = segmentTimeline.length > 0 ? parseInt(segmentTimeline[0].getAttribute('d')) / timescale : 'n/a';

          console.log(`DASH Segment Calculation: Track Type: ${type}, Codec: ${codecs}, Bitrate: ${bandwidth}, Segment Length: ${segmentLength}`);

          tracks.push({
            ...trackData,
            codec: codecs,
            bitrate: bandwidth !== 'n/a' ? parseInt(bandwidth) : 'n/a', // Ensure bandwidth is parsed as integer
            segmentLength: segmentLength !== 'n/a' ? segmentLength.toFixed(2) : 'n/a'
          });
        });
      });
    });

    console.log('Parsed DASH manifest tracks:', tracks);
    return tracks;
  }

  // Custom function to parse HLS manifest
  async function parseHlsManifest(manifestUri) {
    const response = await fetch(manifestUri);
    const manifestText = await response.text();
    const lines = manifestText.split('\n');

    const tracks = [];
    let currentTrack = {};

    lines.forEach(line => {
      if (line.startsWith('#EXT-X-STREAM-INF')) {
        const attrs = line.split(',');
        attrs.forEach(attr => {
          const [key, value] = attr.split('=');
          if (key === 'BANDWIDTH') {
            currentTrack.bitrate = parseInt(value);
          }
          if (key === 'AVERAGE-BANDWIDTH') {
            currentTrack.avgBitrate = parseInt(value);
          }
          if (key === 'CODECS') {
            currentTrack.codec = value.replace(/"/g, '');
          }
          if (key === 'RESOLUTION') {
            const [width, height] = value.split('x');
            currentTrack.width = width;
            currentTrack.height = height;
          }
          if (key === 'FRAME-RATE') {
            currentTrack.frameRate = value;
          }
          if (key === 'VIDEO-RANGE') {
            currentTrack.videoRange = value;
          }
        });
        currentTrack.type = 'video';
        tracks.push(currentTrack);
        currentTrack = {};
      } else if (line.startsWith('#EXT-X-MEDIA') && line.includes('TYPE=AUDIO')) {
        const attrs = line.split(',');
        const audioTrack = {};
        attrs.forEach(attr => {
          const [key, value] = attr.split('=');
          if (key === 'GROUP-ID') {
            audioTrack.groupId = value.replace(/"/g, '');
          }
          if (key === 'LANGUAGE') {
            audioTrack.language = value.replace(/"/g, '');
          }
          if (key === 'NAME') {
            audioTrack.name = value.replace(/"/g, '');
          }
          if (key === 'CHANNELS') {
            audioTrack.channels = value.replace(/"/g, '');
          }
          if (key === 'DEFAULT') {
            audioTrack.default = value === 'YES';
          }
          if (key === 'AUTOSELECT') {
            audioTrack.autoSelect = value === 'YES';
          }
        });
        audioTrack.type = 'audio';
        tracks.push(audioTrack);
      }
    });

    console.log('Parsed HLS manifest tracks:', tracks);
    return tracks;
  }
});
