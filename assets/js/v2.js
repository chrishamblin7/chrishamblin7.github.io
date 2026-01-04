/* v2: single-page accordion + photo lightbox + simple playlist player */

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function initHashOpen() {
  const openFromHash = () => {
    const raw = window.location.hash || "";
    const id = raw.startsWith("#") ? decodeURIComponent(raw.slice(1)) : "";
    if (!id) return;
    const el = document.getElementById(id);
    if (el && el.tagName === "DETAILS") {
      el.open = true;
      el.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };

  window.addEventListener("hashchange", openFromHash);
  document.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    // Let the hash update, then open.
    setTimeout(openFromHash, 0);
  });
  openFromHash();
}

// --------------------------
// Photos: responsive grid + lightbox
// --------------------------

// Match the exact set/order of images used by the original v1 gallery (`image_gallery/index.html`).
const PHOTO_BASE = "/image_gallery/images/";
const PHOTO_FILES = [
  "gillian_sepia.jpg",
  "rainy_road.jpg",
  "milford_sound.jpg",
  "jordan_valley.jpg",
  "hula_rock_close.jpg",
  "mount_tam_golden_field.jpg",
  "flower.jpg",
  "beach_skull.jpg",
  "blown_out_platue.jpg",
  "maddie_blanc_2.JPG",
  "porsmork_blacksand.jpg",
  "wellington_ferry.jpg",
  "snail.JPG",
  "wanaka_peak.jpg",
  "lake_piano_screenshot.jpeg",
  "eyja.jpg",
  "piano_van_sunset.jpg",
  "ocean_rock.jpg",
  "wanaka_peak_3.jpg",
  "golden_tree.jpg",
  "in_petes_house.jpg",
  "gillian_tropical_beach.jpg",
  "view_porsmork.jpg",
  "busker_hands.jpg",
  "soft_lake.jpg",
  "half_wanaka_peak.jpeg",
  "tropical_sunset.jpg",
  "mount_doom.jpg",
  "mnt_cook_lake.jpg",
  "closeup_busker.jpg",
];

function filenameToCaption(name) {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function initPhotoGrid() {
  const grid = qs("[data-photo-grid]");
  if (!grid) return;

  // Make this idempotent in case the script is evaluated more than once (e.g. browser bfcache quirks).
  grid.replaceChildren();

  const frag = document.createDocumentFragment();

  PHOTO_FILES.forEach((file, idx) => {
    const src = PHOTO_BASE + file;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "photo";
    btn.setAttribute("data-lightbox-src", src);
    btn.setAttribute("data-lightbox-alt", filenameToCaption(file));
    btn.setAttribute("data-lightbox-index", String(idx));

    const img = document.createElement("img");
    img.src = src;
    img.alt = filenameToCaption(file);
    img.loading = "lazy";
    img.decoding = "async";

    btn.appendChild(img);
    frag.appendChild(btn);
  });

  grid.appendChild(frag);
}

function initLightbox() {
  const lightbox = qs("[data-lightbox]");
  const img = qs("[data-lightbox-img]", lightbox || undefined);

  if (!lightbox || !img) return;

  const prevBtn = qs("[data-lightbox-prev]", lightbox);
  const nextBtn = qs("[data-lightbox-next]", lightbox);

  const open = (src, alt, index) => {
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    img.src = src;
    img.alt = alt || "";
    lightbox.dataset.index = String(index ?? 0);
  };

  const close = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    // clear src so iOS releases memory sooner for large images
    img.removeAttribute("src");
    img.alt = "";
    delete lightbox.dataset.mode;
  };

  const showRelative = (delta) => {
    if (lightbox.dataset.mode !== "photos") return;
    const index = Number.parseInt(lightbox.dataset.index || "0", 10);
    const nextIndex = (index + delta + PHOTO_FILES.length) % PHOTO_FILES.length;
    const file = PHOTO_FILES[nextIndex];
    open(PHOTO_BASE + file, filenameToCaption(file), nextIndex);
  };

  qs("[data-lightbox-close]", lightbox)?.addEventListener("click", close);
  prevBtn?.addEventListener("click", () => showRelative(-1));
  nextBtn?.addEventListener("click", () => showRelative(1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") showRelative(-1);
    if (e.key === "ArrowRight") showRelative(1);
  });

  // Enable lightbox for any element with data-lightbox-src (photos section + vans section)
  document.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target.closest("[data-lightbox-src]") : null;
    if (!target) return;
    e.preventDefault();

    const src = target.getAttribute("data-lightbox-src");
    const alt = target.getAttribute("data-lightbox-alt") || "";

    // If the click came from the vans section (not in PHOTO_FILES), don't enable next/prev cycling.
    const idxAttr = target.getAttribute("data-lightbox-index");
    if (idxAttr != null) {
      lightbox.dataset.mode = "photos";
      prevBtn?.removeAttribute("disabled");
      nextBtn?.removeAttribute("disabled");
      open(src, alt, Number.parseInt(idxAttr, 10));
      return;
    }

    lightbox.dataset.mode = "single";
    prevBtn?.setAttribute("disabled", "true");
    nextBtn?.setAttribute("disabled", "true");
    open(src, alt, 0);
  });
}

// --------------------------
// Music: native audio + simple track switching
// --------------------------

