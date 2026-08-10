// ==========================================
// MARKETRADING - SHARED SITE SCRIPT
// Loaded on every public-facing page.
// Every lookup is guarded so this file is
// safe to include on pages that don't have
// the mobile menu markup.
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const menuBtn =
        document.getElementById("menuBtn");

    const mobileMenu =
        document.getElementById("mobileMenu");

    const closeMenu =
        document.getElementById("closeMenu");


    if (menuBtn && mobileMenu) {

        menuBtn.addEventListener("click", () => {
            mobileMenu.style.left = "0";
        });
    }


    if (closeMenu && mobileMenu) {

        closeMenu.addEventListener("click", () => {
            mobileMenu.style.left = "-100%";
        });
    }


    // Close the menu if the user clicks outside it
    document.addEventListener("click", (e) => {

        if (!mobileMenu) {
            return;
        }

        const clickedInsideMenu =
            mobileMenu.contains(e.target);

        const clickedMenuBtn =
            menuBtn && menuBtn.contains(e.target);

        if (!clickedInsideMenu && !clickedMenuBtn) {
            mobileMenu.style.left = "-100%";
        }
    });
});
