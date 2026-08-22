/**
 * Le Lettrage « Studio Poche », en SVG inline.
 *
 * ── Pourquoi inline, et pas un fichier dans public/ ─────────────────────────
 * `Dessin` rend les vecteurs de la maquette en `<img src="…svg">`, ce qui
 * interdit d'atteindre les nœuds `path` — donc de les tracer (voir le
 * commentaire de lib/motion/useTraceSvg.ts). Ce Lettrage doit s'écrire sous la
 * plume : il est donc écrit ici, en JSX.
 *
 * ── Pourquoi les tracés sont réordonnés ─────────────────────────────────────
 * L'export Figma les donne dans l'ordre z, qui n'a rien à voir avec l'ordre
 * d'écriture. Ils sont ici regroupés par lettre et rangés dans l'ordre où une
 * main les tracerait : S-t-u-d-i-o, puis P-o-c-h-e. Aucun tri automatique ne
 * peut retrouver cet ordre — la barre du « t » commence à gauche du « u »
 * qu'elle surplombe, et le point du « i » doit tomber après son fût.
 *
 * `data-trace` : un trait à révéler par DrawSVG.
 * `data-inverse` : le tracé est écrit de droite à gauche dans les données
 *   Figma ; sans ce marqueur, la barre s'écrirait à contresens.
 * `data-pose` : ce nœud est un `fill` sans `stroke` — DrawSVG n'a rien à
 *   révéler dessus, il se pose (voir lib/motion/traceLettrage.ts).
 *
 * La géométrie de la boîte n'est PAS ici : elle vient du pipeline Figma, via
 * `vecteur("attente", "Calque_1")` chez l'appelant. Seul le tracé est à la main.
 */
