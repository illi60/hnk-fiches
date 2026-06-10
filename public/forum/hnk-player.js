/* ============================================================
   Hi no Kuni — Lecteur d'ambiance YouTube pour Forumactif.
   À héberger à côté de hnk-presentation.css puis installer UNE fois
   dans les codes JavaScript du forum (Panneau d'admin → Modules →
   HTML & JAVASCRIPT → Gestion des codes Javascript → placement
   « Sur toutes les pages ») :

     <script src="https://VOTRE-DOMAINE/forum/hnk-player.js"></script>

   Principe : les posts RP générés contiennent de simples liens
   <a class="hnk-rp-player" href="https://www.youtube.com/watch?v=…">
   (les iframes sont supprimées par Forumactif, pas les liens). Ce
   script intercepte le clic et joue l'AUDIO via une iframe d'embed
   YouTube invisible créée à la volée (lecture/pause par postMessage,
   API officielle des embeds — enablejsapi). Un seul lecteur joue à
   la fois. Sans ce script, le lien ouvre simplement YouTube.
   ============================================================ */
(function () {
  "use strict";

  /** @type {Array<{a: Element, iframe: HTMLIFrameElement, playing: boolean}>} */
  var states = [];

  function findState(a) {
    for (var i = 0; i < states.length; i++) {
      if (states[i].a === a) return states[i];
    }
    return null;
  }

  function ytId(href) {
    if (!href) return null;
    var m =
      href.match(/[?&]v=([A-Za-z0-9_-]{6,15})/) ||
      href.match(/youtu\.be\/([A-Za-z0-9_-]{6,15})/);
    return m ? m[1] : null;
  }

  // Commande envoyée à l'embed (API postMessage des iframes enablejsapi=1).
  function send(st, func) {
    try {
      st.iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: func, args: [] }),
        "*"
      );
    } catch (e) {
      /* iframe pas encore prête : ignore */
    }
  }

  function setOn(st, on) {
    st.playing = on;
    if (st.a.classList) st.a.classList[on ? "add" : "remove"]("hnk-rp-player--on");
  }

  function pauseAll(except) {
    for (var i = 0; i < states.length; i++) {
      if (states[i] !== except && states[i].playing) {
        send(states[i], "pauseVideo");
        setOn(states[i], false);
      }
    }
  }

  document.addEventListener("click", function (e) {
    // Remonte du nœud cliqué vers le lien .hnk-rp-player englobant.
    var t = e.target;
    while (t && t !== document && !(t.classList && t.classList.contains("hnk-rp-player"))) {
      t = t.parentNode;
    }
    if (!t || t === document) return;
    e.preventDefault();

    var st = findState(t);
    if (!st) {
      var id = ytId(t.getAttribute("href"));
      if (!id) return;
      pauseAll(null);
      var f = document.createElement("iframe");
      // autoplay=1 : le clic utilisateur sur la page parente + allow="autoplay"
      // délèguent l'autorisation de lecture sonore à l'iframe.
      f.src =
        "https://www.youtube.com/embed/" + id + "?enablejsapi=1&autoplay=1&playsinline=1";
      f.setAttribute("allow", "autoplay");
      f.setAttribute("aria-hidden", "true");
      f.tabIndex = -1;
      f.style.cssText =
        "position:fixed;width:2px;height:2px;left:-9999px;top:0;border:0;opacity:0;pointer-events:none;";
      document.body.appendChild(f);
      st = { a: t, iframe: f, playing: true };
      states.push(st);
      setOn(st, true);
    } else if (st.playing) {
      send(st, "pauseVideo");
      setOn(st, false);
    } else {
      pauseAll(st);
      send(st, "playVideo");
      setOn(st, true);
    }
  });
})();
