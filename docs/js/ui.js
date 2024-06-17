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
  trackTable.style.display = '';
}

export function updateEventTable(events) {
  const eventTable = document.getElementById('eventTable');
  const eventTableBody = eventTable.querySelector('tbody');
  events.sort((a, b) => new Date(b.start) - new Date(a.start));

  eventTableBody.innerHTML = '';
  events.forEach(event => {
    const row = eventTableBody.insertRow();
    row.insertCell().textContent = event.id || 'n/a';
    row.insertCell().textContent = event.start || 'n/a';
    row.insertCell().textContent = event.end || 'n/a';
    row.insertCell().textContent = event.duration || 'n/a';
  });
  eventTable.style.display = events.length ? '' : 'none';
}

export function highlightActiveEvent(events) {
  const eventTableBody = document.getElementById('eventTable').querySelector('tbody');
  const currentTime = new Date().toISOString();

  Array.from(eventTableBody.rows).forEach(row => {
    const eventId = row.cells[0].textContent;
    const event = events.find(e => e.id === eventId);

    if (event && event.start <= currentTime && event.end >= currentTime) {
      row.classList.add('highlighted');
    } else {
      row.classList.remove('highlighted');
    }
  });
}

export function showActiveEventOverlay(events) {
  const overlay = document.getElementById('eventOverlay');
  const currentTime = new Date().toISOString();
  const activeEvent = events.find(event => event.start <= currentTime && event.end >= currentTime);

  if (activeEvent) {
    overlay.textContent = `Active Event ID: ${activeEvent.id}`;
    overlay.style.display = 'block';
  } else {
    overlay.style.display = 'none';
  }
}

export function showLiveEdgeOverlay(liveEdgeTime) {
  const overlay = document.getElementById('liveEdgeOverlay');
  overlay.textContent = `Live Edge Time: ${liveEdgeTime}`;
  overlay.style.display = 'block';
}