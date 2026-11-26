// Alpine Courier — title and end screens, painted on the canvas.
// One clear job: the overlays the renderer does not own — the title card
// with the mission briefing, and the landed / crashed / complete cards.
// The renderer draws the world and instruments underneath them.
export function drawTitleScreen(ctx, w, h, time) {
  ctx.fillStyle = 'rgba(8, 12, 18, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffc93c';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('ALPINE COURIER', w / 2, h * 0.3);
  ctx.fillStyle = '#7ee7f0';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('— RING RUN —', w / 2, h * 0.3 + 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Fly the courier plane through all 8 glowing rings over the alpine valley,', w / 2, h * 0.46);
  ctx.fillText('then bring her home and land on the runway before the fuel runs out.', w / 2, h * 0.46 + 30);
  ctx.fillStyle = '#aeb9c4';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Arrow keys or WASD to fly · Shift / Ctrl for throttle · mouse steers too', w / 2, h * 0.58);
  ctx.fillText('P pause · R restart · M mute · each ring is worth 100, a clean landing 250', w / 2, h * 0.58 + 28);
  if (Math.sin(time * 3) > -0.2) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS ENTER TO TAKE OFF', w / 2, h * 0.72);
  }
  ctx.textAlign = 'left';
}

export function drawEndScreen(ctx, w, h, state, score, timeText, ringsPassed, ringCount) {
  ctx.fillStyle = 'rgba(8, 12, 18, 0.6)';
  ctx.fillRect(0, h * 0.18, w, h * 0.3);
  ctx.textAlign = 'center';
  const title =
    state === 'complete'
      ? 'MISSION COMPLETE'
      : state === 'landed'
        ? 'LANDED'
        : 'CRASHED';
  ctx.fillStyle = state === 'crashed' ? '#ff5a4e' : '#37e08a';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText(title, w / 2, h * 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(
    `Score ${score} · Rings ${ringsPassed}/${ringCount} · Time ${timeText}`,
    w / 2,
    h * 0.3 + 44,
  );
  ctx.fillStyle = '#aeb9c4';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Press R or Enter to fly again', w / 2, h * 0.3 + 80);
  ctx.textAlign = 'left';
}
