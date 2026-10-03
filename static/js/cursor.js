/* Custom cursor — vanilla port of the homepage's useCustomCursor:
   crosshair follows the pointer directly, halo lerps at 0.15, crosshair
   scales 0.7 over interactive elements, disabled on touch devices. */
(function () {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    var cursor = document.createElement("div");
    cursor.className = "custom-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML =
        '<svg width="32" height="32" viewBox="0 0 32 32" fill="none">' +
        '<rect x="14" y="14" width="4" height="4" fill="#080808" />' +
        '<line x1="16" y1="0" x2="16" y2="12" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="16" y1="20" x2="16" y2="32" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="0" y1="16" x2="12" y2="16" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="20" y1="16" x2="32" y2="16" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="12" y1="0" x2="16" y2="0" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="16" y1="0" x2="20" y2="0" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="12" y1="32" x2="16" y2="32" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="16" y1="32" x2="20" y2="32" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="0" y1="12" x2="0" y2="16" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="0" y1="16" x2="0" y2="20" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="32" y1="12" x2="32" y2="16" stroke="#E5E5E5" stroke-width="1" />' +
        '<line x1="32" y1="16" x2="32" y2="20" stroke="#E5E5E5" stroke-width="1" />' +
        '<circle cx="16" cy="16" r="1.5" fill="#E5E5E5" />' +
        "</svg>";

    var glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");

    document.body.appendChild(cursor);
    document.body.appendChild(glow);

    var cursorX = 0, cursorY = 0, glowX = 0, glowY = 0;
    var visible = false, glowVisible = false;

    document.addEventListener("pointermove", function (e) {
        cursorX = e.clientX;
        cursorY = e.clientY;
        visible = true;
        if (!glowVisible) {
            glowX = cursorX;
            glowY = cursorY;
            glowVisible = true;
        }
    });

    document.addEventListener("pointerover", function (e) {
        var target = e.target && e.target.closest
            ? e.target.closest('a, button, input, select, textarea, label, [role="button"]')
            : null;
        cursor.classList.toggle("cursor--active", Boolean(target));
    });

    document.addEventListener("mouseleave", function () {
        visible = false;
        glowVisible = false;
    });

    document.addEventListener("mouseenter", function () {
        visible = true;
    });

    function animate() {
        glowX += (cursorX - glowX) * 0.15;
        glowY += (cursorY - glowY) * 0.15;

        cursor.style.transform = "translate(" + (cursorX - 16) + "px, " + (cursorY - 16) + "px)";
        cursor.style.opacity = visible ? "1" : "0";

        glow.style.transform = "translate(" + (glowX - 100) + "px, " + (glowY - 100) + "px)";
        glow.style.opacity = glowVisible ? "1" : "0";

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
})();
