// The Phaser scene for Bernardo's baptism platformer. Kept as a factory so the
// React component can inject its state bridge (HUD setters, control state,
// church-entry callback) without the scene needing to know about React.
import {
  T,
  SRC_TILE,
  WORLD_W,
  WORLD_H,
  DESIGN_H,
  F,
  BALL_SIZE,
  BALL_TEX,
  BALL_REST_Y,
  PAD_H,
  OSCAR_BASE_SCALE,
  OSCAR_MAX_SCALE,
  OSCAR_FULL_AT_BONES,
  type Control,
} from "@/lib/gameConstants";
import { generateTextures } from "@/components/game/textures";
import { LEVELS, DEFAULT_LEVEL_ID } from "@/lib/levels/level01";
import { boneDay, dailyBones } from "@/lib/dailyBones";
import type { Level } from "@/lib/levels/types";
import type { Lang } from "@/lib/i18n";

export type SceneDeps = {
  control: Control;
  setBlessings: (n: number) => void;
  setCoins: (updater: (c: number) => number) => void;
  setReady: (ready: boolean) => void;
  onEnterRef: { current: () => void };
  levelId?: string;
  lang?: Lang;
  /**
   * The day whose bone layout to build, `YYYY-MM-DD`. Passed in rather than
   * read here so the scene and the reporter can never disagree about which
   * day's bones are on screen.
   */
  day?: string;
  /**
   * Called with the index of every daily bone picked up. Bones popped out of a
   * "?" block are bonus treats that belong to no day and are not reported.
   */
  onBoneRef?: { current: (boneIndex: number) => void };
};

// The pixel-game look without the eye strain: Pixelify Sans has real lowercase
// shapes, so in-world text stays readable at these small canvas sizes.
const GAME_FONT = '"Pixelify Sans", "Trebuchet MS", sans-serif';

