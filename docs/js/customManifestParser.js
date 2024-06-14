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
      const mpd = new DOMParser().parseFromString(data, 'application/xml');
      const minimumUpdatePeriod = parseFloat(mpd.querySelector('MPD').getAttribute('minimumUpdatePeriod') || '5'); // Default to 5 seconds if not specified
      const periods = mpd.getElementsByTagName('Period');
      const tracks = [];
      const events = [];
  
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
            audioSamplingRate: adaptationSet.getAttribute('audioSamplingRate') || 'n/a',
            width: adaptationSet.getAttribute('width') || 'n/a',
            height: adaptationSet.getAttribute('height') || 'n/a',
            frameRate: adaptationSet.getAttribute('frameRate') || 'n/a',
            mimeType: mimeType,
            type: type
          };
  
          const representations = adaptationSet.getElementsByTagName('Representation');
          Array.from(representations).forEach((representation) => {
            const bandwidth = representation.getAttribute('bandwidth') || 'n/a';
  
            console.log(`DASH Track: Type: ${type}, Bitrate: ${bandwidth}`);
  
            tracks.push({
              ...trackData,
              bitrate: bandwidth !== 'n/a' ? parseInt(bandwidth) : 'n/a' // Ensure bandwidth is parsed as integer
            });
          });
        });
  
        const eventStreams = period.getElementsByTagName('EventStream');
        Array.from(eventStreams).forEach((eventStream) => {
          const timescale = parseFloat(eventStream.getAttribute('timescale')) || 1;
          const streamEvents = eventStream.getElementsByTagName('Event');
          Array.from(streamEvents).forEach((event) => {
            const presentationTime = parseFloat(event.getAttribute('presentationTime')) || 0;
            const duration = parseFloat(event.getAttribute('duration')) || 0;
            const startTimeInSeconds = presentationTime / timescale;
            const endTimeInSeconds = (presentationTime + duration) / timescale;
  
            // Create ISO strings for start and end times
            const startDate = new Date(startTimeInSeconds * 1000).toISOString();
            const endDate = new Date(endTimeInSeconds * 1000).toISOString();
  
            // Calculate duration
            const durationInSeconds = endTimeInSeconds - startTimeInSeconds;
            const durationHours = Math.floor(durationInSeconds / 3600);
            const durationMinutes = Math.floor((durationInSeconds % 3600) / 60);
            const durationSeconds = (durationInSeconds % 60).toFixed(6);
            const durationString = `${String(durationHours).padStart(2, '0')}:${String(durationMinutes).padStart(2, '0')}:${String(durationSeconds).padStart(9, '0')}`;
  
            const messageData = event.textContent;
            console.log(`DASH Event: ID: ${event.getAttribute('id')}, Start: ${startDate}, End: ${endDate}, Duration: ${durationString}, Message: ${messageData}`);
  
            events.push({
              id: event.getAttribute('id') || 'n/a',
              start: startDate,
              end: endDate,
              duration: durationString
            });
          });
        });
      });
  
      console.log('Parsed DASH manifest tracks:', tracks);
      console.log('Parsed DASH events:', events);
      return { tracks, events, minimumUpdatePeriod };
    }
  
    async parseManifest(uri) {
      const response = await fetch(uri);
      const manifestText = await response.text();
      return this.loadManifest_(manifestText);
    }
  }
  