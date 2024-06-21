export class CustomManifestParser {
  constructor() {
    this.curId_ = 0;
    this.config_ = null;
  }

  configure(config) {
    this.config_ = config;
    console.log('Configuring custom manifest parser with config:', config);
  }

  async start(uri, playerInterface) {
    console.log('Starting custom manifest parser for URI:', uri);
    const type = shaka.net.NetworkingEngine.RequestType.MANIFEST;
    const request = {
      uris: [uri],
      method: 'GET',
      retryParameters: this.config_ ? this.config_.retryParameters : shaka.net.NetworkingEngine.defaultRetryParameters()
    };
    const response = await playerInterface.networkingEngine.request(type, request).promise;
    return this.loadManifest_(response.data);
  }

  stop() {
    console.log('Stopping custom manifest parser');
    return Promise.resolve();
  }

  loadManifest_(data) {
    console.log('Loading manifest data');
    const mpd = new DOMParser().parseFromString(data, 'application/xml');
    const timeline = new shaka.media.PresentationTimeline(null, 0);
    const duration = parseFloat(mpd.querySelector('MPD').getAttribute('mediaPresentationDuration') || '3600');
    timeline.setDuration(duration);

    const periods = mpd.getElementsByTagName('Period');
    const variants = [];
    const textStreams = [];
    const segmentTimelines = [];
    const events = [];

    Array.from(periods).forEach((period, periodIndex) => {
      const adaptationSets = period.getElementsByTagName('AdaptationSet');
      Array.from(adaptationSets).forEach((adaptationSet, adaptationIndex) => {
        const mimeType = adaptationSet.getAttribute('mimeType') || 'n/a';
        let type = 'unknown';
        if (mimeType.includes('video')) type = 'video';
        else if (mimeType.includes('audio')) type = 'audio';
        else if (mimeType.includes('text')) type = 'text';

        const segmentTemplate = adaptationSet.querySelector('SegmentTemplate');
        const timescale = segmentTemplate ? parseFloat(segmentTemplate.getAttribute('timescale')) || 1 : 1;

        if (segmentTemplate) {
          const segmentTimeline = segmentTemplate.querySelector('SegmentTimeline');
          if (segmentTimeline) {
            const segments = [];
            Array.from(segmentTimeline.getElementsByTagName('S')).forEach((s, segmentIndex) => {
              const t = parseInt(s.getAttribute('t') || '0');
              const d = parseInt(s.getAttribute('d') || '0');
              const r = parseInt(s.getAttribute('r') || '0');

              let liveEdgeTime = t + d / timescale; // Calculate the initial segment end time
              if (r > 0) {
                liveEdgeTime += (r * d) / timescale;
              }

              const segmentDurationSeconds = d / timescale;

              console.log(`Period ${periodIndex}, AdaptationSet ${adaptationIndex}, Segment ${segmentIndex}`);
              console.log(`Timescale: ${timescale}`);
              console.log(`t: ${t}, d: ${d}, r: ${r}, liveEdgeTime: ${liveEdgeTime}, segmentDurationSeconds: ${segmentDurationSeconds}`);

              let liveEdgeTimeIso = 'Invalid time';
              if (!isNaN(liveEdgeTime) && liveEdgeTime > 0 && liveEdgeTime < Number.MAX_SAFE_INTEGER) {
                const liveEdgeDate = new Date(liveEdgeTime * 1000);
                if (liveEdgeDate instanceof Date && !isNaN(liveEdgeDate.getTime())) {
                  liveEdgeTimeIso = liveEdgeDate.toISOString();
                }
              }

              console.log(`liveEdgeTimeIso: ${liveEdgeTimeIso}`);
              segments.push({ t, d, r, live_edge_time: liveEdgeTimeIso, segment_duration_seconds: segmentDurationSeconds });
            });
            segmentTimelines.push({ adaptationSet: adaptationSet.getAttribute('id'), segments });
          }
        }

        const representations = adaptationSet.getElementsByTagName('Representation');
        Array.from(representations).forEach((representation) => {
          const representationId = representation.getAttribute('id');
          const bandwidth = representation.getAttribute('bandwidth') || 'n/a';
          const width = adaptationSet.getAttribute('width') || 'n/a';
          const height = adaptationSet.getAttribute('height') || 'n/a';
          const frameRate = adaptationSet.getAttribute('frameRate') || 'n/a';
          const audioSamplingRate = adaptationSet.getAttribute('audioSamplingRate') || 'n/a';

          console.log(`DASH Track: Type: ${type}, Bitrate: ${bandwidth}, ID: ${representationId}`);

          variants.push({
            id: representationId,
            type: type,
            bitrate: bandwidth !== 'n/a' ? parseInt(bandwidth) : 'n/a',
            width: width !== 'n/a' ? parseInt(width) : 'n/a',
            height: height !== 'n/a' ? parseInt(height) : 'n/a',
            frameRate: frameRate !== 'n/a' ? parseFloat(frameRate) : 'n/a',
            audioSamplingRate: audioSamplingRate !== 'n/a' ? parseFloat(audioSamplingRate) : 'n/a',
            segmentDuration: 'n/a' // Default segment duration
          });
        });
      });

      const eventStreams = period.getElementsByTagName('EventStream');
      Array.from(eventStreams).forEach((eventStream, eventStreamIndex) => {
        const timescale = parseFloat(eventStream.getAttribute('timescale')) || 1;
        const streamEvents = eventStream.getElementsByTagName('Event');
        Array.from(streamEvents).forEach((event, eventIndex) => {
          const presentationTime = parseFloat(event.getAttribute('presentationTime')) || 0;
          const duration = parseFloat(event.getAttribute('duration')) || 0;
          const startTimeInSeconds = presentationTime / timescale;
          const endTimeInSeconds = (presentationTime + duration) / timescale;

          // Create ISO strings for start and end times
          let startDate = 'Invalid time';
          let endDate = 'Invalid time';

          if (!isNaN(startTimeInSeconds) && startTimeInSeconds >= 0) {
            startDate = new Date(startTimeInSeconds * 1000).toISOString();
          }
          if (!isNaN(endTimeInSeconds) && endTimeInSeconds >= 0) {
            endDate = new Date(endTimeInSeconds * 1000).toISOString();
          }

          // Calculate duration
          const durationInSeconds = endTimeInSeconds - startTimeInSeconds;
          const durationHours = Math.floor(durationInSeconds / 3600);
          const durationMinutes = Math.floor((durationInSeconds % 3600) / 60);
          const durationSeconds = (durationInSeconds % 60).toFixed(6);
          const durationString = `${String(durationHours).padStart(2, '0')}:${String(durationMinutes).padStart(2, '0')}:${String(durationSeconds).padStart(9, '0')}`;

          const messageData = event.textContent;
          console.log(`DASH Event: Period ${periodIndex}, EventStream ${eventStreamIndex}, Event ${eventIndex}`);
          console.log(`ID: ${event.getAttribute('id')}, Start: ${startDate}, End: ${endDate}, Duration: ${durationString}, Message: ${messageData}`);

          events.push({
            id: event.getAttribute('id') || 'n/a',
            start: startDate,
            end: endDate,
            duration: durationString
          });
        });
      });
    });

    console.log('Parsed DASH manifest tracks:', variants);
    console.log('Parsed DASH events:', events);
    console.log('Parsed DASH segment timelines:', segmentTimelines);
    return { tracks: variants, events: events, minimumUpdatePeriod: 5, segmentTimelines, type: mpd.querySelector('MPD').getAttribute('type') };
  }

  async parseManifest(uri) {
    const response = await fetch(uri);
    const manifestText = await response.text();
    return this.loadManifest_(manifestText);
  }
}
