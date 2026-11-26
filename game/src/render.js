// Alpine Courier — everything on screen.
// One clear job: take the plane, the world and the game state and paint one
// frame: sky, mountains, valley floor, lake, river, town, runway, rings,
// the aircraft in chase view, the cockpit frame and the lit instruments.
// No physics and no scoring here — only drawing.
import { CONFIG, LANDMARKS } from './config.js';
import { drawTitleScreen, drawEndScreen } from './title.js';

const TAU = Math.PI * 2;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function groundColor(h, water) {
  if (water) return '#2f7fc4';
  if (h > 300) return '#e8eef2'; // snow on the high peaks
  if (h > 160) return '#7d8a6a'; // rock and scree
  if (h > 60) return '#5d7a44'; // pine slopes
  return '#6f9a4e'; // valley grass
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 1280;
    this.h = 800;
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      this.clouds.push({
        x: (i * 317) % 900 - 450,
        y: 260 + ((i * 137) % 140),
        z: 400 + ((i * 613) % 2200),
        s: 60 + ((i * 53) % 90),
      });
    }
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = this.canvas.clientWidth || 1280;
    this.h = this.canvas.clientHeight || 800;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Project a world point into camera space. Returns null behind the camera.
  project(plane, x, y, z) {
    const dx = x - plane.x;
    const dz = z - plane.z;
    const sin = Math.sin(plane.heading);
    const cos = Math.cos(plane.heading);
    const forward = dx * sin + dz * cos;
    const right = dx * cos - dz * sin;
    if (forward < 8) return null;
    const focal = this.h * 0.9;
    const horizon = this.h * 0.42;
    return {
      x: this.w / 2 + (right * focal) / forward,
      y: horizon - (y - plane.y - 7) * (focal / forward),
      d: forward,
      scale: focal / forward,
    };
  }

  draw(state, plane, world, time) {
    const ctx = this.ctx;
    const { w, h } = this;
    const horizon = h * 0.42;
    // Sky.
    const sky = ctx.createLinearGradient(0, 0, 0, horizon + 40);
    sky.addColorStop(0, '#1d4e89');
    sky.addColorStop(0.55, '#5f9fd0');
    sky.addColorStop(1, '#cfe8f5');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 40);
    // Sun.
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.13, 34, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 243, 196, 0.35)';
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.13, 58, 0, TAU);
    ctx.fill();
    // Far mountain silhouettes, two ridges for depth.
    this.drawRidge(plane, '#8fa8c0', 0.55, 1500);
    this.drawRidge(plane, '#6d88a3', 0.8, 900);
    // Valley floor in perspective strips.
    this.drawGround(plane, world, horizon);
    // Clouds drift slowly with the plane.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const c of this.clouds) {
      const p = this.project(plane, c.x + plane.x * 0.2, c.y, plane.z + c.z);
      if (!p || p.d > 2400) continue;
      const r = Math.max(6, c.s * p.scale * 0.35);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.38, 0, 0, TAU);
      ctx.fill();
    }
    this.drawTown(plane, world);
    this.drawRunway(plane, world);
    this.drawRings(plane, world, time);
    this.drawPlane(plane, time);
    this.drawCockpit(state, plane, world, time);
    if (state.mode === 'title') drawTitleScreen(ctx, w, h, time);
    if (state.mode === 'landed' || state.mode === 'crashed' || state.mode === 'complete') {
      drawEndScreen(ctx, w, h, state.mode, state.score, state.timeText, world.ringsPassed(), CONFIG.ringCount);
    }
    if (state.mode === 'paused') {
      ctx.fillStyle = 'rgba(8, 12, 18, 0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', w / 2, h / 2);
      ctx.textAlign = 'left';
    }
  }

  drawRidge(plane, color, amp, baseZ) {
    const ctx = this.ctx;
    const { w, h } = this;
    const horizon = h * 0.42;
    // Jagged peaks from a hash of the screen column, so the ridge reads as
    // mountains, not smooth hills; the near ridge gets snow caps.
    const pts = [];
    for (let sx = 0; sx <= w; sx += 24) {
      const t = sx / w;
      const n1 = Math.abs(Math.sin(t * 31 + amp * 13)) * 95 * amp;
      const n2 = Math.abs(Math.sin(t * 67 + amp * 29)) * 45 * amp;
      const y = horizon - 30 * amp - n1 - n2 - Math.sin(plane.heading * 2 + t * 4) * 6;
      pts.push([sx, y]);
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (const [sx, y] of pts) ctx.lineTo(sx, y);
    ctx.lineTo(w, horizon);
    ctx.closePath();
    ctx.fill();
    if (amp > 0.7) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [sx, y] of pts) {
        if (y < horizon - 90) {
          ctx.beginPath();
          ctx.moveTo(sx - 14, y + 16);
          ctx.lineTo(sx, y);
          ctx.lineTo(sx + 14, y + 16);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  // World point at forward distance d and lateral offset lat from the plane.
  forwardPoint(plane, d, lat) {
    const sin = Math.sin(plane.heading);
    const cos = Math.cos(plane.heading);
    return {
      x: plane.x + sin * d + cos * lat,
      z: plane.z + cos * d - sin * lat,
    };
  }

  drawGround(plane, world, horizon) {
    const ctx = this.ctx;
    const { w, h } = this;
    // Fill below the horizon with grass first, then paint the strips over it.
    ctx.fillStyle = '#6f9a4e';
    ctx.fillRect(0, horizon, w, h - horizon);
    const step = 60;
    for (let d = CONFIG.viewDistance; d > 30; d -= step) {
      for (let lat = -440; lat < 440; lat += 55) {
        const a0 = this.forwardPoint(plane, d, lat);
        const a1 = this.forwardPoint(plane, d, lat + 55);
        const b0 = this.forwardPoint(plane, d + step, lat);
        const b1 = this.forwardPoint(plane, d + step, lat + 55);
        const p00 = this.project(plane, a0.x, world.groundHeight(a0.x, a0.z), a0.z);
        const p10 = this.project(plane, a1.x, world.groundHeight(a1.x, a1.z), a1.z);
        const p11 = this.project(plane, b1.x, world.groundHeight(b1.x, b1.z), b1.z);
        const p01 = this.project(plane, b0.x, world.groundHeight(b0.x, b0.z), b0.z);
        if (!p00 || !p10 || !p11 || !p01) continue;
        const mid = this.forwardPoint(plane, d + step / 2, lat + 27);
        const midH = world.groundHeight(mid.x, mid.z);
        const water = world.isWater(mid.x, mid.z);
        const fog = clamp((d - CONFIG.fogStart) / (CONFIG.fogEnd - CONFIG.fogStart), 0, 0.75);
        // Field patches: alternate greens and golds by a hash of the cell,
        // so the valley floor reads as farms and meadows, not one flat green.
        let color = groundColor(midH, water);
        if (!water && midH < 60) {
          const hash = Math.abs(Math.sin(mid.x * 0.11 + mid.z * 0.07) * 1000) % 1;
          if (hash < 0.18) color = '#8a9a3e';
          else if (hash < 0.32) color = '#c2a44e';
          else if (hash < 0.42) color = '#4e7a3e';
        }
        ctx.fillStyle = color;
        ctx.globalAlpha = 1 - fog * 0.8;
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.fill();
        // A pine tree on some low cells, drawn as a small dark triangle.
        if (!water && midH > 8 && midH < 120) {
          const hash = Math.abs(Math.sin(mid.x * 0.31 + mid.z * 0.17) * 1000) % 1;
          if (hash < 0.1 && p00.scale > 0.15) {
            const s = Math.max(2, p00.scale * 0.55);
            ctx.fillStyle = '#2e5230';
            ctx.beginPath();
            ctx.moveTo(p00.x, p00.y - s * 2);
            ctx.lineTo(p00.x - s * 0.7, p00.y);
            ctx.lineTo(p00.x + s * 0.7, p00.y);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    // River: a bright band down the valley floor at world x = 40.
    ctx.strokeStyle = '#3f8fd2';
    ctx.lineWidth = 5;
    ctx.beginPath();
    let started = false;
    for (let z = plane.z - 2200; z < plane.z + 2200; z += 80) {
      const p = this.project(plane, 40, 3.5, z);
      if (!p) continue;
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  drawTown(plane, world) {
    const ctx = this.ctx;
    const town = LANDMARKS.town;
    for (let i = 0; i < town.houses; i++) {
      const hx = town.x + ((i * 37) % 160) - 80;
      const hz = town.z + ((i * 91) % 260) - 130;
      const base = this.project(plane, hx, world.groundHeight(hx, hz), hz);
      if (!base) continue;
      const s = Math.max(1.5, base.scale * 0.09);
      ctx.fillStyle = '#e8e2d2';
      ctx.fillRect(base.x - s, base.y - s * 1.6, s * 2, s * 1.6);
      ctx.fillStyle = '#b4432f';
      ctx.beginPath();
      ctx.moveTo(base.x - s * 1.15, base.y - s * 1.6);
      ctx.lineTo(base.x, base.y - s * 2.6);
      ctx.lineTo(base.x + s * 1.15, base.y - s * 1.6);
      ctx.closePath();
      ctx.fill();
    }
    // The lighthouse: white tower, red top, on its hill.
    const lp = this.project(plane, LANDMARKS.lighthouse.x, world.groundHeight(LANDMARKS.lighthouse.x, LANDMARKS.lighthouse.z), LANDMARKS.lighthouse.z);
    if (lp) {
      const s = Math.max(2, lp.scale * 0.12);
      ctx.fillStyle = '#f4f1e8';
      ctx.fillRect(lp.x - s * 0.5, lp.y - s * 3.4, s, s * 3.4);
      ctx.fillStyle = '#c23b2e';
      ctx.fillRect(lp.x - s * 0.6, lp.y - s * 4.1, s * 1.2, s * 0.7);
    }
  }

  drawRunway(plane, world) {
    const ctx = this.ctx;
    const rw = world.runway;
    const hw = rw.width / 2;
    const zA = rw.z - rw.length / 2;
    const zB = rw.z + rw.length / 2;
    const corners = [
      this.project(plane, -hw, 4.2, zA),
      this.project(plane, hw, 4.2, zA),
      this.project(plane, hw, 4.2, zB),
      this.project(plane, -hw, 4.2, zB),
    ];
    if (corners.some((c) => !c)) return;
    ctx.fillStyle = '#3a3f45';
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (const c of corners.slice(1)) ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.fill();
    // Centreline dashes and threshold lights.
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let z = zA + 20; z < zB - 10; z += 60) {
      const a = this.project(plane, 0, 4.4, z);
      const b = this.project(plane, 0, 4.4, z + 30);
      if (a && b) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
    }
    ctx.stroke();
    ctx.fillStyle = '#37e08a';
    for (const sx of [-hw, hw]) {
      const p = this.project(plane, sx, 4.4, zB);
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, TAU);
        ctx.fill();
      }
    }
  }

  drawRings(plane, world, time) {
    const ctx = this.ctx;
    const next = world.nextRing();
    const sorted = [...world.rings].sort((a, b) => {
      const da = Math.abs(a.z - plane.z);
      const db = Math.abs(b.z - plane.z);
      return db - da;
    });
    for (const ring of sorted) {
      if (ring.passed) continue;
      const p = this.project(plane, ring.x, ring.y, ring.z);
      if (!p) continue;
      const r = Math.max(3, CONFIG.ringRadius * p.scale);
      const isNext = next && ring.index === next.index;
      const pulse = isNext ? 0.75 + Math.sin(time * 5) * 0.25 : 0.5;
      ctx.save();
      ctx.globalAlpha = clamp(pulse, 0.25, 1);
      ctx.strokeStyle = isNext ? '#ffc93c' : '#37d6e0';
      ctx.lineWidth = Math.max(2, r * 0.14);
      ctx.shadowColor = isNext ? '#ffc93c' : '#37d6e0';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.92, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      if (isNext) {
        ctx.fillStyle = '#ffc93c';
        ctx.font = `bold ${Math.max(13, Math.min(22, r * 0.28))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${ring.index + 1} · ${ring.name}`, p.x, p.y - r - 12);
        const dist = Math.max(0, Math.round(Math.abs(ring.z - plane.z)));
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText(`${dist} m`, p.x, p.y + r + 22);
      }
    }
  }

  drawPlane(plane, time) {
    const ctx = this.ctx;
    const { w, h } = this;
    const cx = w / 2;
    const cy = h * 0.72;
    const size = Math.min(w, h) * 0.16;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-plane.bank * 0.9);
    // Propeller disc, spinning.
    const propA = time * 40;
    ctx.fillStyle = 'rgba(200,210,220,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.42, size * 0.16, size * 0.52, propA % Math.PI, 0, TAU);
    ctx.fill();
    // Wings.
    ctx.fillStyle = '#d8433a';
    ctx.beginPath();
    ctx.moveTo(-size * 1.15, -size * 0.1);
    ctx.lineTo(-size * 0.28, -size * 0.28);
    ctx.lineTo(-size * 0.28, size * 0.05);
    ctx.lineTo(-size * 1.15, size * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 1.15, -size * 0.1);
    ctx.lineTo(size * 0.28, -size * 0.28);
    ctx.lineTo(size * 0.28, size * 0.05);
    ctx.lineTo(size * 1.15, size * 0.12);
    ctx.closePath();
    ctx.fill();
    // Tail.
    ctx.fillStyle = '#b3322a';
    ctx.fillRect(-size * 0.42, size * 0.28, size * 0.84, size * 0.14);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.28);
    ctx.lineTo(-size * 0.1, size * 0.52);
    ctx.lineTo(size * 0.1, size * 0.52);
    ctx.closePath();
    ctx.fill();
    // Fuselage, seen from behind.
    const body = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
    body.addColorStop(0, '#f2f2f2');
    body.addColorStop(0.5, '#e8b23a');
    body.addColorStop(1, '#c98a1d');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.3, size * 0.52, 0, 0, TAU);
    ctx.fill();
    // Canopy and tail number.
    ctx.fillStyle = '#20344a';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.18, size * 0.2, size * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(size * 0.14)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('AC-7', 0, size * 0.28);
    // Navigation lights, blinking.
    const blink = Math.sin(time * 6) > 0;
    if (blink) {
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(-size * 1.12, 0, 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#34e07a';
      ctx.beginPath();
      ctx.arc(size * 1.12, 0, 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawCockpit(state, plane, world, time) {
    const ctx = this.ctx;
    const { w, h } = this;
    // Dark cockpit frame at the top and sides.
    ctx.fillStyle = 'rgba(12,16,22,0.92)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.16, 0);
    ctx.lineTo(w * 0.1, h * 0.1);
    ctx.lineTo(0, h * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w * 0.84, 0);
    ctx.lineTo(w * 0.9, h * 0.1);
    ctx.lineTo(w, h * 0.16);
    ctx.closePath();
    ctx.fill();
    // Top HUD strip: altitude, speed, heading — big and lit.
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    ctx.fillRect(w * 0.3, 10, w * 0.4, 58);
    ctx.strokeStyle = '#37d6e0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w * 0.3, 10, w * 0.4, 58);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ee7f0';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('ALT', w * 0.38, 28);
    ctx.fillText('SPD', w * 0.5, 28);
    ctx.fillText('HDG', w * 0.62, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, monospace';
    ctx.fillText(`${plane.altitudeFt} ft`, w * 0.38, 56);
    ctx.fillText(`${plane.speedKts} kt`, w * 0.5, 56);
    ctx.fillText(`${String(plane.headingDeg).padStart(3, '0')}°`, w * 0.62, 56);
    // Mission line under the HUD.
    const next = world.nextRing();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    const mission = next
      ? `RING ${world.ringsPassed() + 1}/${CONFIG.ringCount} — ${next.name}`
      : 'ALL RINGS DONE — LAND ON THE RUNWAY';
    ctx.fillText(mission, w / 2, 92);
    // Fuel warning.
    if (plane.fuel < 25) {
      ctx.fillStyle = Math.sin(time * 8) > 0 ? '#ff5a4e' : '#ffb020';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(`LOW FUEL ${Math.round(plane.fuel)}%`, w / 2, 118);
    }
    // Bottom instrument panel.
    const panelY = h - 132;
    ctx.fillStyle = 'rgba(10,14,20,0.88)';
    ctx.fillRect(0, panelY, w, 132);
    ctx.strokeStyle = '#2c3a48';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, panelY);
    ctx.lineTo(w, panelY);
    ctx.stroke();
    this.drawAttitude(plane, w * 0.14, panelY + 66, 52);
    this.drawDial(w * 0.30, panelY + 66, 52, 'ALT', plane.altitudeFt, 0, 3000, '#7ee7f0');
    this.drawDial(w * 0.44, panelY + 66, 52, 'SPD', plane.speedKts, 0, 200, '#ffc93c');
    this.drawCompass(plane, w * 0.58, panelY + 66);
    // Throttle and fuel bars.
    this.drawBar(w * 0.74, panelY + 30, 150, 14, plane.throttle, 'THROTTLE', '#37e08a');
    this.drawBar(w * 0.74, panelY + 66, 150, 14, plane.fuel / 100, 'FUEL', plane.fuel < 25 ? '#ff5a4e' : '#37a8e0');
    this.drawBar(w * 0.74, panelY + 102, 150, 14, 1 - plane.damage / 100, 'HULL', '#e07a37');
    // Score block, right side.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7ee7f0';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('SCORE', w - 24, panelY + 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px system-ui, monospace';
    ctx.fillText(String(state.score), w - 24, panelY + 62);
    ctx.fillStyle = '#aeb9c4';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`TIME ${state.timeText}`, w - 24, panelY + 88);
    ctx.fillText(`RINGS ${world.ringsPassed()}/${CONFIG.ringCount}`, w - 24, panelY + 110);
    ctx.textAlign = 'left';
    // Centre message for state changes (not over the end screen, which
    // already states the result).
    if (state.message && state.mode !== 'landed' && state.mode !== 'crashed' && state.mode !== 'complete') {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,14,20,0.78)';
      const mw = ctx.measureText(state.message).width + 48;
      ctx.fillRect(w / 2 - mw / 2, h * 0.3, mw, 52);
      ctx.fillStyle = '#ffc93c';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText(state.message, w / 2, h * 0.3 + 35);
      ctx.textAlign = 'left';
    }
  }

  drawAttitude(plane, cx, cy, r) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#3f8fd2';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(cx - r, cy, r * 2, r * 2);
    ctx.translate(cx, cy);
    ctx.rotate(-plane.bank);
    ctx.translate(0, clamp(plane.pitch * 120, -r, r));
    ctx.fillStyle = '#3f8fd2';
    ctx.fillRect(-r, -r, r * 2, r);
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-r, 0, r * 2, r);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#37d6e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy);
    ctx.lineTo(cx + 14, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7ee7f0';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ATT', cx, cy + r + 14);
    ctx.textAlign = 'left';
  }

  drawDial(cx, cy, r, label, value, min, max, color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0e141b';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    const frac = clamp((value - min) / (max - min), 0, 1);
    const ang = -Math.PI * 0.75 + frac * Math.PI * 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * (r - 8), cy + Math.sin(ang) * (r - 8));
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(value), cx, cy + 6);
    ctx.fillStyle = color;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText(label, cx, cy + r + 14);
    ctx.textAlign = 'left';
  }

  drawCompass(plane, cx, cy) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0e141b';
    ctx.fillRect(cx - 62, cy - 26, 124, 52);
    ctx.strokeStyle = '#37d6e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 62, cy - 26, 124, 52);
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let i = -1; i <= 1; i++) {
      const deg = Math.round((plane.headingDeg + i * 45) / 45) * 45;
      const label = dirs[((deg / 45) % 8 + 8) % 8];
      ctx.fillText(label, cx + i * 44, cy + 5);
    }
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 26);
    ctx.lineTo(cx + 6, cy - 26);
    ctx.lineTo(cx, cy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7ee7f0';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('HDG', cx, cy + 42);
    ctx.textAlign = 'left';
  }

  drawBar(x, y, wdt, hgt, frac, label, color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0e141b';
    ctx.fillRect(x, y, wdt, hgt);
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y + 2, (wdt - 4) * clamp(frac, 0, 1), hgt - 4);
    ctx.strokeStyle = '#2c3a48';
    ctx.strokeRect(x, y, wdt, hgt);
    ctx.fillStyle = '#aeb9c4';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 6);
  }
}