export function LettrageStudioPoche() {
  return (
    <svg
      data-lettrage
      viewBox="0 0 222 132"
      width="100%"
      height="100%"
      fill="none"
      stroke="black"
      strokeWidth={10}
      strokeLinecap="round"
      strokeLinejoin="round"
      /* Comme public/img/svg/nav-ovale-a-propos.svg : le trait déborde de la
         boîte par ses extrémités arrondies, et le couper à plat se voit. */
      style={{ display: "block", overflow: "visible" }}
      aria-hidden
    >
      {/* ── Studio ─────────────────────────────────────────────────────── */}
      <g data-lettre="S">
        <path
          data-trace
          d="M36.4367 26.1273C33.7185 18.4848 21.8174 12.3098 14.8266 17.6027C10.6576 20.7623 9.21484 24.9244 9.5576 29.5917C9.90037 34.3232 13.3758 36.4965 17.8398 37.6352C21.3631 38.5334 24.9581 39.2391 28.2981 40.9713C36.2215 45.0773 37.8556 51.9499 32.7859 58.9589C28.1626 65.3504 21.4747 67.4034 14.3882 68.8068C12.0526 69.2719 8.17857 69.2639 3.99365 69.1035"
        />
      </g>
      <g data-lettre="t">
        <path
          data-trace
          d="M61.4585 12.2136C61.2353 23.0158 62.4151 33.7458 62.9651 44.5079C63.2919 50.9956 62.2876 57.4192 62.2078 63.8909"
        />
        {/* Écrit de x=81 vers x=38 dans l'export : à inverser. */}
        <path
          data-trace
          data-inverse
          d="M81.2751 9.98416C74.5872 9.63933 70.2987 10.738 61.4585 11.7244C52.7619 12.2216 45.9145 11.6201 38.1744 10.73"
        />
      </g>
      <g data-lettre="u">
        <path
          data-trace
          d="M99.362 21.1633C100.366 29.4153 101.666 37.6433 101.1 46.0076C100.685 52.1424 98.8677 57.6678 94.1567 61.9021C90.0037 65.6391 83.6426 64.4282 80.7809 59.4241C76.5083 51.958 75.9663 43.7701 77.0105 35.5983C77.4649 32.0617 76.8909 28.2204 78.804 24.8924"
        />
      </g>
      <g data-lettre="d">
        <path
          data-trace
          d="M114.715 6.75232C111.813 17.9555 114.866 29.2869 114.053 40.5462C113.798 44.0267 113.136 47.7557 115.464 50.9715"
        />
        <path
          data-trace
          d="M115.464 8.24402C125.579 10.2569 130.235 17.5065 132.785 26.6326C136.03 38.2207 133.064 44.2353 124.328 49.905C123.77 50.2659 121.243 51.116 120.741 51.2443C118.342 51.8778 114.874 52.5274 111 52.2226"
        />
      </g>
      <g data-lettre="i">
        <path
          data-trace
          d="M146.671 17.1857C147.221 32.1339 148.305 47.034 149.892 61.9101"
        />
        {/* Le point : un `fill`, sans `stroke`. Il se pose, il ne se trace pas. */}
        <ellipse data-pose cx="146.671" cy="4.00972" rx="3.98564" ry="4.00972" fill="black" stroke="none" />
      </g>
      <g data-lettre="o">
        <path
          data-trace
          d="M163.523 24.6357C164.742 32.7193 166.863 40.434 173.957 45.4622C179.322 49.2715 186.743 50.4423 192.777 46.0316C199.736 40.9473 201.562 35.0289 200.366 27.0897C199.106 18.6933 195.655 12.5745 187.795 9.23842C178.469 5.27682 165.93 9.71157 164.089 21.1714C163.929 22.1658 163.323 23.088 163.515 24.1385"
        />
      </g>

      {/* ── Poche ──────────────────────────────────────────────────────── */}
      <g data-lettre="P">
        <path
          data-trace
          d="M43.6189 111.599C47.9712 111.879 52.2438 111.703 55.9983 109.104C63.0449 104.229 62.6144 91.7745 54.5555 85.7038C52.0923 83.8513 49.8444 82.2955 46.632 81.5898C42.8536 80.7638 41.634 82.929 41.7775 85.2467C42.3196 93.6911 42.2558 109.65 42.2558 109.65L41.7695 113.106C41.7695 113.106 40.8289 122.834 40.1514 127.99"
        />
      </g>
      <g data-lettre="o">
        <path
          data-trace
          d="M88.2101 80.7878C80.5418 83.0493 78.9634 89.7456 77.3772 96.2092C75.9184 102.136 76.5402 108.054 79.3062 113.579C85.0615 125.063 94.5553 125.079 101.546 116.041C108.84 106.602 108.449 88.2379 97.1698 82.2153C94.3719 80.7237 91.5979 80.844 88.7123 80.7959"
        />
      </g>
      <g data-lettre="c">
        <path
          data-trace
          d="M136.572 85.5674C136.835 83.6347 136.428 81.7662 135.552 80.1222C133.16 75.6233 126.408 75.6634 123.371 79.7854C121.283 82.6162 120.486 85.8801 120.358 89.2242C120.079 96.4016 120.589 100.275 121.953 105.616C123.244 110.676 126.145 114.782 131.813 114.967C137.449 115.143 139.41 110.516 141.219 106.129"
        />
      </g>
      {/* Un « h » dessiné en deux fûts joints par une barre, pas en épaule. */}
      <g data-lettre="h">
        <path
          data-trace
          d="M153.607 75.8158C152.634 79.5128 153.694 83.2017 154.252 86.7222C155.504 94.6615 155.384 102.649 156.062 110.596C156.086 110.909 156.086 111.254 156.58 111.591"
        />
        <path
          data-trace
          data-inverse
          d="M177.393 94.2043C170.49 95.1827 163.459 94.3888 156.588 95.696"
        />
        <path
          data-trace
          d="M179.625 73.835C179.122 78.6306 179.728 83.4663 179.322 88.2379C178.533 97.5164 179.138 106.795 178.875 116.065"
        />
      </g>
      {/* Un « e » en trois traits, façon capitale : ⌐ puis − puis _ */}
      <g data-lettre="e">
        <path
          data-trace
          d="M217.026 70.8517C212.227 70.8918 207.468 70.0578 202.654 70.3465C198.238 70.6112 196.803 71.8863 196.731 76.321C196.596 85.2627 195.264 94.2044 196.197 103.154C196.596 106.987 196.03 103.587 197.337 110.315"
        />
        <path data-trace data-inverse d="M214.922 90.4032H191.845" />
        <path
          data-trace
          data-inverse
          d="M218.014 108.367C211.59 109 205.109 108.134 198.692 109.113"
        />
      </g>
    </svg>
  );
}
