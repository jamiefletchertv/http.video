// Function to update the track table
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

// Function to update the event table
export function updateEventTable(events) {
  const eventTable = document.getElementById('eventTable');
  const eventTableBody = eventTable.querySelector('tbody');

  // Sort events in ascending order with new events listed first
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

// Function to highlight the active event
export function highlightActiveEvent(events) {
  const video = document.getElementById('video');
  const currentTime = video.currentTime;
  const eventTableBody = document.getElementById('eventTable').querySelector('tbody');

  Array.from(eventTableBody.rows).forEach((row, index) => {
    const event = events[index];
    if (event) {
      const startTime = new Date(event.start).getTime() / 1000;
      const endTime = new Date(event.end).getTime() / 1000;

      if (currentTime >= startTime && currentTime <= endTime) {
        row.classList.add('highlighted');
      } else {
        row.classList.remove('highlighted');
      }
    }
  });
}

// Function to show the active event overlay
export function showActiveEventOverlay(events) {
  const video = document.getElementById('video');
  const currentTime = video.currentTime;
  const eventOverlay = document.getElementById('eventOverlay');

  let activeEvent = null;
  events.forEach(event => {
    const startTime = new Date(event.start).getTime() / 1000;
    const endTime = new Date(event.end).getTime() / 1000;

    if (currentTime >= startTime && currentTime <= endTime) {
      activeEvent = event;
    }
  });

  if (activeEvent) {
    eventOverlay.textContent = `Active Event ID: ${activeEvent.id}`;
    eventOverlay.style.display = 'block';
  } else {
    eventOverlay.style.display = 'none';
  }
}
