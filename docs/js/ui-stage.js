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
  events.sort((a, b) => new Date(b.start) - new Date(a.start));
  events.forEach(event => {
    const row = eventTableBody.insertRow();
    row.insertCell().textContent = event.id || 'n/a';
    row.insertCell().textContent = event.start || 'n/a';
    row.insertCell().textContent = event.end || 'n/a';
    row.insertCell().textContent = event.duration || 'n/a';
  });
}

export function highlightActiveEvent(events) {
  const now = new Date().toISOString();
  const eventTable = document.getElementById('eventTable');
  const eventTableBody = eventTable.querySelector('tbody');

  Array.from(eventTableBody.rows).forEach(row => {
    const start = row.cells[1].textContent;
    const end = row.cells[2].textContent;
    if (now >= start && now <= end) {
      row.classList.add('highlighted');
    } else {
      row.classList.remove('highlighted');
    }
  });
}

export function showActiveEventOverlay(events) {
  const now = new Date().toISOString();
  const eventOverlay = document.getElementById('eventOverlay');

  const activeEvent = events.find(event => now >= event.start && now <= event.end);
  if (activeEvent) {
    eventOverlay.textContent = `Active Event: ${activeEvent.id}`;
    eventOverlay.style.display = 'block';
  } else {
    eventOverlay.style.display = 'none';
  }
}

export function showLiveEdgeOverlay(liveEdgeTime) {
  const liveEdgeOverlay = document.getElementById('liveEdgeOverlay');
  let liveEdgeInfo = `Live Edge Time: ${liveEdgeTime}`;
  liveEdgeOverlay.textContent = liveEdgeInfo.trim();
}
