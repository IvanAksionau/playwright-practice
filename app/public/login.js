const form = document.querySelector('#login-form');
const error = document.querySelector('#error');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;
  const data = new FormData(form);
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: data.get('email'),
      password: data.get('password'),
    }),
  });
  // Consume the body before navigating. An unread keep-alive response never
  // finishes, and a later response.json() in Playwright waits forever.
  await response.json();
  if (!response.ok) {
    error.hidden = false;
    error.textContent = 'Wrong email or password';
    return;
  }
  location.href = '/items';
});
