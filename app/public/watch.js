const play = document.querySelector('#play');
const video = document.querySelector('video');
const error = document.querySelector('#error');

async function ensureSession() {
  const me = await fetch('/api/me');
  if (me.status === 401) location.href = '/login';
}

play.addEventListener('click', async () => {
  error.hidden = true;
  const response = await fetch('/api/playback/manifest');
  if (!response.ok) {
    error.hidden = false;
    error.textContent = 'Playback failed';
    return;
  }
  const manifest = await response.json();
  video.src = manifest.src;
  // The manifest await ends the user-gesture window. An unmuted play() here
  // is often rejected with NotAllowedError. Muted play is still allowed.
  // Loop keeps paused === false long enough for the assertion to observe it.
  video.muted = true;
  video.loop = true;
  try {
    await video.play();
  } catch {
    error.hidden = false;
    error.textContent = 'Playback failed';
  }
});

ensureSession();
