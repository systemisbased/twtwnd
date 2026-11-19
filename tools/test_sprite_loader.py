import threading, http.server, socketserver, functools, os, json, sys
from playwright.sync_api import sync_playwright

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Serve the project under a SUBPATH (/some-repo/) to mimic https://user.github.io/some-repo/
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split('?')[0]
        assert p.startswith('/some-repo/'), p
        return os.path.join(ROOT, p[len('/some-repo/'):])
    def log_message(self,*a): pass
srv = socketserver.TCPServer(('127.0.0.1',0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

PAGE = '''<!doctype html><meta charset=utf-8><body style="background:#222">
<canvas id=c width=400 height=200></canvas>
<script src="js/CharacterSprites.js"></script>'''
open(ROOT+'/_test.html','w').write(PAGE)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    logs=[]; pg.on('console', lambda m: logs.append(m.text)); pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)))
    pg.goto(f'http://127.0.0.1:{port}/some-repo/_test.html')
    res = pg.evaluate('''async () => {
      const s = await CharacterSprites.load();
      const out = {missing: s.missing, failed: !!s.failed};
      out.anims = Object.fromEntries(Object.entries(s.player).map(([k,a])=>[k,{n:a.frames.length,fps:a.fps,loop:a.loop,allReal:a.frames.every(f=>!f.missing && f.img.naturalWidth>1)}]));
      out.portraits = s.expressions();
      out.portraitsReal = s.expressions().every(n=>!s.portrait(n).missing);
      out.fallback = s.portrait('does_not_exist') === s.portraits.normal;
      out.fullBody = s.fullBody.length; out.art = !!s.art && !s.art.missing; out.misc = Object.keys(s.misc); out.ui = Object.keys(s.ui);
      // animator behaviour
      const an = s.createPlayerAnimator('idle'); const seq=[];
      for(let i=0;i<10;i++){ an.update(1/4); seq.push(an.index); }      // idle: 4 fps, 4 frames, loop
      out.idleLoop = seq;
      an.play('death'); const dseq=[]; for(let i=0;i<8;i++){ an.update(1/6); dseq.push(an.index); }
      out.deathOneShot = dseq; out.deathDone = an.done;                 // should hold on last frame (3)
      // draw to canvas and count non-transparent pixels => actually rendered
      const c = document.getElementById('c'), ctx = c.getContext('2d');
      const w = s.createPlayerAnimator('walk'); w.draw(ctx, 100, 150, 1, false); w.draw(ctx, 250, 150, 1, true);
      const d = ctx.getImageData(0,0,400,200).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++;
      out.drawnPixels = n;
      return out;
    }''')
    # Missing-asset path: delete one file, reload, confirm no throw & reported
    os.rename(ROOT+'/assets/sprites/guide/portraits/smug.png', ROOT+'/assets/sprites/guide/portraits/smug.png.bak')
    try:
        ctx2 = b.new_context(); pg2 = ctx2.new_page()      # fresh context => no cached smug.png
        pg2.goto(f'http://127.0.0.1:{port}/some-repo/_test.html')
        miss = pg2.evaluate('''async () => { const s = await CharacterSprites.load(); return {missing:s.missing, smugFallsBackToNormal: s.portrait('smug') === s.portraits.normal && !s.portrait('smug').missing, normalOk: !s.portrait('normal').missing}; }''')
    finally:
        os.rename(ROOT+'/assets/sprites/guide/portraits/smug.png.bak', ROOT+'/assets/sprites/guide/portraits/smug.png')
    # Missing manifest path
    pg.goto(f'http://127.0.0.1:{port}/some-repo/_test.html')
    nom = pg.evaluate('''async () => { const s = await CharacterSprites.load({manifestUrl: location.origin+'/some-repo/nope.json'}); return {failed:s.failed, missing:s.missing}; }''')
    b.close()
os.remove(ROOT+'/_test.html')
res['anims']={k:(v['n'],v['fps'],v['loop'],v['allReal']) for k,v in res['anims'].items()}
print(json.dumps(res)); print("MISSING-FILE TEST:", miss); print("MISSING-MANIFEST TEST:", nom)
print("console:", [l for l in logs if 'missing asset' not in l and 'manifest failed' not in l and 'Failed to load resource' not in l])
