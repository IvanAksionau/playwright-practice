const form = document.querySelector('#create-form');
const tbody = document.querySelector('tbody');

document.querySelector('#new-item').addEventListener('click', () => {
  form.hidden = false;
});

async function loadItems() {
  const response = await fetch('/api/items');
  if (response.status === 401) {
    location.href = '/login';
    return;
  }
  const items = await response.json();
  tbody.replaceChildren();
  for (const item of items) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    // textContent, not innerHTML: the name is user input and comes back from the API.
    cell.textContent = item.name;
    row.append(cell);
    tbody.append(row);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = new FormData(form).get('name');
  // The button stays enabled while the request is in flight.
  // Two clicks therefore send two POSTs. The API test for idempotency keys
  // and the UI test that delays the route are the pair that describes this gap.
  const response = await fetch('/api/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  // Read the body even when you only check response.ok. Leaving it unread
  // keeps the keep-alive exchange open, so Playwright never emits
  // response.finished() and response.json() in the test waits until timeout.
  await response.json();
  if (!response.ok) return;
  form.reset();
  form.hidden = true;
  await loadItems();
});

loadItems();
