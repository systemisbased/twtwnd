/*
 * CharacterSprites.js  -  loader + animator for the official Player / Guide artwork.
 *
 * Classic script (no modules, no build step):   <script src="js/CharacterSprites.js"></script>
 * Exposes:  window.CharacterSprites
 *
 * Asset paths are resolved relative to THIS file's URL, so it works at
 * https://user.github.io/<repo>/ as well as on localhost.  Override with
 * CharacterSprites.load({ manifestUrl: '...' }) if the folder layout differs.
 *
 * load() NEVER rejects: a missing manifest or image is recorded in sprites.missing and
 * replaced with an empty transparent frame (a console warning is logged) so the game keeps running.
 */
(function (global) {
  'use strict';

  // Resolve the directory this script lives in (captured at execution time).
  var SCRIPT_URL = (document.currentScript && document.currentScript.src) || '';
  var DEFAULT_MANIFEST = SCRIPT_URL
    ? new URL('../assets/sprites/manifest.json', SCRIPT_URL).href
    : 'assets/sprites/manifest.json';

  function emptyFrame() {
    var c = document.createElement('canvas'); c.width = c.height = 1;
    return { img: c, w: 1, h: 1, ax: 0, ay: 0, missing: true };
  }

  function loadImage(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }

  function Animator(sprites, set) {
    this.sprites = sprites; this.set = set;
    this.name = null; this.anim = null;
    this.t = 0; this.index = 0; this.done = false;
  }
  /** Start an animation. No-op if already playing it (unless opts.restart). */
  Animator.prototype.play = function (name, opts) {
    opts = opts || {};
    if (this.name === name && !opts.restart) return this;
    var a = this.set[name];
    if (!a) { console.warn('[CharacterSprites] unknown animation:', name); return this; }
    this.name = name; this.anim = a; this.t = 0; this.index = 0; this.done = false;
    return this;
  };
  Animator.prototype.update = function (dt) {     // dt in seconds
    var a = this.anim; if (!a || this.done) return;
    this.t += dt;
    var step = 1 / a.fps;
    while (this.t >= step) {
      this.t -= step;
      if (this.index < a.frames.length - 1) this.index++;
      else if (a.loop) this.index = 0;
      else { this.done = true; break; }           // one-shots (jump/hurt/death) hold their last frame
    }
  };
  Animator.prototype.frame = function () {
    return this.anim ? this.anim.frames[this.index] : null;
  };
  /** Draw with the frame's anchor (feet) at (x, y). flipX mirrors around the anchor. */
  Animator.prototype.draw = function (ctx, x, y, scale, flipX) {
    var f = this.frame(); if (f) this.sprites.drawFrame(ctx, f, x, y, scale, flipX);
  };

  function Sprites(manifest) {
    this.manifest = manifest; this.missing = [];
    this.player = {}; this.portraits = {}; this.fullBody = []; this.art = null; this.misc = {}; this.ui = {};
  }
  Sprites.prototype.drawFrame = function (ctx, f, x, y, scale, flipX) {
    scale = scale || 1;
    var prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;            // keep pixel art crisp (use integer scales)
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);
    ctx.drawImage(f.img, -f.ax * scale, -f.ay * scale, f.w * scale, f.h * scale);
    ctx.restore(); ctx.imageSmoothingEnabled = prev;
  };
  Sprites.prototype.createPlayerAnimator = function (startAnim) {
    return new Animator(this, this.player).play(startAnim || 'idle');
  };
  /** Guide portrait by expression name; falls back to 'normal' if the name is unknown OR its file failed to load. */
  Sprites.prototype.portrait = function (name) {
    var p = this.portraits[name];
    if (p && !p.missing) return p;
    return this.portraits.normal || emptyFrame();
  };
  Sprites.prototype.hasPortrait = function (name) { return !!this.portraits[name] && !this.portraits[name].missing; };
  Sprites.prototype.expressions = function () { return Object.keys(this.portraits); };

  /**
   * @param {{manifestUrl?: string}} [opts]
   * @returns {Promise<Sprites>}  always resolves
   */
  function load(opts) {
    opts = opts || {};
    var manifestUrl = opts.manifestUrl || DEFAULT_MANIFEST;
    var baseDir = new URL('../../', manifestUrl).href;   // manifest lives in <root>/assets/sprites/
    return fetch(manifestUrl).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(function (e) {
      console.warn('[CharacterSprites] manifest failed to load (' + manifestUrl + '):', e);
      return null;
    }).then(function (m) {
      if (!m) { var s = new Sprites({}); s.missing.push('manifest.json'); s.failed = true; return s; }
      var sprites = new Sprites(m), jobs = [];

      function fetchFrame(entry, assign) {
        var url = new URL(entry.file, baseDir).href;
        jobs.push(loadImage(url).then(function (img) {
          if (!img) {
            sprites.missing.push(entry.file);
            console.warn('[CharacterSprites] missing asset:', entry.file);
            assign(emptyFrame());
          } else {
            assign({ img: img, w: entry.w, h: entry.h, ax: entry.anchor ? entry.anchor.x : 0, ay: entry.anchor ? entry.anchor.y : 0 });
          }
        }));
      }

      Object.keys(m.player || {}).forEach(function (name) {
        var src = m.player[name];
        var a = { fps: src.fps, loop: src.loop, frames: new Array(src.frames.length) };
        sprites.player[name] = a;
        src.frames.forEach(function (e, i) { fetchFrame(e, function (f) { a.frames[i] = f; }); });
      });
      var g = m.guide || {};
      Object.keys(g.portraits || {}).forEach(function (n) { sprites.portraits[n] = emptyFrame(); fetchFrame(g.portraits[n], function (f) { sprites.portraits[n] = f; }); });
      (g.fullBody || []).forEach(function (e, i) { fetchFrame(e, function (f) { sprites.fullBody[i] = f; }); });
      if (g.art) fetchFrame(g.art, function (f) { sprites.art = f; });
      Object.keys(m.misc || {}).forEach(function (n) { sprites.misc[n] = emptyFrame(); fetchFrame(m.misc[n], function (f) { sprites.misc[n] = f; }); });
      Object.keys(m.ui || {}).forEach(function (n) { sprites.ui[n] = emptyFrame(); fetchFrame(m.ui[n], function (f) { sprites.ui[n] = f; }); });

      return Promise.all(jobs).then(function () { return sprites; });
    });
  }

  global.CharacterSprites = { load: load, Animator: Animator, DEFAULT_MANIFEST: DEFAULT_MANIFEST };
})(typeof window !== 'undefined' ? window : this);