const PLAYLISTS = {
  eurydice: [
    { name: "Eurydice", file: "/music/eurydice/01_Eurydice.mp3" },
    { name: "Under the Ground", file: "/music/eurydice/02_Under_the_Ground.mp3" },
    { name: "Passing the Time", file: "/music/eurydice/03_Passing_the_Time.mp3" },
    { name: "On the Styx", file: "/music/eurydice/04_On_the_Styx.mp3" },
    { name: "A Father", file: "/music/eurydice/05_A_Father.mp3" },
    { name: "Little Stone", file: "/music/eurydice/06_Little_Stone.mp3" },
    { name: "Orpheus", file: "/music/eurydice/07_Orpheus.mp3" },
    { name: "Turn Around", file: "/music/eurydice/08_Turn_Around.mp3" },
    { name: "Passing the Time With Friends", file: "/music/eurydice/09_Passing_the_Time_with_Friends.mp3" },
    { name: "Mantra", file: "/music/eurydice/10_Mantra.mp3" },
    { name: "A Father and a Daughter", file: "/music/eurydice/11_A_Father_and_a_Daughter.mp3" },
    { name: "Eurydice (Abridged)", file: "/music/eurydice/12_Eurydice_Abridged.mp3" },
    { name: "Alternate Takes", file: "/music/eurydice/13_Alternate_Takes.mp3" },
  ],
  sweptup: [
    { name: "Guess They Never Told You", file: "/music/sweptup/01_Guess_They_Never_Told_You.mp3" },
    { name: "Swept Up", file: "/music/sweptup/02_Swept_Up.mp3" },
    { name: "Galapagos", file: "/music/sweptup/03_Galapagos.mp3" },
    { name: "Hansel and Gretel", file: "/music/sweptup/04_Hansel_and_Gretel.mp3" },
    { name: "You Got Me Bad", file: "/music/sweptup/05_You_Got_Me_Bad.mp3" },
    { name: "It Must Be Nice", file: "/music/sweptup/06_It_Must_Be_Nice.mp3" },
    { name: "Square One", file: "/music/sweptup/07_Square_One.mp3" },
    { name: "Stronger Than Words", file: "/music/sweptup/08_Stronger_Than_Words.mp3" },
    { name: "Fin", file: "/music/sweptup/09_Fin.mp3" },
  ],
  badandblue: [
    { name: "A Way", file: "/music/badandblue/01_A_Way.mp3" },
    { name: "Ain't Sunday", file: "/music/badandblue/02_Aint_Sunday.mp3" },
    { name: "Walls", file: "/music/badandblue/03_Walls.mp3" },
    { name: "Interlude 6", file: "/music/badandblue/04_Interlude_6.mp3" },
    { name: "Toxic", file: "/music/badandblue/05_Toxic.mp3" },
    { name: "Monster", file: "/music/badandblue/06_Monsters.mp3" },
    { name: "Interlude (S.T.O.P)", file: "/music/badandblue/07_Interlude_STOP.mp3" },
    { name: "Just Play", file: "/music/badandblue/08_Just_Play.mp3" },
    { name: "New City", file: "/music/badandblue/09_New_City.mp3" },
  ],
  ham: [
    { name: "Tell me a Bedtime Story", file: "/music/ham/Tell_me_a_bedtime_story_ham.m4a" },
    { name: "DMT Song", file: "/music/ham/dmt_song_ham.m4a" },
    { name: "Fleer Ultra", file: "/music/ham/bass_frenzy_ham.m4a" },
    { name: "MMMhhMM", file: "/music/ham/mmhhmm_jondi_ham.m4a" },
    { name: "Pure Imagination", file: "/music/ham/pure_imagination_ham.m4a" },
    { name: "Resolution (after party)", file: "/music/ham/resolution_cantab.m4a" },
  ],
  trusttheprocess: [
    { name: "Dad Did", file: "/music/trusttheprocess/Dad_Did.mp3" },
    { name: "Shade", file: "/music/badandblue/Shade.mp3" },
    { name: "Trust the Process", file: "/music/badandblue/Trust_the_Process.mp3" },
  ],
  bluebird: [{ name: "Blue Bird", file: "/music/singles/blue_bird.m4a" }],
  jam1: [{ name: "Jam - 1", file: "/music/singles/knot_A_flat.mp3" }],
};

function pauseAllOtherAudio(exceptAudio) {
  qsa("audio").forEach((a) => {
    if (a !== exceptAudio) a.pause();
  });
}

function initMusicPlayers() {
  qsa("[data-player]").forEach((playerEl) => {
    const albumEl = playerEl.closest("[data-album]");
    if (!albumEl) return;

    const albumKey = albumEl.getAttribute("data-album");
    const tracks = PLAYLISTS[albumKey] || [];
    if (!tracks.length) return;

    const audio = qs("audio", playerEl);
    const list = qs("[data-tracklist]", playerEl);
    if (!audio || !list) return;

    const setCurrent = (idx, { play } = { play: true }) => {
      const t = tracks[idx];
      if (!t) return;
      qsa(".track-btn", list).forEach((b) => b.setAttribute("aria-current", "false"));
      const btn = qs(`[data-track-index="${idx}"]`, list);
      btn?.setAttribute("aria-current", "true");
      audio.src = t.file;
      if (play) {
        pauseAllOtherAudio(audio);
        // play() can fail without a user gesture; we ignore and let controls handle it.
        audio.play().catch(() => {});
      }
    };

    const frag = document.createDocumentFragment();
    tracks.forEach((t, idx) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "track-btn";
      btn.textContent = t.name;
      btn.setAttribute("data-track-index", String(idx));
      btn.setAttribute("aria-current", idx === 0 ? "true" : "false");
      btn.addEventListener("click", () => setCurrent(idx, { play: true }));
      li.appendChild(btn);
      frag.appendChild(li);
    });
    list.appendChild(frag);

    audio.addEventListener("play", () => pauseAllOtherAudio(audio));

    // Initialize first track but don't autoplay
    setCurrent(0, { play: false });
  });
}

// --------------------------
// Boot
// --------------------------

initHashOpen();
initPhotoGrid();
initLightbox();
initMusicPlayers();


