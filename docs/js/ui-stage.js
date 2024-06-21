let previousTreeState = {};

export function updateTrackTable(tracks) {
  const trackTable = document.getElementById('trackTable');
  const trackTableBody = trackTable.querySelector('tbody');
  const trackTableHead = trackTable.querySelector('thead');

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
}

export function updateEventTable(events) {
  const eventTable = document.getElementById('eventTable');
  const eventTableBody = eventTable.querySelector('tbody');

  eventTableBody.innerHTML = '';
  events.forEach(event => {
    const row = eventTableBody.insertRow();
    row.insertCell().textContent = event.id || 'n/a';
    row.insertCell().textContent = event.start || 'n/a';
    row.insertCell().textContent = event.end || 'n/a';
    row.insertCell().textContent = event.duration || 'n/a';
  });
  sortEventTable(); // Ensure table is sorted
}

function sortEventTable() {
  const eventTable = document.getElementById('eventTable');
  const eventTableBody = eventTable.querySelector('tbody');
  const rows = Array.from(eventTableBody.rows);

  rows.sort((a, b) => {
    const dateA = new Date(a.cells[1].textContent);
    const dateB = new Date(b.cells[1].textContent);
    return dateB - dateA; // Sort descending
  });

  eventTableBody.innerHTML = '';
  rows.forEach(row => eventTableBody.appendChild(row));
}

export function highlightActiveEvent(mediaTime) {
  const eventTable = document.getElementById('eventTable');
  const eventTableBody = eventTable.querySelector('tbody');

  Array.from(eventTableBody.rows).forEach(row => {
    const start = row.cells[1].textContent;
    const end = row.cells[2].textContent;
    if (mediaTime >= start && mediaTime <= end) {
      row.classList.add('highlighted');
    } else {
      row.classList.remove('highlighted');
    }
  });
}

export function showActiveEventOverlay(mediaTime) {
  const eventOverlay = document.getElementById('eventOverlay');
  const events = Array.from(document.getElementById('eventTable').querySelector('tbody').rows).map(row => ({
    id: row.cells[0].textContent,
    start: row.cells[1].textContent,
    end: row.cells[2].textContent,
    duration: row.cells[3].textContent
  }));

  const activeEvent = events.find(event => mediaTime >= event.start && mediaTime <= event.end);
  if (activeEvent) {
    eventOverlay.textContent = `Active Event: ${activeEvent.id} until ${activeEvent.end}`;
    eventOverlay.style.display = 'block';
  } else {
    eventOverlay.style.display = 'none';
  }
}

export function showLiveEdgeOverlay(liveEdgeTime) {
  const liveEdgeOverlay = document.getElementById('liveEdgeOverlay');
  liveEdgeOverlay.textContent = `Live Edge Time: ${liveEdgeTime}`;
  liveEdgeOverlay.style.display = 'block';
}

export function showMediaTimeOverlay(mediaTime) {
  const mediaTimeOverlay = document.getElementById('mediaTimeOverlay');
  mediaTimeOverlay.textContent = `Media Time: ${mediaTime}`;
  mediaTimeOverlay.style.display = 'block';
}

function trackToString(track) {
  return JSON.stringify(track);
}

function compareTreeState(newState, oldState) {
  for (let key in newState) {
    if (!oldState[key] || trackToString(newState[key]) !== trackToString(oldState[key])) {
      return false;
    }
  }
  return true;
}

export function renderMetadataTree(tracks) {
  const metadataTree = document.getElementById('metadataTree');
  const newTreeState = {};

  const groupedTracks = tracks.reduce((acc, track) => {
    const type = track.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(track);
    return acc;
  }, {});

  Object.keys(groupedTracks).forEach(type => {
    newTreeState[type] = groupedTracks[type];
  });

  if (compareTreeState(newTreeState, previousTreeState)) {
    return;
  }

  previousTreeState = newTreeState;
  metadataTree.innerHTML = '';

  Object.keys(groupedTracks).forEach(type => {
    const typeHeader = document.createElement('h3');
    typeHeader.innerHTML = `<i class="fa-regular fa-square-caret-right"></i> ${type}`;
    typeHeader.className = 'tree-header';
    typeHeader.addEventListener('click', () => {
      const typeContent = typeHeader.nextElementSibling;
      typeContent.style.display = typeContent.style.display === 'none' ? 'block' : 'none';
      typeHeader.querySelector('i').classList.toggle('fa-square-caret-down');
      typeHeader.querySelector('i').classList.toggle('fa-square-caret-right');
    });
    metadataTree.appendChild(typeHeader);

    const typeContent = document.createElement('div');
    typeContent.style.display = 'none';

    groupedTracks[type].forEach(track => {
      const trackHeader = document.createElement('div');
      trackHeader.innerHTML = `<i class="fa-regular fa-square-caret-right"></i> Representation ID: ${track.id}`;
      trackHeader.className = 'track-header';
      trackHeader.addEventListener('click', () => {
        const trackContent = trackHeader.nextElementSibling;
        trackContent.style.display = trackContent.style.display === 'none' ? 'block' : 'none';
        trackHeader.querySelector('i').classList.toggle('fa-square-caret-down');
        trackHeader.querySelector('i').classList.toggle('fa-square-caret-right');
        
      });
      typeContent.appendChild(trackHeader);

      const trackContent = document.createElement('div');
      trackContent.className = 'track-content';
      trackContent.style.display = 'none';
      trackContent.innerHTML = `
        <div>Bitrate: ${track.bitrate}</div>
        <div>Width: ${track.width}</div>
        <div>Height: ${track.height}</div>
        <div>Frame Rate: ${track.frameRate}</div>
        <div>Audio Sampling Rate: ${track.audioSamplingRate}</div>
        <div>Segment Duration: ${track.segmentDuration}</div>
      `;
      typeContent.appendChild(trackContent);
    });

    metadataTree.appendChild(typeContent);
  });

  metadataTree.style.display = 'block';
}