// In-world copy. Kept beside the scene because Phaser text can't use the React
// i18n hook, but it follows the same Danish-default / opt-in rule.
const SCENE_TEXT = {
  da: {
    collect: "Saml 3 velsignelser!",
    churchOpen: "Kirken er åben — gå ind!",
    bernardo: "Hej! Jeg er\nBernardo",
    oscar: "Og jeg er\nOscar!",
  },
  en: {
    collect: "Collect 3 blessings!",
    churchOpen: "The church is open — go in!",
    bernardo: "Hi! I'm\nBernardo",
    oscar: "And I'm\nOscar!",
  },
  pt: {
    collect: "Colete 3 bênçãos!",
    churchOpen: "A igreja está aberta — entre!",
    bernardo: "Oi! Eu sou o\nBernardo",
    oscar: "E eu sou o\nOscar!",
  },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMainScene(Phaser: any, deps: SceneDeps) {
  const { control, setBlessings, setCoins, setReady, onEnterRef } = deps;
  const TXT = SCENE_TEXT[deps.lang && SCENE_TEXT[deps.lang] ? deps.lang : "da"];
  const level: Level = LEVELS[deps.levelId ?? DEFAULT_LEVEL_ID] ?? LEVELS[DEFAULT_LEVEL_ID];
  // Oscar is fed every day, so today's treats are laid out fresh rather than
  // baked into the level. Same date, same layout, for everybody.
  const day = deps.day ?? boneDay();
  const todaysBones = dailyBones(day, level.id);

  return class MainScene extends Phaser.Scene {
        player!: any;
        solids!: any;
        crosses!: any;
        coinGroup!: any;
        blocks!: any;
        movers!: any;
        balls!: any;
        pads!: any;
        padHit: any = null;
        launching = false;
        bubbles: any[] = [];
        introShown = false;
        doorZone!: any;
        churchCross!: any;
        churchGlow!: any;
        door!: any;
        cursors!: any;
        keys!: any;
        churchUnlocked = false;
        entered = false;
        jumpLatch = false;
        spawnX = 0;
        spawnY = 0;
        hint!: any;
        oscar!: any;
        oscarGroundY = 0;
        oscarBaseY = 0;
        oscarScale = OSCAR_BASE_SCALE;
        bonesCollected = 0;
        oscarJumpOffset = 0;
        oscarPrevJumpOffset = 0;
        oscarHopping = false;
        // idle "personality" state: which little trick he's performing, and when
        // the next one is due while Bernardo stands still
        oscarTrick: string | null = null;
        oscarTrickUntil = 0;
        oscarNextTrick = 0;
        wasOnFloor = false;
        stepTimer = 0;
        fellToHell = false;
        // Per-tile-column list of solid surface tops, used to plant Oscar on the
        // terrain under *his* feet instead of copying Bernardo's height.
        surfaceTops: number[][] = [];

        constructor() {
          super("main");
        }

        preload() {
          this.load.spritesheet("tiles", "/assets/game/tiles.png", {
            frameWidth: SRC_TILE,
            frameHeight: SRC_TILE,
          });
          this.load.spritesheet("bernardo", "/assets/game/bernardo.png", {
            frameWidth: 56,
            frameHeight: 60,
          });
          this.load.spritesheet("oscar", "/assets/game/oscar.png", {
            frameWidth: 64,
            frameHeight: 52,
          });
          this.load.spritesheet("flags", "/assets/game/flags.png", {
            frameWidth: 83,
            frameHeight: 202,
          });
          this.load.image("church_pixel", "/assets/game/church_pixel.png");
          this.load.image("hospital", "/assets/game/hospital.png");
        }

        // ---- generated background + fx textures ----
        makeBackdrop() {
          generateTextures(this, Phaser);
        }

        addTile(tx: number, ty: number, frame: number, depth = 0) {
          const img = this.add
            .image(tx * T + T / 2, ty * T + T / 2, "tiles", frame)
            .setDisplaySize(T, T)
            .setDepth(depth);
          return img;
        }

        addSolidTex(tx: number, ty: number, key: string) {
          const t = this.solids.create(tx * T + T / 2, ty * T + T / 2, key);
          t.setDisplaySize(T, T);
          t.refreshBody();
          return t;
        }

        // Static terrain used to be one image per tile — ~280 sprites, each its
        // own draw call. The collision bodies still need to be per-tile, but the
        // pixels don't: one repeating TileSprite per run of tiles paints the
        // same thing in a single call, so the bodies are created invisible.
        addSolidRun(from: number, to: number, row: number, key: string) {
          const w = (to - from + 1) * T;
          this.add
            .tileSprite(from * T, row * T, w, T, key)
            .setOrigin(0, 0)
            .setDepth(0);
          for (let x = from; x <= to; x++) {
            this.addSolidTex(x, row, key).setVisible(false);
          }
        }

        buildGround(from: number, to: number) {
          this.addSolidRun(from, to, 8, "groundTop");
          this.addSolidRun(from, to, 9, "groundBody");
        }

        buildPlatform(from: number, to: number, row: number) {
          this.addSolidRun(from, to, row, "groundTop");
        }

        addCross(tx: number, ty: number) {
          const x = tx * T + T / 2;
          const y = ty * T + T / 2;
          const glow = this.add.image(x, y, "glow").setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: glow,
            alpha: { from: 0.5, to: 1 },
            scale: { from: 0.9, to: 1.3 },
            yoyo: true,
            repeat: -1,
            duration: 900,
            ease: "Sine.inOut",
          });
          const c = this.crosses.create(x, y, "cross");
          c.setDepth(2);
          c.body.setAllowGravity(false);
          c.setData("glow", glow);
          this.tweens.add({
            targets: [c, glow],
            y: y - 10,
            yoyo: true,
            repeat: -1,
            duration: 1100,
            ease: "Sine.inOut",
          });
          this.tweens.add({
            targets: c,
            angle: { from: -6, to: 6 },
            yoyo: true,
            repeat: -1,
            duration: 1400,
            ease: "Sine.inOut",
          });
        }

        addCoin(tx: number, ty: number, boneIndex = -1) {
          const c = this.coinGroup.create(tx * T + T / 2, ty * T + T / 2, "treat");
          c.setDepth(1);
          c.setScale(0.9);
          c.setData("boneIndex", boneIndex);
          c.body.setAllowGravity(false);
          this.tweens.add({
            targets: c,
            angle: { from: -12, to: 12 },
            yoyo: true,
            repeat: -1,
            duration: 900,
            ease: "Sine.inOut",
          });
          this.tweens.add({
            targets: c,
            y: c.y - 6,
            yoyo: true,
            repeat: -1,
            duration: 800,
            ease: "Sine.inOut",
          });
        }

        addSign(tx: number, label: string, bg: number, fg: number) {
          const x = tx * T + T / 2;
          const postTop = 6 * T + 6;
          this.add.rectangle(x, 7 * T, 6, 2 * T, 0x8a5a2b).setDepth(-2);
          const board = this.add.rectangle(x, postTop, T * 1.7, T * 0.9, bg)
            .setStrokeStyle(3, 0x5a3a1b).setDepth(-2);
          this.add.text(x, postTop, label, {
            fontFamily: GAME_FONT,
            fontSize: "12px",
            color: Phaser.Display.Color.ValueToColor(fg).rgba,
            align: "center",
            lineSpacing: 4,
          }).setOrigin(0.5).setDepth(-1);
          return board;
        }

        // A shallow Skagen sand hole: a one-tile-deep pit with a sandy floor the
        // player can drop into and hop back out of.
        addSandPit(a: number, b: number) {
          const w = (b - a + 1) * T;
          // sandy back wall (visual, recessed)
          this.add
            .tileSprite(a * T, 8 * T, w, T, "sand")
            .setOrigin(0, 0)
            .setDepth(-3)
            .setTint(0xcdb684);
          // solid sand floor at the bottom row
          this.add
            .tileSprite(a * T, 9 * T, w, T, "sand")
            .setOrigin(0, 0)
            .setDepth(0);
          for (let x = a; x <= b; x++) {
            const floor = this.solids.create(x * T + T / 2, 9 * T + T / 2, "sand");
            floor.setDisplaySize(T, T);
            floor.setVisible(false);
            floor.refreshBody();
          }
          // beach-grass tufts on the rim
          this.addTile(a, 8, F.grassTuft, -2);
          this.addTile(b, 8, F.grassTuft, -2);
        }

        // A "?" bonus block: solid, and pops a treat when bumped from below.
        addBlock(def: { tx: number; ty: number; reward: string }) {
          const blk = this.blocks.create(
            def.tx * T + T / 2,
            def.ty * T + T / 2,
            "qblock"
          );
          blk.setDisplaySize(T, T);
          blk.refreshBody();
          blk.setDepth(1);
          blk.setData("used", false);
          this.tweens.add({
            targets: blk,
            y: blk.y - 3,
            yoyo: true,
            repeat: -1,
            duration: 1400,
            ease: "Sine.inOut",
          });
        }

        bumpBlock(blk: any) {
          if (blk.getData("used")) return;
          const pb = this.player.body as any;
          if (!(pb.blocked.up || pb.touching.up)) return; // only from below
          blk.setData("used", true);
          this.tweens.killTweensOf(blk);
          blk.setTexture("qblockUsed");
          blk.setDisplaySize(T, T);
          const oy = blk.y;
          this.tweens.add({
            targets: blk,
            y: oy - 9,
            yoyo: true,
            duration: 110,
            ease: "Quad.out",
            onComplete: () => {
              blk.y = oy;
              blk.refreshBody();
            },
          });
          // a treat pops out of the block and is collected
          const bone = this.add.image(blk.x, oy - 8, "treat").setDepth(3).setScale(0.9);
          this.tweens.add({
            targets: bone,
            y: oy - 54,
            duration: 260,
            ease: "Quad.out",
            onComplete: () => {
              this.tweens.add({
                targets: bone,
                y: oy - 42,
                alpha: 0,
                duration: 220,
                onComplete: () => bone.destroy(),
              });
            },
          });
          this.collectFx(blk.x, oy - 22, 0xf3e9c9, 6);
          this.gainBone();
        }

        // A drifting platform that oscillates from its start and carries riders.
        addMover(p: { x0: number; x1: number; row: number; move?: any }) {
          const w = (p.x1 - p.x0 + 1) * T;
          const startX = p.x0 * T + w / 2;
          const startY = p.row * T + T / 2;
          const m = this.movers.create(startX, startY, "floatPlatform");
          m.setDisplaySize(w, T * 0.7);
          m.body.setSize(w, T * 0.7);
          m.setDepth(1);
          m.body.setAllowGravity(false);
          m.setImmovable(true);
          const dx = p.move.dx || 0;
          const dy = p.move.dy || 0;
          const secs = p.move.dur / 1000;
          const vx = dx ? (dx * T) / secs : 0;
          const vy = dy ? (dy * T) / secs : 0;
          m.setData("minX", Math.min(startX, startX + dx * T));
          m.setData("maxX", Math.max(startX, startX + dx * T));
          m.setData("minY", Math.min(startY, startY + dy * T));
          m.setData("maxY", Math.max(startY, startY + dy * T));
          m.setData("vx", vx);
          m.setData("vy", vy);
          m.body.setVelocity(vx, vy);
        }

        // Every treat goes to Oscar, and a well-fed dog is a bigger dog: he grows
        // steadily (and visibly) the more bones the player collects.
        gainBone() {
          this.bonesCollected += 1;
          setCoins((c) => c + 1);
          const target = Phaser.Math.Linear(
            OSCAR_BASE_SCALE,
            OSCAR_MAX_SCALE,
            Math.min(this.bonesCollected / OSCAR_FULL_AT_BONES, 1)
          );
          if (Math.abs(target - this.oscarScale) < 0.001) return;
          this.oscarScale = target;
          if (!this.oscar) return;
          this.tweens.add({
            targets: this.oscar,
            scaleX: target,
            scaleY: target,
            duration: 260,
            ease: "Back.out",
          });
        }

        // Home base = Denmark = Heaven: a glowing halo + cloud where Bernardo
        // is reborn each time he falls.
        // Falling isn't just a reset — Bernardo tumbles to Buenos Aires (hell)
        // and is lifted back up to Heaven (Denmark, the start).
        respawn() {
          if (this.fellToHell) return;
          this.fellToHell = true;
          const cam = this.cameras.main;
          const body = this.player.body as any;

          cam.flash(220, 180, 210, 255);
          this.collectFx(this.player.x, this.player.y, 0xfff2a8, 10);

          this.time.delayedCall(120, () => {
            this.player.setPosition(this.spawnX, this.spawnY);
            body.setVelocity(0, 0);
            this.collectFx(this.spawnX, this.spawnY - 10, 0xfff2a8, 12);
          });
          this.time.delayedCall(900, () => {
            this.fellToHell = false;
          });
        }

        buildChurch(cx: number) {
          // ---- The finish line: a real Danish pixel-art cathedral resting on the grass ----
          const GROUND_Y = 8 * T; // 384 — top of the grass row
          const dispH = 342;
          const scale = dispH / 951; // source church is 855×951
          const dispW = 855 * scale;
          const doorX = cx * T + T / 2; // doorway aligns to tile `cx`
          // the sprite's door sits at x-fraction 0.206, so shift the sprite so
          // that doorway lands exactly on doorX
          const churchX = doorX + (0.5 - 0.206) * dispW;

          this.add
            .image(churchX, GROUND_Y, "church_pixel")
            .setOrigin(0.5, 1)
            .setDisplaySize(dispW, dispH)
            .setDepth(0);

          // warm light spilling from the doorway (lights up once unlocked)
          this.door = this.add
            .rectangle(doorX, GROUND_Y - 26, T * 0.7, T * 1.25, 0xffe9a8, 0)
            .setDepth(1);

          // unlock indicator: golden glow + cross over the steeple's stone cross
          const crossX = churchX + (0.274 - 0.5) * dispW; // sprite cross x-fraction
          const crossY = GROUND_Y - dispH; // the cross tip is at the top of the sprite
          this.churchGlow = this.add
            .image(crossX, crossY + 12, "glow")
            .setBlendMode(Phaser.BlendModes.ADD)
            .setAlpha(0)
            .setDepth(1)
            .setScale(1.5);
          this.churchCross = this.add
            .image(crossX, crossY + 8, "cross")
            .setDepth(1)
            .setScale(0.7)
            .setTint(0xffe08a)
            .setAlpha(0);

          // overlap zone at the doorway
          this.doorZone = this.add.zone(doorX, 7 * T + T / 2, T * 0.9, T * 1.8);
          this.physics.add.existing(this.doorZone, true);
        }

        // Data-driven level construction. Consumes a declarative Level (see
        // lib/levels/types.ts) so new stages are authored as data, not code.
        buildLevel(lvl: Level) {
          // background scenery first (behind terrain)
          this.buildLandmarks(lvl);

          // terrain
          lvl.ground.forEach(([from, to]) => this.buildGround(from, to));
          lvl.platforms.forEach((p) => {
            if (p.move) this.addMover(p);
            else this.buildPlatform(p.x0, p.x1, p.row);
          });
          (lvl.blocks ?? []).forEach((b) => this.addBlock(b));

          // decorations (bushes, mushrooms, rocks, tufts, cactus)
          lvl.decor.forEach(([x, y, f]) => this.addTile(x, y, f, -2));

          // foreground trees on the grass
          lvl.trees.forEach((tx) => {
            this.add
              .image(tx * T + T / 2, 8 * T + 4, "tree")
              .setOrigin(0.5, 1)
              .setDepth(-2)
              .setScale(0.7);
          });

          // flowers sprinkled on the grass (tint randomised per instance)
          const flowerTints = [0xffffff, 0xf7a9c4, 0xf6c1de, 0xfff0a0];
          lvl.flowers.forEach((tx) => {
            this.add
              .image(tx * T + Phaser.Math.Between(-8, 8) + T / 2, 8 * T - 2, "flower")
              .setDepth(-1)
              .setScale(Phaser.Math.FloatBetween(0.7, 1.05))
              .setTint(Phaser.Utils.Array.GetRandom(flowerTints));
          });

          // story signboards
          lvl.signs.forEach((s) => this.addSign(s.tile, s.label, s.bg, s.fg));

          // Bernardo's four flags, cycled along the road in the order they tell
          // his story: Denmark, Brazil, Pernambuco, and the Straw Hats last.
          // They fly in front of the scenery (depth 3) so no building can ever
          // swallow a pole, and the poles are planted right in the grass.
          lvl.flags.forEach((tx, i) => {
            this.add
              .image(tx * T + T / 2, 8 * T + 6, "flags", i % 4)
              // the pole sits 8px from the left of every frame
              .setOrigin(8 / 83, 1)
              .setDepth(3);
          });

          // Hvidovre Hospital — a Danish pixel-art building standing near the
          // start (replaces the old roadside "HVIDOVRE HOSPITAL" signboard).
          if (lvl.hospitalTile !== undefined) {
            const hx = lvl.hospitalTile * T + T / 2;
            const tex = this.textures.get("hospital").getSourceImage();
            const targetH = 5.4 * T; // ~260px tall
            const scale = targetH / (tex.height || 859);
            this.add
              .image(hx, 8 * T + 8, "hospital")
              .setOrigin(0.5, 1)
              .setScale(scale)
              .setDepth(-2);
          }

          // pits are shallow Skagen sand holes
          lvl.pits.forEach(([a, b]) => this.addSandPit(a, b));

          // springboards that launch Bernardo skyward
          (lvl.bouncePads ?? []).forEach((tx) => this.addBouncePad(tx));

          // blessings (3 golden crosses) + today's bones along the journey.
          // `lvl.bones` is only a fallback: it is the hand-authored layout, kept
          // so a level with no valid daily candidates still has treats in it.
          lvl.crosses.forEach(([x, y]) => this.addCross(x, y));
          const bones = todaysBones.length > 0 ? todaysBones : lvl.bones;
          bones.forEach(([x, y], i) =>
            this.addCoin(x, y, todaysBones.length > 0 ? i : -1)
          );

          // bouncy World Cup footballs the bear can kick around
          // Arcade Physics separates circle bodies against static rectangles very
          // poorly (the ball sinks into and sticks inside the floor), so the ball
          // uses a slightly inset AABB body instead — the rolling look comes from
          // the sprite rotation applied in update().
          const ballTiles = lvl.balls ?? (lvl.ballTile !== undefined ? [lvl.ballTile] : []);
          ballTiles.forEach((tx) => {
            const b = this.physics.add.image(tx * T + T / 2, BALL_REST_Y, "ball");
            b.setDepth(3);
            b.body.setSize(BALL_SIZE, BALL_SIZE);
            b.body.setOffset((BALL_TEX - BALL_SIZE) / 2, BALL_TEX - BALL_SIZE);
            b.setBounce(0.55).setCollideWorldBounds(true);
            b.setDamping(true).setDrag(0.6);
            b.body.setMaxVelocity(500, 700);
            this.balls.add(b);
          });

          // church at the finish line
          this.buildChurch(lvl.churchTile);

          this.buildSurfaceIndex();
        }

        /**
         * Index every static solid by tile column so a downward "raycast" is a
         * cheap array lookup. Oscar uses it to find the floor beneath himself.
         */
        buildSurfaceIndex() {
          this.surfaceTops = [];
          this.solids.getChildren().forEach((s: any) => {
            const body = s.body;
            if (!body) return;
            const col = Math.floor(body.center.x / T);
            (this.surfaceTops[col] ||= []).push(body.top);
          });
          this.surfaceTops.forEach((tops) => tops.sort((a, b) => a - b));
        }

        /** Topmost solid surface at world x that is at or below `feetY`. */
        surfaceUnder(x: number, feetY: number) {
          const tops = this.surfaceTops[Math.floor(x / T)];
          if (!tops) return 8 * T;
          for (const top of tops) if (top >= feetY - 6) return top;
          return tops[tops.length - 1] ?? 8 * T;
        }

        // A springboard: landing on it launches Bernardo much higher than a jump.
        // Anchored to its bottom edge so it rests *on top of* the grass line
        // (8 * T) instead of sinking into it, and so the squash tween compresses
        // it down onto the ground rather than shrinking it toward its middle.
        addBouncePad(tx: number) {
          const pad = this.pads.create(tx * T + T / 2, 8 * T, "bouncePad");
          pad.setOrigin(0.5, 1);
          pad.setDisplaySize(T * 0.92, PAD_H);
          pad.refreshBody();
          pad.setDepth(0);
          pad.setData("cool", 0);
          pad.setData("sy", pad.scaleY);
        }

        // Parallax background scenery (windmill, timber houses, lighthouse,
        // beech trees, drifting gulls) authored as Level.landmarks.
        buildLandmarks(lvl: Level) {
          (lvl.landmarks ?? []).forEach((p) => {
            const img = this.add
              .image(p.x, p.y, p.key)
              .setOrigin(0.5, p.originY ?? 1)
              .setDepth(p.depth)
              .setScrollFactor(p.scrollX, 1)
              .setScale(p.scale ?? 1)
              .setAlpha(p.alpha ?? 1);
            if (p.spin) {
              this.tweens.add({
                targets: img,
                angle: 360,
                duration: p.spin,
                repeat: -1,
                ease: "Linear",
              });
            }
            if (p.drift) {
              this.tweens.add({
                targets: img,
                x: img.x + 42,
                y: img.y - 12,
                yoyo: true,
                repeat: -1,
                duration: Phaser.Math.Between(5000, 8000),
                ease: "Sine.inOut",
              });
            }
          });
        }

        create() {
          this.makeBackdrop();

          // ---- parallax background ----
          this.add
            .image(0, 0, "sky")
            .setOrigin(0, 0)
            .setDisplaySize(WORLD_W, WORLD_H)
            .setDepth(-41)
            .setScrollFactor(0);

          this.add.image(120, 90, "sun").setDepth(-35).setScrollFactor(0.1);

          // distant mountains tiled across the whole world
          for (let x = 250; x < WORLD_W; x += 680) {
            this.add
              .image(x, 330, "mountains")
              .setOrigin(0, 1)
              .setDepth(-26)
              .setScrollFactor(0.2, 1)
              .setAlpha(0.72);
            this.add
              .image(x + 680, 334, "mountains")
              .setOrigin(0, 1)
              .setDepth(-26)
              .setScrollFactor(0.22, 1)
              .setAlpha(0.58)
              .setScale(0.9);
          }

          const nClouds = Math.ceil(WORLD_W / 300) + 2;
          for (let i = 0; i < nClouds; i++) {
            const cx = 150 + i * 300 + Phaser.Math.Between(-60, 60);
            const cy = 40 + Phaser.Math.Between(0, 90);
            const cloud = this.add
              .image(cx, cy, "cloud")
              .setDepth(-30)
              .setScrollFactor(0.18 + (i % 3) * 0.06, 1)
              .setAlpha(0.82 + (i % 2) * 0.12)
              .setScale(Phaser.Math.FloatBetween(0.55, 1.18));
            this.tweens.add({
              targets: cloud,
              x: cloud.x + 40,
              yoyo: true,
              repeat: -1,
              duration: Phaser.Math.Between(6000, 10000),
              ease: "Sine.inOut",
            });
          }

          // hill bands: vertical scroll locked to the world (scrollFactorY = 1) and
          // anchored to the ground line so they always meet the terrain (no sky gap).
          const GROUND_Y = 8 * T; // 384 — top of the grass row
          const addHillBand = (
            key: string,
            bottomY: number,
            depth: number,
            scrollX: number,
            alpha: number,
            scale = 1
          ) => {
            const n = Math.ceil((WORLD_W + 520) / 760) + 1;
            for (let i = 0; i < n; i++) {
              this.add
                .image(-260 + i * 760, bottomY, key)
                .setOrigin(0, 1)
                .setDepth(depth)
                .setScrollFactor(scrollX, 1)
                .setAlpha(alpha)
                .setScale(scale, 1);
            }
          };
          addHillBand("hillFar", GROUND_Y, -24, 0.3, 1, 1.02); // opaque backing
          addHillBand("hillMid", GROUND_Y, -21, 0.45, 0.98, 1);
          addHillBand("hillNear", GROUND_Y + 4, -19, 0.6, 0.96, 1.04);

          for (let x = 340; x < WORLD_W; x += 900) {
            this.add
              .image(x + Phaser.Math.Between(-60, 60), GROUND_Y + 6, "hill")
              .setOrigin(0.5, 1)
              .setDepth(-18)
              .setScrollFactor(0.64, 1)
              .setAlpha(0.72)
              .setScale(Phaser.Math.FloatBetween(0.72, 0.95));
          }

          // distant trees behind the hills
          const nTrees = Math.ceil(WORLD_W / 460) + 1;
          for (let i = 0; i < nTrees; i++) {
            this.add
              .image(120 + i * 460, 8 * T - 8, "tree")
              .setOrigin(0.5, 1)
              .setDepth(-22)
              .setScrollFactor(0.5, 1)
              .setScale(Phaser.Math.FloatBetween(0.5, 0.75))
              .setAlpha(0.85);
          }

          // drifting birds
          const nBirds = Math.ceil(WORLD_W / 520) + 2;
          for (let i = 0; i < nBirds; i++) {
            const bird = this.add
              .image(200 + i * 260, 60 + Phaser.Math.Between(0, 70), "bird")
              .setDepth(-28)
              .setScrollFactor(0.2, 1)
              .setScale(Phaser.Math.FloatBetween(0.7, 1.1));
            this.tweens.add({
              targets: bird,
              x: bird.x + Phaser.Math.Between(40, 90),
              y: bird.y - Phaser.Math.Between(6, 16),
              yoyo: true,
              repeat: -1,
              duration: Phaser.Math.Between(4000, 7000),
              ease: "Sine.inOut",
            });
          }

          // ---- level geometry (data-driven) ----
          this.solids = this.physics.add.staticGroup();
          this.crosses = this.physics.add.group({ allowGravity: false });
          this.coinGroup = this.physics.add.group({ allowGravity: false });
          this.blocks = this.physics.add.staticGroup();
          this.movers = this.physics.add.group({ allowGravity: false, immovable: true });
          this.balls = this.physics.add.group();
          this.pads = this.physics.add.staticGroup();

          this.buildLevel(level);

          // ---- player (Bernardo the bear!) ----
          this.spawnX = level.spawnTile * T + T / 2;
          this.spawnY = 7 * T;
          this.player = this.physics.add.sprite(this.spawnX, this.spawnY, "bernardo", 0);
          this.player.setDepth(5);
          this.player.setSize(24, 34).setOffset(16, 24);
          this.player.setCollideWorldBounds(true);
          this.player.body.setMaxVelocity(400, 1000);

          // Oscar the dog — trots along behind Bernardo (animated companion)
          // Anchored by his paws so he keeps standing *on* the floor as he grows
          // fatter from the treats instead of sinking into it.
          this.oscar = this.add.sprite(this.spawnX - 46, this.spawnY + 28, "oscar", 0).setDepth(4);
          this.oscar.setOrigin(0.5, 1);
          this.oscar.setScale(this.oscarScale); // a plump little companion beside Bernardo
          this.oscarGroundY = this.spawnY + 28;
          this.oscarBaseY = this.spawnY + 28;
          if (!this.anims.exists("oscarWalk")) {
            // Sprite sheet is 8 columns of 64x52 cells:
            //   0-1 stand · 2-7 walk · 8-9 facing camera · 10-13 run · 14 turn
            //   15-16 jump · 17 fall · 18 land · 19-20 play bow · 21 bark
            //   22-23 hurt · 24-25 tumble · 26 cheer · 27-28 sit
            const anim = (
              key: string,
              frames: number[],
              frameRate: number,
              repeat = -1
            ) =>
              this.anims.create({
                key,
                frames: this.anims.generateFrameNumbers("oscar", { frames }),
                frameRate,
                repeat,
              });
            anim("oscarWalk", [2, 3, 4, 5, 6, 7], 10);
            anim("oscarRun", [10, 11, 12, 13], 14);
            anim("oscarIdle", [0, 1], 1.6);
            anim("oscarJump", [15], 1, 0);
            anim("oscarFall", [17], 1, 0);
            anim("oscarLand", [18], 1, 0);
            // idle tricks — each plays once and then hands control back to idle
            anim("oscarSit", [18, 27, 28, 27, 27, 28, 27, 27], 3, 0);
            anim("oscarLook", [14, 8, 9, 8, 14], 2, 0);
            anim("oscarBow", [19, 20, 20, 19], 3, 0);
            anim("oscarBark", [0, 21, 0, 21], 5, 0);
            anim("oscarSniff", [18, 19, 18, 0], 3.5, 0);
            anim("oscarCheer", [26, 16, 26, 16], 5, 0);
          }
          this.oscar.play("oscarIdle");

          if (!this.anims.exists("walk")) {
            this.anims.create({
              key: "walk",
              frames: this.anims.generateFrameNumbers("bernardo", { frames: [2, 3, 4, 5, 6, 7] }),
              frameRate: 12,
              repeat: -1,
            });
            this.anims.create({
              key: "idle",
              frames: this.anims.generateFrameNumbers("bernardo", { frames: [0, 1] }),
              frameRate: 1.8,
              repeat: -1,
            });
            this.anims.create({
              key: "jump",
              frames: this.anims.generateFrameNumbers("bernardo", { frames: [8] }),
              frameRate: 1,
            });
          }

          this.physics.add.collider(this.player, this.solids);
          this.physics.add.collider(this.player, this.movers);
          this.physics.add.collider(this.balls, this.movers);
          this.physics.add.collider(this.balls, this.blocks);
          this.physics.add.collider(this.balls, this.balls);
          this.physics.add.collider(
            this.player,
            this.blocks,
            (_p: any, blk: any) => this.bumpBlock(blk)
          );

          // springboards launch the player skyward — an overlap trigger (not a
          // solid collider) so Arcade separation never wipes the launch impulse.
          // The ground underneath provides the footing.
          this.physics.add.overlap(this.player, this.pads, (_p: any, pad: any) => {
            this.padHit = pad;
          });

          // football physics: bounces off ground, and the bear kicks it on contact
          this.physics.add.collider(this.balls, this.solids);
          this.physics.add.collider(this.balls, this.pads);
          this.physics.add.collider(this.player, this.balls, (_p: any, ball: any) => {
            const dir = ball.x < this.player.x ? -1 : 1;
            ball.setVelocityX(dir * 300);
            ball.setVelocityY(-260);
            this.collectFx(ball.x, ball.y - 8, 0xffffff, 4);
          });

          this.physics.add.overlap(this.player, this.crosses, (_p: any, cross: any) => {
            const glow = cross.getData("glow");
            if (glow) glow.destroy();
            this.blessingFx(cross.x, cross.y);
            cross.destroy();
            const remaining = this.crosses.countActive(true);
            const got = 3 - remaining;
            setBlessings(got);
            this.cameras.main.flash(180, 255, 243, 196);
            if (remaining === 0) this.unlockChurch();
          });

          this.physics.add.overlap(this.player, this.coinGroup, (_p: any, coin: any) => {
            const boneIndex = coin.getData("boneIndex");
            this.collectFx(coin.x, coin.y, 0xf3e9c9, 6);
            coin.destroy();
            this.gainBone();
            // Queued, not sent: the reporter batches pickups and flushes them
            // on its own tick, so a greedy run is still one request.
            if (typeof boneIndex === "number" && boneIndex >= 0) {
              deps.onBoneRef?.current(boneIndex);
            }
          });

          // ---- input ----
          this.cursors = this.input.keyboard!.createCursorKeys();
          this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE") as any;
          // capture movement keys so desktop arrows/space don't scroll the page
          this.input.keyboard!.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "W", "A", "S", "D", "SPACE"]);

          // ---- camera ----
          this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
          this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
          this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
          this.cameras.main.setBackgroundColor("#bfe3ff");

          const applyZoom = () => {
            const h = this.scale.gameSize.height || DESIGN_H;
            this.cameras.main.setZoom(Math.max(h / DESIGN_H, 0.35));
          };
          applyZoom();
          this.scale.on("resize", applyZoom);

          this.hint = this.add
            .text(0, 0, "", {
              fontFamily: GAME_FONT,
              fontSize: "15px",
              color: "#5d4037",
            })
            .setScrollFactor(0)
            .setDepth(50);
          this.setHint(TXT.collect);

          this.game.canvas?.setAttribute("tabindex", "0");
          setReady(true);
          if (process.env.NODE_ENV !== "production") {
            (window as any).__scene = this;
          }
        }

        setHint(text: string) {
          this.hint.setText(text);
          this.hint.setPosition(
            this.scale.width / (2 * this.cameras.main.zoom) - this.hint.width / 2,
            18 / this.cameras.main.zoom
          );
        }

        // A little pixel-art speech bubble (cream card + Dannebrog-red outline and
        // a downward tail) that a character can pop above their head.
        makeBubble(text: string) {
          const pad = 6;
          const label = this.add
            .text(0, 0, text, {
              fontFamily: GAME_FONT,
              fontSize: "13px",
              color: "#5d4037",
              align: "center",
              lineSpacing: 5,
            })
            .setOrigin(0.5);
          const w = Math.ceil(label.width) + pad * 2 + 8;
          const h = Math.ceil(label.height) + pad * 2;
          const g = this.add.graphics();
          g.fillStyle(0xfffdf5, 1);
          g.lineStyle(2, 0xc8102e, 1);
          g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
          g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
          // tail pointing down toward the character
          g.fillStyle(0xfffdf5, 1);
          g.fillTriangle(-6, h / 2 - 1, 6, h / 2 - 1, 0, h / 2 + 9);
          g.lineStyle(2, 0xc8102e, 1);
          g.lineBetween(-6, h / 2 - 1, 0, h / 2 + 9);
          g.lineBetween(6, h / 2 - 1, 0, h / 2 + 9);
          const c = this.add.container(0, 0, [g, label]).setDepth(7);
          return { container: c, h };
        }

        // Bernardo and Oscar introduce themselves when the level starts.
        introBubbles() {
          const show = (
            target: any,
            text: string,
            delay: number,
            offX: number,
            lift: number
          ) => {
            this.time.delayedCall(delay, () => {
              if (!target.active) return;
              const { container, h } = this.makeBubble(text);
              const originY = target.originY ?? 0.5;
              const offY = -(target.displayHeight * originY + h * 0.5 + 12) - lift;
              container.setPosition(target.x + offX, target.y + offY);
              container.setScale(0);
              const entry = { container, target, offX, offY };
              this.bubbles.push(entry);
              this.tweens.add({ targets: container, scale: 1, duration: 260, ease: "Back.out" });
              this.time.delayedCall(3400, () => {
                this.tweens.add({
                  targets: container,
                  scale: 0,
                  alpha: 0,
                  duration: 300,
                  ease: "Back.in",
                  onComplete: () => {
                    container.destroy();
                    this.bubbles = this.bubbles.filter((b) => b !== entry);
                  },
                });
              });
            });
          };
          // Bernardo speaks first (right + low); Oscar answers, stacked higher-left
          // so the two bubbles don't overlap while both are on screen.
          show(this.player, TXT.bernardo, 400, 14, 0);
          show(this.oscar, TXT.oscar, 1600, -22, 46);
        }

        // While Bernardo stands still Oscar doesn't just freeze: after a beat he
        // starts amusing himself — sitting, sniffing, stretching into a play bow,
        // barking, glancing at the camera — then returns to his idle breathing.
        cancelOscarTrick() {
          this.oscarTrick = null;
          this.oscarTrickUntil = 0;
          this.oscarNextTrick = 0;
        }

        oscarIdleTricks() {
          const now = this.time.now;
          if (this.oscarTrick) {
            if (now < this.oscarTrickUntil) return; // let the current trick finish
            this.oscarTrick = null;
            this.oscarNextTrick = now + Phaser.Math.Between(3600, 7000);
          }
          if (!this.oscarNextTrick) {
            this.oscarNextTrick = now + Phaser.Math.Between(2600, 4800);
          }
          if (now < this.oscarNextTrick) {
            this.oscar.play("oscarIdle", true);
            return;
          }
          // Weighted so he mostly settles down and only rarely turns to face the
          // camera — a dog that spins around every few seconds looks nervous.
          const tricks: [string, number, number][] = [
            ["oscarSit", 3200, 5],
            ["oscarSniff", 1500, 4],
            ["oscarBow", 1700, 3],
            ["oscarBark", 900, 2],
            ["oscarLook", 2400, 1],
          ];
          const total = tricks.reduce((sum, t) => sum + t[2], 0);
          let roll = Math.random() * total;
          let picked = tricks[0];
          for (const trick of tricks) {
            roll -= trick[2];
            if (roll <= 0) {
              picked = trick;
              break;
            }
          }
          const [key, ms] = picked;
          this.oscarTrick = key;
          this.oscarTrickUntil = now + ms;
          this.oscar.play(key, true);
        }

        // Oscar mirrors Bernardo's jump with a little delayed arc, so he reads as
        // an assisting co-op buddy rather than a passive follower.
        oscarHop() {
          if (this.oscarHopping) return;
          this.oscarHopping = true;
          this.oscarPrevJumpOffset = 0;
          this.cancelOscarTrick();
          // a small anticipation crouch, then the arc up and back down
          this.tweens.add({
            targets: this,
            oscarJumpOffset: 46,
            delay: 70,
            duration: 240,
            ease: "Quad.out",
            onComplete: () => {
              this.tweens.add({
                targets: this,
                oscarJumpOffset: 0,
                duration: 240,
                ease: "Quad.in",
                onComplete: () => {
                  this.oscarHopping = false;
                  if (this.oscar) {
                    // a tiny landing squash for weight
                    this.oscar.setScale(this.oscarScale * 1.08, this.oscarScale * 0.88);
                    this.tweens.add({
                      targets: this.oscar,
                      scaleX: this.oscarScale,
                      scaleY: this.oscarScale,
                      duration: 130,
                      ease: "Quad.out",
                    });
                  }
                },
              });
            },
          });
        }

        // Springboard launch: fling the player skyward and squash the pad. Called
        // from update() (after the physics step) so the launch velocity isn't
        // immediately zeroed by Arcade's collision separation.
        bounce(pad: any) {
          const pb = this.player.body as any;
          if (!(pb.blocked.down || pb.touching.down)) return;
          if (this.time.now < (pad.getData("cool") || 0)) return;
          pad.setData("cool", this.time.now + 350);
          pb.setVelocityY(-980);
          this.launching = true; // exempt from variable-jump cut for a full boost
          this.jumpLatch = true; // don't let a held jump immediately re-fire
          // pad squash + player stretch
          const restSy = pad.getData("sy") ?? pad.scaleY;
          pad.setScale(pad.scaleX, restSy * 0.55);
          this.tweens.add({
            targets: pad,
            scaleY: restSy,
            duration: 220,
            ease: "Back.out",
          });
          this.player.setScale(0.8, 1.25);
          this.tweens.add({ targets: this.player, scaleX: 1, scaleY: 1, duration: 260, ease: "Quad.out" });
          this.collectFx(pad.x, pad.y - 10, 0xffe27a, 6);
          this.oscarHop();
        }

        collectFx(x: number, y: number, color: number, count: number) {
          // soft twinkle puff — gentle rise + fade instead of a harsh spark burst
          const p = this.add.particles(x, y, "twinkle", {
            speed: { min: 30, max: 90 },
            angle: { min: 200, max: 340 },
            gravityY: 120,
            rotate: { min: -180, max: 180 },
            scale: { start: 0.55, end: 0 },
            alpha: { start: 0.95, end: 0 },
            lifespan: 520,
            quantity: count,
            tint: color,
            blendMode: "ADD",
          });
          p.setDepth(6);
          this.time.delayedCall(560, () => p.destroy());
        }

        // A blessing burst when Bernardo collects a cross: an expanding golden
        // halo ring, a ring of rising twinkles, and a ghost cross that floats up.
        blessingFx(x: number, y: number) {
          // expanding halo ring
          const ring = this.add
            .image(x, y, "ring")
            .setDepth(6)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.2);
          this.tweens.add({
            targets: ring,
            scale: 1.5,
            alpha: { from: 0.9, to: 0 },
            duration: 520,
            ease: "Cubic.out",
            onComplete: () => ring.destroy(),
          });

          // rising golden twinkles
          const p = this.add.particles(x, y, "twinkle", {
            speed: { min: 40, max: 120 },
            angle: { min: 240, max: 300 },
            gravityY: -30,
            rotate: { min: -160, max: 160 },
            scale: { start: 0.7, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 700,
            quantity: 14,
            tint: [0xffe27a, 0xfff3c4, 0xffffff],
            blendMode: "ADD",
          });
          p.setDepth(6);
          this.time.delayedCall(760, () => p.destroy());

          // ghost of the cross floats upward and fades
          const ghost = this.add.image(x, y, "cross").setDepth(6);
          this.tweens.add({
            targets: ghost,
            y: y - 46,
            scale: { from: 1, to: 1.5 },
            alpha: { from: 1, to: 0 },
            duration: 640,
            ease: "Quad.out",
            onComplete: () => ghost.destroy(),
          });
        }

        // A grand celebration when Bernardo reaches the church door: layered light
        // rings, a shower of twinkles, confetti, and a little victory hop.
        goalFx(x: number, y: number) {
          [0, 130, 260].forEach((delay) => {
            this.time.delayedCall(delay, () => {
              const ring = this.add
                .image(x, y, "ring")
                .setDepth(41)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setScale(0.2);
              this.tweens.add({
                targets: ring,
                scale: 2.4,
                alpha: { from: 1, to: 0 },
                duration: 700,
                ease: "Cubic.out",
                onComplete: () => ring.destroy(),
              });
            });
          });

          const burst = this.add.particles(x, y, "twinkle", {
            speed: { min: 90, max: 240 },
            angle: { min: 0, max: 360 },
            gravityY: 220,
            rotate: { min: -200, max: 200 },
            scale: { start: 0.9, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 900,
            quantity: 26,
            tint: [0xffd34d, 0xffffff, 0xfff3c4, 0xc8102e],
            blendMode: "ADD",
          });
          burst.setDepth(41);
          this.time.delayedCall(950, () => burst.destroy());

          const confetti = this.add.particles(x, y - 30, "confetti", {
            speedY: { min: -260, max: -80 },
            speedX: { min: -140, max: 140 },
            angle: { min: 0, max: 360 },
            rotate: { min: 0, max: 360 },
            scale: { min: 0.6, max: 1.3 },
            lifespan: 1600,
            quantity: 30,
            tint: [0xc8102e, 0xffffff, 0xffd34d, 0x8ac47e, 0xf7a9c4],
          });
          confetti.setDepth(41);
          this.time.delayedCall(1700, () => confetti.destroy());

          this.cameras.main.flash(300, 255, 250, 220);

          // Bernardo's victory hop
          this.tweens.add({
            targets: this.player,
            y: this.player.y - 26,
            duration: 220,
            yoyo: true,
            ease: "Quad.out",
          });
        }

        unlockChurch() {
          this.churchUnlocked = true;
          this.door.setAlpha(0.55);
          this.churchCross.clearTint();
          this.churchCross.setAlpha(1);
          this.cameras.main.flash(500, 255, 255, 255);
          this.cameras.main.shake(300, 0.006);
          this.setHint(TXT.churchOpen);

          // celebratory confetti rain across the view
          const cx = this.cameras.main.scrollX + this.scale.width / (2 * this.cameras.main.zoom);
          const confetti = this.add.particles(0, 0, "confetti", {
            x: { min: cx - 260, max: cx + 260 },
            y: this.cameras.main.scrollY - 10,
            speedY: { min: 120, max: 260 },
            speedX: { min: -60, max: 60 },
            angle: { min: 0, max: 360 },
            rotate: { min: 0, max: 360 },
            scale: { min: 0.6, max: 1.3 },
            lifespan: 2600,
            frequency: 30,
            tint: [0xc8102e, 0xffffff, 0xffd34d, 0x8ac47e, 0xf7a9c4],
          });
          confetti.setDepth(40);
          this.time.delayedCall(2600, () => confetti.destroy());

          this.tweens.add({
            targets: this.churchGlow,
            alpha: { from: 0, to: 0.9 },
            scale: { from: 0.8, to: 1.4 },
            yoyo: true,
            repeat: -1,
            duration: 700,
            ease: "Sine.inOut",
          });
          this.tweens.add({
            targets: this.churchCross,
            scale: { from: 1, to: 1.25 },
            yoyo: true,
            repeat: -1,
            duration: 700,
          });
        }

        update() {
          const body = this.player.body as any;

          if (control.paused) {
            body.setVelocityX(0);
            this.player.anims.play("idle", true);
            return;
          }

          // once gameplay actually begins, Bernardo & Oscar introduce themselves
          if (!this.introShown) {
            this.introShown = true;
            this.introBubbles();
          }

          // keep any active speech bubbles pinned above their characters
          if (this.bubbles.length) {
            for (const b of this.bubbles) {
              b.container.x = b.target.x + b.offX;
              b.container.y = b.target.y + b.offY;
            }
          }

          const left = this.cursors.left.isDown || this.keys.A.isDown || control.left;
          const right = this.cursors.right.isDown || this.keys.D.isDown || control.right;
          const jumpHeld =
            this.cursors.up.isDown ||
            this.keys.W.isDown ||
            this.keys.SPACE.isDown ||
            control.jump;

          const speed = 230;
          const onGround = body.blocked.down || body.touching.down;

          if (left && !right) {
            body.setVelocityX(-speed);
            this.player.setFlipX(true);
          } else if (right && !left) {
            body.setVelocityX(speed);
            this.player.setFlipX(false);
          } else {
            body.setVelocityX(0);
          }

          if (jumpHeld && onGround && !this.jumpLatch) {
            body.setVelocityY(-620);
            this.jumpLatch = true;
            // squash-then-stretch launch
            this.player.setScale(0.8, 1.2);
            this.tweens.add({ targets: this.player, scaleX: 1, scaleY: 1, duration: 220, ease: "Quad.out" });
            this.collectFx(this.player.x, this.player.y + 22, 0xffffff, 3);
            // Oscar mirrors the jump a beat later, like an assisting co-op buddy
            this.oscarHop();
          }
          if (!jumpHeld) this.jumpLatch = false;

          // variable jump height: cut the rise when the button is released — but
          // never cut a springboard launch (that's a fixed, powerful boost).
          if (!jumpHeld && !this.launching && body.velocity.y < -220) {
            body.setVelocityY(-220);
          }
          // the springboard boost ends once the player starts descending
          if (this.launching && body.velocity.y >= 0) this.launching = false;

          // landing squash + dust
          if (onGround && !this.wasOnFloor) {
            this.player.setScale(1.2, 0.8);
            this.tweens.add({ targets: this.player, scaleX: 1, scaleY: 1, duration: 160, ease: "Quad.out" });
            this.collectFx(this.player.x, this.player.y + 22, 0xe8e0d0, 4);
          }
          this.wasOnFloor = onGround;

          // animation
          if (!onGround) {
            this.player.anims.play("jump", true);
          } else if (body.velocity.x !== 0) {
            this.player.anims.play("walk", true);
          } else {
            this.player.anims.play("idle", true);
          }

          // Oscar trots along the ground just behind Bernardo, and hops in sync
          // whenever Bernardo jumps (assisted co-op buddy). His height comes from
          // the terrain under his own paws — copying Bernardo's height left him
          // standing in mid-air whenever Bernardo was up on a platform.
          if (this.oscar) {
            const facingRight = !this.player.flipX;
            const moving = Math.abs(body.velocity.x) > 5;
            const gap = 30 + this.oscarScale * 14;
            const targetX = this.player.x + (facingRight ? -gap : gap);
            this.oscar.x = Phaser.Math.Linear(this.oscar.x, targetX, 0.16);
            const reference = onGround ? body.bottom : this.oscarGroundY;
            this.oscarGroundY = this.surfaceUnder(this.oscar.x, reference);
            this.oscarBaseY = Phaser.Math.Linear(this.oscarBaseY, this.oscarGroundY, 0.3);
            // up-only stride bounce keeps his paws on the ground between strides
            const stride = this.oscarHopping || !moving
              ? 0
              : Math.abs(Math.sin(this.time.now * 0.02)) * 3;
            this.oscar.y = this.oscarBaseY - stride - this.oscarJumpOffset;
            this.oscar.setFlipX(!facingRight);
            if (this.oscarHopping) {
              // rising vs. falling read from the hop tween's own offset
              const rising = this.oscarJumpOffset >= this.oscarPrevJumpOffset;
              this.oscarPrevJumpOffset = this.oscarJumpOffset;
              this.cancelOscarTrick();
              this.oscar.play(rising ? "oscarJump" : "oscarFall", true);
            } else if (moving) {
              this.cancelOscarTrick();
              const running = Math.abs(body.velocity.x) > 190;
              this.oscar.play(running ? "oscarRun" : "oscarWalk", true);
            } else {
              this.oscarIdleTricks();
            }
          }

          // footballs roll realistically — spin scales with each ball's speed
          if (this.balls) {
            this.balls.children.iterate((b: any) => {
              if (b && b.body) {
                b.rotation += (b.body.velocity.x / 15) * (this.game.loop.delta / 1000);
              }
              return true;
            });
          }

          // springboard launch — applied here (after the physics step) so the
          // impulse isn't wiped by collision separation.
          if (this.padHit) {
            const pad = this.padHit;
            this.padHit = null;
            this.bounce(pad);
          }

          // moving platforms: reverse at bounds and carry a rider on top
          if (this.movers) {
            this.movers.children.iterate((m: any) => {
              if (!m) return true;
              const mb = m.body as any;
              const vx = m.getData("vx");
              const vy = m.getData("vy");
              if (vx) {
                if (m.x <= m.getData("minX") && mb.velocity.x < 0)
                  mb.setVelocityX(Math.abs(vx));
                else if (m.x >= m.getData("maxX") && mb.velocity.x > 0)
                  mb.setVelocityX(-Math.abs(vx));
              }
              if (vy) {
                if (m.y <= m.getData("minY") && mb.velocity.y < 0)
                  mb.setVelocityY(Math.abs(vy));
                else if (m.y >= m.getData("maxY") && mb.velocity.y > 0)
                  mb.setVelocityY(-Math.abs(vy));
              }
              // carry the player when standing on this platform
              const pb = this.player.body as any;
              const riding =
                (pb.blocked.down || pb.touching.down) &&
                Math.abs(pb.bottom - mb.top) < 8 &&
                this.player.x > mb.left - 6 &&
                this.player.x < mb.right + 6;
              if (riding) {
                this.player.x += mb.deltaX();
                this.player.y += mb.deltaY();
              }
              return true;
            });
          }

          // fell below the world -> flash and respawn at the start
          if (this.player.y > WORLD_H + 80) {
            this.respawn();
          }

          // enter church
          if (this.churchUnlocked && this.doorZone) {
            const touching = this.physics.overlap(this.player, this.doorZone);
            if (touching && !this.entered) {
              this.entered = true;
              this.goalFx(this.player.x, this.player.y - 20);
              if (this.oscar) {
                // Oscar celebrates arriving at the church with Bernardo
                this.oscarTrick = "oscarCheer";
                this.oscarTrickUntil = this.time.now + 1800;
                this.oscar.play("oscarCheer", true);
              }
              onEnterRef.current();
            }
            if (!touching) this.entered = false;
          }

          // keep hint pinned
          if (this.hint) {
            this.hint.setPosition(
              this.cameras.main.scrollX + 10,
              this.cameras.main.scrollY + 10
            );
          }
        }
  };
}
